const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { chatWithAssistant, interpretVoiceCommand } = require('../services/aiService');

const router = express.Router();
router.use(requireAuth);

// Pulls a lightweight snapshot of live business data to give the AI real context.
// Kept small on purpose — don't dump the whole database into every AI call.
async function getBusinessContext() {
  const pool = await getPool();
  const [customers, products, todaySales, lowStock] = await Promise.all([
    pool.request().query('SELECT COUNT(*) AS count FROM customers WHERE is_deleted = 0'),
    pool.request().query('SELECT COUNT(*) AS count FROM products WHERE is_deleted = 0'),
    pool.request().query(`SELECT ISNULL(SUM(total_amount),0) AS revenue, COUNT(*) AS count
                           FROM sales WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)`),
    pool.request().query(`SELECT name, stock_qty FROM products
                           WHERE is_deleted = 0 AND stock_qty <= low_stock_threshold`)
  ]);

  return {
    totalCustomers: customers.recordset[0].count,
    totalProducts: products.recordset[0].count,
    todayRevenue: todaySales.recordset[0].revenue,
    todaySalesCount: todaySales.recordset[0].count,
    lowStockProducts: lowStock.recordset
  };
}

// POST /api/ai/chat  — Body: { message: "..." }
router.post('/chat', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const context = await getBusinessContext();
    const reply = await chatWithAssistant(message, context);
    res.json({ reply });
  } catch (err) { next(err); }
});

// POST /api/ai/voice-command — Body: { transcript: "add customer Rahul phone 9876543210" }
// Frontend does speech-to-text (Web Speech API) and sends the resulting text here.
router.post('/voice-command', async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    const parsed = await interpretVoiceCommand(transcript);

    // Execute simple, safe actions directly. Anything more sensitive (deletes, etc.)
    // should still require the normal UI confirmation — voice only handles reads/simple adds.
    if (parsed.action === 'add_customer' && parsed.name && parsed.phone) {
      const pool = await getPool();
      const result = await pool.request()
        .input('name', sql.NVarChar, parsed.name)
        .input('phone', sql.NVarChar, parsed.phone)
        .query(`INSERT INTO customers (name, phone) OUTPUT INSERTED.* VALUES (@name, @phone)`);
      return res.json({ action: parsed.action, result: result.recordset[0] });
    }

    // For search/analytics-type actions, just return the parsed intent —
    // the frontend decides how to navigate/display it.
    res.json(parsed);
  } catch (err) { next(err); }
});

module.exports = router;
