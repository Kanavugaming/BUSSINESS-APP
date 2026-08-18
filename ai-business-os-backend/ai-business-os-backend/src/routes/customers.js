const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth); // every route below requires login

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM customers WHERE is_deleted = 0 ORDER BY created_at DESC');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// POST /api/customers
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email || null)
      .input('address', sql.NVarChar, address || null)
      .query(`INSERT INTO customers (name, phone, email, address)
              OUTPUT INSERTED.*
              VALUES (@name, @phone, @email, @address)`);

    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, phone, email, address, loyalty_points } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar, name)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email || null)
      .input('address', sql.NVarChar, address || null)
      .input('loyalty_points', sql.Int, loyalty_points || 0)
      .query(`UPDATE customers SET name=@name, phone=@phone, email=@email,
              address=@address, loyalty_points=@loyalty_points WHERE id=@id`);
    res.json({ message: 'Customer updated' });
  } catch (err) { next(err); }
});

// DELETE /api/customers/:id — soft delete, admin/manager only
router.delete('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE customers SET is_deleted = 1 WHERE id = @id');
    res.json({ message: 'Customer deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
