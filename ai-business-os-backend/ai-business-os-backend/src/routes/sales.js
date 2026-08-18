const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { pushNotification } = require('../sockets');
const { buildReceiptText } = require('../utils/receipt');
const { generateInvoiceSummary } = require('../services/aiService');

const router = express.Router();
router.use(requireAuth);

// GET /api/sales — list, most recent first
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT s.*, c.name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET /api/sales/:id — full detail incl. items + receipt text
router.get('/:id', async (req, res, next) => {
  try {
    const pool = await getPool();
    const saleResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM sales WHERE id = @id');
    const sale = saleResult.recordset[0];
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const itemsResult = await pool.request()
      .input('sale_id', sql.Int, req.params.id)
      .query(`SELECT si.*, p.name AS product_name
              FROM sale_items si JOIN products p ON si.product_id = p.id
              WHERE si.sale_id = @sale_id`);

    let customer = null;
    if (sale.customer_id) {
      const custResult = await pool.request()
        .input('id', sql.Int, sale.customer_id)
        .query('SELECT * FROM customers WHERE id = @id');
      customer = custResult.recordset[0];
    }

    const receiptText = buildReceiptText({ sale, items: itemsResult.recordset, customer });
    res.json({ sale, items: itemsResult.recordset, customer, receiptText });
  } catch (err) { next(err); }
});

// POST /api/sales — create a bill
// Body: { customer_id, items: [{ product_id, quantity }], discount_amount, payment_mode }
router.post('/', async (req, res, next) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { customer_id, items, discount_amount = 0, payment_mode = 'cash' } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    await transaction.begin();
    const request = new sql.Request(transaction);

    // Fetch current prices/stock for every product in the sale
    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const prodResult = await request
        .input(`pid_${item.product_id}`, sql.Int, item.product_id)
        .query(`SELECT * FROM products WHERE id = @pid_${item.product_id}`);
      const product = prodResult.recordset[0];
      if (!product) throw Object.assign(new Error(`Product ${item.product_id} not found`), { status: 400 });
      if (product.stock_qty < item.quantity) {
        throw Object.assign(new Error(`Not enough stock for ${product.name}`), { status: 400 });
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      lineItems.push({ ...item, unit_price: product.price, line_total: lineTotal, product });
    }

    const taxAmount = +(subtotal * 0.18).toFixed(2); // adjust GST rate as needed
    const totalAmount = +(subtotal + taxAmount - discount_amount).toFixed(2);

    // Insert the sale
    const saleInsert = await new sql.Request(transaction)
      .input('customer_id', sql.Int, customer_id || null)
      .input('subtotal', sql.Decimal(10, 2), subtotal)
      .input('tax_amount', sql.Decimal(10, 2), taxAmount)
      .input('discount_amount', sql.Decimal(10, 2), discount_amount)
      .input('total_amount', sql.Decimal(10, 2), totalAmount)
      .input('payment_mode', sql.NVarChar, payment_mode)
      .input('created_by', sql.Int, req.user.id)
      .query(`INSERT INTO sales (customer_id, subtotal, tax_amount, discount_amount, total_amount, payment_mode, created_by)
              OUTPUT INSERTED.*
              VALUES (@customer_id, @subtotal, @tax_amount, @discount_amount, @total_amount, @payment_mode, @created_by)`);
    const sale = saleInsert.recordset[0];

    // Insert line items + decrement stock
    for (const li of lineItems) {
      await new sql.Request(transaction)
        .input('sale_id', sql.Int, sale.id)
        .input('product_id', sql.Int, li.product_id)
        .input('quantity', sql.Int, li.quantity)
        .input('unit_price', sql.Decimal(10, 2), li.unit_price)
        .input('line_total', sql.Decimal(10, 2), li.line_total)
        .query(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
                VALUES (@sale_id, @product_id, @quantity, @unit_price, @line_total)`);

      const newStock = li.product.stock_qty - li.quantity;
      await new sql.Request(transaction)
        .input('id', sql.Int, li.product_id)
        .input('stock_qty', sql.Int, newStock)
        .query('UPDATE products SET stock_qty = @stock_qty WHERE id = @id');

      // Flag low stock for after commit
      li.newStock = newStock;
    }

    // Add loyalty points: 1 point per ₹100 spent
    if (customer_id) {
      const points = Math.floor(totalAmount / 100);
      await new sql.Request(transaction)
        .input('id', sql.Int, customer_id)
        .input('points', sql.Int, points)
        .query('UPDATE customers SET loyalty_points = loyalty_points + @points WHERE id = @id');
    }

    await transaction.commit();

    // --- Post-commit side effects (don't block the transaction on these) ---
    const io = req.app.get('io');
    pushNotification(io, { type: 'new_sale', message: `New sale #${sale.id} — ₹${totalAmount}` });

    for (const li of lineItems) {
      if (li.newStock <= li.product.low_stock_threshold) {
        pushNotification(io, { type: 'low_stock', message: `${li.product.name} is low on stock (${li.newStock} left)` });
      }
    }

    // AI invoice summary — non-blocking best-effort; sale still succeeds if AI call fails
    let aiSummary = null;
    try {
      aiSummary = await generateInvoiceSummary({ sale, items: lineItems.map(li => ({
        product: li.product.name, quantity: li.quantity, line_total: li.line_total
      })) });
      await pool.request()
        .input('id', sql.Int, sale.id)
        .input('summary', sql.NVarChar, aiSummary)
        .query('UPDATE sales SET ai_summary = @summary WHERE id = @id');
    } catch (aiErr) {
      console.error('AI invoice summary failed (non-fatal):', aiErr.message);
    }

    res.status(201).json({ sale: { ...sale, ai_summary: aiSummary }, items: lineItems });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
});

module.exports = router;
