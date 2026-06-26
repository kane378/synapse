require('dotenv').config();
const { query } = require('./config/db');
const b = require('bcryptjs');

b.hash('Admin@123', 12).then(async hash => {
  const result = await query(
    "UPDATE users SET password_hash = $1 WHERE email = 'admin@synapse.com' RETURNING email, role",
    [hash]
  );
  console.log('Updated:', result.rows[0]);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});