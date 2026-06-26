// FILE: server/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const generateToken = (userId, role, hospitalId) => {
  return jwt.sign(
    { userId, role, hospitalId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h', algorithm: 'HS256' }
  );
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.hospital_id, u.is_active,
              h.name as hospital_name, h.is_verified as hospital_verified
       FROM users u
       LEFT JOIN hospitals h ON u.hospital_id = h.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      await bcrypt.compare(password, '$2a$12$invalidhashtopreventtimingattack00000000000000000000000');
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account is deactivated. Contact support.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    // HospitalAdmins require verified hospital
    if (user.role === 'HospitalAdmin' && !user.hospital_verified) {
      return res.status(403).json({
        success: false,
        error: 'Your hospital is pending verification by a SuperAdmin.',
      });
    }

    // DeliveryAgents require verification
    if (user.role === 'DeliveryAgent') {
      const agentResult = await query(
        'SELECT is_verified FROM delivery_agents WHERE user_id = $1',
        [user.id]
      );
      if (agentResult.rows.length > 0 && !agentResult.rows[0].is_verified) {
        return res.status(403).json({
          success: false,
          error: 'Your agent profile is pending verification by a SuperAdmin.',
        });
      }
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user.id, user.role, user.hospital_id);

    // Get agent profile if DeliveryAgent
    let agentProfile = null;
    if (user.role === 'DeliveryAgent') {
      const agentResult = await query(
        'SELECT * FROM delivery_agents WHERE user_id = $1',
        [user.id]
      );
      agentProfile = agentResult.rows[0] || null;
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        hospitalId: user.hospital_id,
        hospitalName: user.hospital_name,
        agentProfile,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// POST /api/auth/register-hospital
const registerHospital = async (req, res) => {
  const client = await require('../config/db').getClient();
  try {
    await client.query('BEGIN');

    const { hospitalName, licenseNumber, address, city, state, contactEmail, contactPhone, adminEmail, adminPassword, adminFullName } = req.body;

    if (!hospitalName || !licenseNumber || !adminEmail || !adminPassword || !adminFullName) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const dupCheck = await client.query(
      'SELECT id FROM hospitals WHERE license_number = $1 OR contact_email = $2',
      [licenseNumber, contactEmail]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Hospital with this license or email already exists.' });
    }

    const hospitalResult = await client.query(
      `INSERT INTO hospitals (name, license_number, address, city, state, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [hospitalName, licenseNumber, address, city, state, contactEmail, contactPhone]
    );
    const hospitalId = hospitalResult.rows[0].id;

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await client.query(
      `INSERT INTO users (hospital_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'HospitalAdmin')`,
      [hospitalId, adminEmail.toLowerCase().trim(), passwordHash, adminFullName]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Hospital registered successfully. Awaiting SuperAdmin verification.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Registration failed.' });
  } finally {
    client.release();
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.hospital_id, u.last_login,
              h.name as hospital_name, h.is_verified, h.city, h.state
       FROM users u LEFT JOIN hospitals h ON u.hospital_id = h.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user.' });
  }
};

module.exports = { login, registerHospital, getMe };
