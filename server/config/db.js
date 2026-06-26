// FILE: server/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const pool = new Pool({
  // Use the single, unified connection string provided by Neon
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Slightly increased for cold-start tolerances on serverless edges
  
  // Neon requires SSL in production. rejectUnauthorized: false is needed for serverless environments.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle DB client', err);
  // Do not hard exit in a serverless function context as it tears down the runtime completely
  if (!isProduction) {
    process.exit(-1);
  }
});

// Parameterized query helper — always use this, never string concatenation
const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };