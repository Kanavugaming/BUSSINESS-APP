const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications — most recent first
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT TOP 50 * FROM notifications ORDER BY created_at DESC');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE notifications SET is_read = 1 WHERE id = @id');
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
