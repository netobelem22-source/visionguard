const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'vgadmin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'visionguard_users',
  password: process.env.DB_PASS || 'VisionGuard@2026',
  port: 5432,
});
module.exports = pool;
