const { Pool } = require('pg');
require('dotenv').config();

// A "pool" is a set of reusable DB connections.
// Opening a new connection per request is slow — the pool keeps a few
// open and hands them out/reclaims them as requests come and go.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Neon and most hosted Postgres
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ DB pool error:', err.message);
});

// Convenience wrapper so route files can do: await query(text, params)
async function query(text, params) {
  return pool.query(text, params);
}

// getPool() kept for backwards-compatibility — routes that used `await getPool()`
// now just get the pool directly (pg Pool is already initialised, no connect needed).
function getPool() {
  return pool;
}

module.exports = { pool, query, getPool };
