const express = require('express');
const { pool, query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { pushNotification } = require('../sockets');
const { buildReceiptText } = require('../utils/receipt');
const { generateInvoiceSummary } = require('../services/aiService');

const router = express.Router();
router.use(requireAuth);

// GET /api/sales — list, most recent first
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.*, c.name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/sales/:id — full detail incl. items + receipt text
router.get('/:id', async (req, res, next) => {
  try {
    const saleResult = await query('SELECT * FROM sales WHERE id = $1', [req.params.id]);
    const sale = saleResult.rows[0];
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const itemsResult = await query(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [req.params.id]
    );

    let customer = null;
    if (sale.customer_id) {
      const custResult = await query('SELECT * FROM customers WHERE id = $1', [sale.customer_id]);
      customer = custResult.rows[0];
    }

    const receiptText = buildReceiptText({ sale, items: itemsResult.rows, customer });
    res.json({ sale, items: itemsResult.rows, customer, receiptText });
  } catch (err) { next(err); }
});

// POST /api/sales — create a bill
// Body: { customer_id, items: [{ product_id, quantity }], discount_amount, payment_mode }
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { customer_id, items, discount_amount = 0, payment_mode = 'cash' } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    await client.query('BEGIN');

    // Fetch current prices/stock for every product in the sale
    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const prodResult = await client.query(
        'SELECT * FROM products WHERE id = $1',
        [item.product_id]
      );
      const product = prodResult.rows[0];
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
    const saleInsert = await client.query(
      `INSERT INTO sales (customer_id, subtotal, tax_amount, discount_amount, total_amount, payment_mode, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [customer_id || null, subtotal, taxAmount, discount_amount, totalAmount, payment_mode, req.user.id]
    );
    const sale = saleInsert.rows[0];

    // Insert line items + decrement stock
    for (const li of lineItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, li.product_id, li.quantity, li.unit_price, li.line_total]
      );

      const newStock = li.product.stock_qty - li.quantity;
      await client.query(
        'UPDATE products SET stock_qty = $1 WHERE id = $2',
        [newStock, li.product_id]
      );

      // Flag low stock for after commit
      li.newStock = newStock;
    }

    // Add loyalty points: 1 point per ₹100 spent
    if (customer_id) {
      const points = Math.floor(totalAmount / 100);
      await client.query(
        'UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE id = $2',
        [points, customer_id]
      );
    }

    await client.query('COMMIT');

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
      await query(
        'UPDATE sales SET ai_summary = $1 WHERE id = $2',
        [aiSummary, sale.id]
      );
    } catch (aiErr) {
      console.error('AI invoice summary failed (non-fatal):', aiErr.message);
    }

    res.status(201).json({ sale: { ...sale, ai_summary: aiSummary }, items: lineItems });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr.message);
    }
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
