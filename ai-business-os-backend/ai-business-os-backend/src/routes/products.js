const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { pushNotification } = require('../sockets');

const router = express.Router();
router.use(requireAuth);

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM products WHERE is_deleted = 0 ORDER BY created_at DESC');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, sku, category, price, stock_qty, low_stock_threshold } = req.body;
    if (!name || price == null) return res.status(400).json({ error: 'name and price are required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('sku', sql.NVarChar, sku || null)
      .input('category', sql.NVarChar, category || null)
      .input('price', sql.Decimal(10, 2), price)
      .input('stock_qty', sql.Int, stock_qty || 0)
      .input('low_stock_threshold', sql.Int, low_stock_threshold || 5)
      .query(`INSERT INTO products (name, sku, category, price, stock_qty, low_stock_threshold)
              OUTPUT INSERTED.*
              VALUES (@name, @sku, @category, @price, @stock_qty, @low_stock_threshold)`);

    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

// PUT /api/products/:id  — also used for stock adjustments
router.put('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, sku, category, price, stock_qty, low_stock_threshold } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar, name)
      .input('sku', sql.NVarChar, sku || null)
      .input('category', sql.NVarChar, category || null)
      .input('price', sql.Decimal(10, 2), price)
      .input('stock_qty', sql.Int, stock_qty)
      .input('low_stock_threshold', sql.Int, low_stock_threshold || 5)
      .query(`UPDATE products SET name=@name, sku=@sku, category=@category, price=@price,
              stock_qty=@stock_qty, low_stock_threshold=@low_stock_threshold WHERE id=@id`);

    // Check if this update pushed stock below threshold — fire a real-time alert.
    if (stock_qty != null && stock_qty <= (low_stock_threshold || 5)) {
      pushNotification(req.app.get('io'), {
        type: 'low_stock',
        message: `${name} is low on stock (${stock_qty} left)`
      });
    }

    res.json({ message: 'Product updated' });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id
router.delete('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE products SET is_deleted = 1 WHERE id = @id');
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
