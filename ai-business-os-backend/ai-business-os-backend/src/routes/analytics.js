const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { predictSales } = require('../services/aiService');

const router = express.Router();
router.use(requireAuth);

// GET /api/analytics/summary — quick dashboard numbers
router.get('/summary', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM customers WHERE is_deleted = 0) AS total_customers,
        (SELECT COUNT(*) FROM products WHERE is_deleted = 0) AS total_products,
        (SELECT COUNT(*) FROM products WHERE is_deleted = 0 AND stock_qty <= low_stock_threshold) AS low_stock_count,
        (SELECT ISNULL(SUM(total_amount), 0) FROM sales WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)) AS today_revenue,
        (SELECT COUNT(*) FROM sales WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)) AS today_sales_count,
        (SELECT ISNULL(SUM(total_amount), 0) FROM sales WHERE created_at >= DATEADD(DAY, -30, GETDATE())) AS last_30_days_revenue
    `);
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

// GET /api/analytics/daily?days=14 — daily revenue for charting
router.get('/daily', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const pool = await getPool();
    const result = await pool.request()
      .input('days', sql.Int, days)
      .query(`
        SELECT CAST(created_at AS DATE) AS day, SUM(total_amount) AS revenue, COUNT(*) AS sales_count
        FROM sales
        WHERE created_at >= DATEADD(DAY, -@days, GETDATE())
        GROUP BY CAST(created_at AS DATE)
        ORDER BY day ASC
      `);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET /api/analytics/top-products?limit=5
router.get('/top-products', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const pool = await getPool();
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) p.name, SUM(si.quantity) AS units_sold, SUM(si.line_total) AS revenue
        FROM sale_items si JOIN products p ON si.product_id = p.id
        GROUP BY p.name
        ORDER BY revenue DESC
      `);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET /api/analytics/predict — AI-powered next-period sales forecast
router.get('/predict', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT CAST(created_at AS DATE) AS day, SUM(total_amount) AS revenue
      FROM sales
      WHERE created_at >= DATEADD(DAY, -30, GETDATE())
      GROUP BY CAST(created_at AS DATE)
      ORDER BY day ASC
    `);

    if (result.recordset.length < 3) {
      return res.json({
        predictedTotal: null,
        trend: 'unknown',
        explanation: 'Not enough sales history yet — need at least a few days of data.'
      });
    }

    const prediction = await predictSales(result.recordset);
    res.json(prediction);
  } catch (err) { next(err); }
});

module.exports = router;
