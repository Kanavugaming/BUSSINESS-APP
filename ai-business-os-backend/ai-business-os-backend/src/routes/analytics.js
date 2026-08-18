const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { predictSales } = require('../services/aiService');

const router = express.Router();
router.use(requireAuth);

// GET /api/analytics/summary — quick dashboard numbers
router.get('/summary', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM customers WHERE is_deleted = FALSE) AS total_customers,
        (SELECT COUNT(*) FROM products WHERE is_deleted = FALSE) AS total_products,
        (SELECT COUNT(*) FROM products WHERE is_deleted = FALSE AND stock_qty <= low_stock_threshold) AS low_stock_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_at::DATE = CURRENT_DATE) AS today_revenue,
        (SELECT COUNT(*) FROM sales WHERE created_at::DATE = CURRENT_DATE) AS today_sales_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_at >= NOW() - INTERVAL '30 days') AS last_30_days_revenue
    `);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/analytics/daily?days=14 — daily revenue for charting
router.get('/daily', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const result = await query(`
      SELECT created_at::DATE AS day, SUM(total_amount) AS revenue, COUNT(*) AS sales_count
      FROM sales
      WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      GROUP BY created_at::DATE
      ORDER BY day ASC
    `, [days]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/analytics/top-products?limit=5
router.get('/top-products', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const result = await query(`
      SELECT p.name, SUM(si.quantity) AS units_sold, SUM(si.line_total) AS revenue
      FROM sale_items si JOIN products p ON si.product_id = p.id
      GROUP BY p.name
      ORDER BY revenue DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/analytics/predict — AI-powered next-period sales forecast
router.get('/predict', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT created_at::DATE AS day, SUM(total_amount) AS revenue
      FROM sales
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY created_at::DATE
      ORDER BY day ASC
    `);

    if (result.rows.length < 3) {
      return res.json({
        predictedTotal: null,
        trend: 'unknown',
        explanation: 'Not enough sales history yet — need at least a few days of data.'
      });
    }

    const prediction = await predictSales(result.rows);
    res.json(prediction);
  } catch (err) { next(err); }
});

module.exports = router;
