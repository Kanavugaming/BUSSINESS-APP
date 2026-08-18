const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// POST /api/auth/register
// Only an admin can create new users with a specific role.
// The very first user (when the users table is empty) is allowed to
// register freely as 'admin' — that's how you bootstrap the system.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const existingUsersResult = await query('SELECT COUNT(*) AS count FROM users');
    const isFirstUser = parseInt(existingUsersResult.rows[0].count) === 0;

    // If this isn't the first user, only an authenticated admin may create accounts.
    if (!isFirstUser) {
      const header = req.headers.authorization;
      if (!header) return res.status(401).json({ error: 'Only an admin can register new users' });
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Only an admin can register new users' });
      }
    }

    const finalRole = isFirstUser ? 'admin' : (role || 'staff');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, finalRole]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — confirms the token is valid and returns the current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
