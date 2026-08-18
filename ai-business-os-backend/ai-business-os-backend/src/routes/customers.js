const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth); // every route below requires login

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE is_deleted = FALSE ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/customers
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

    const result = await query(
      `INSERT INTO customers (name, phone, email, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, phone, email || null, address || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, phone, email, address, loyalty_points } = req.body;
    await query(
      `UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, loyalty_points=$5
       WHERE id=$6`,
      [name, phone, email || null, address || null, loyalty_points || 0, req.params.id]
    );
    res.json({ message: 'Customer updated' });
  } catch (err) { next(err); }
});

// DELETE /api/customers/:id — soft delete, admin/manager only
router.delete('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    await query('UPDATE customers SET is_deleted = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Customer deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
