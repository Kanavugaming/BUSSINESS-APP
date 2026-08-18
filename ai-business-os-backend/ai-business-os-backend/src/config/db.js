const sql = require('mssql');
require('dotenv').config();

// A "pool" is a set of reusable DB connections.
// Opening a new connection per request is slow — the pool keeps a few
// open and hands them out/reclaims them as requests come and go.
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,               // true if using Azure SQL
    trustServerCertificate: true  // needed for local dev SQL Server
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;

// We export a function that always returns the SAME pool (singleton pattern).
// This avoids accidentally opening dozens of connections across the app.
function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config)
      .then(pool => {
        console.log('✅ Connected to SQL Server');
        return pool;
      })
      .catch(err => {
        console.error('❌ DB connection failed:', err.message);
        poolPromise = null; // allow retry on next call
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
