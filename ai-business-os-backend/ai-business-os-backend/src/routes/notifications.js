const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications — most recent first
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
