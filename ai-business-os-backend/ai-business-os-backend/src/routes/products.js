const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { pushNotification } = require('../sockets');

const router = express.Router();
router.use(requireAuth);

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM products WHERE is_deleted = FALSE ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, sku, category, price, stock_qty, low_stock_threshold } = req.body;
    if (!name || price == null) return res.status(400).json({ error: 'name and price are required' });

    const result = await query(
      `INSERT INTO products (name, sku, category, price, stock_qty, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, sku || null, category || null, price, stock_qty || 0, low_stock_threshold || 5]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/products/:id  — also used for stock adjustments
router.put('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, sku, category, price, stock_qty, low_stock_threshold } = req.body;

    await query(
      `UPDATE products SET name=$1, sku=$2, category=$3, price=$4,
       stock_qty=$5, low_stock_threshold=$6 WHERE id=$7`,
      [name, sku || null, category || null, price, stock_qty, low_stock_threshold || 5, req.params.id]
    );

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
    await query('UPDATE products SET is_deleted = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
