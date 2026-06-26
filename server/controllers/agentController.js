// FILE: server/controllers/agentController.js
const { query, getClient } = require('../config/db');
const bcrypt = require('bcryptjs');

// POST /api/agents/register — Public registration
const registerAgent = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { fullName, phone, email, password, vehicleType, serviceCity, serviceState } = req.body;

    if (!fullName || !phone || !email || !password || !vehicleType || !serviceCity || !serviceState) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    // Check duplicate
    const dup = await client.query('SELECT id FROM delivery_agents WHERE email = $1', [email.toLowerCase()]);
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Agent with this email already exists.' });
    }

    // Check duplicate user email
    const dupUser = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (dupUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with DeliveryAgent role
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'DeliveryAgent') RETURNING id`,
      [email.toLowerCase(), passwordHash, fullName]
    );

    // Create agent profile
    await client.query(
      `INSERT INTO delivery_agents (user_id, full_name, phone, email, vehicle_type, service_city, service_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userResult.rows[0].id, fullName, phone, email.toLowerCase(), vehicleType, serviceCity, serviceState]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Registration successful! Awaiting SuperAdmin verification.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Agent register error:', err);
    res.status(500).json({ success: false, error: 'Registration failed.' });
  } finally {
    client.release();
  }
};

// GET /api/agents — Get agents (SuperAdmin sees all, HospitalAdmin sees verified by city)
const getAgents = async (req, res) => {
  try {
    const { city, state, verified } = req.query;
    const params = [];
    const conditions = [];

    if (req.user.role !== 'SuperAdmin') {
      conditions.push('da.is_verified = true');
      conditions.push('da.is_available = true');
    }

    if (verified === 'true') conditions.push('da.is_verified = true');
    if (verified === 'false') conditions.push('da.is_verified = false');

    if (city) {
      params.push(`%${city}%`);
      conditions.push(`da.service_city ILIKE $${params.length}`);
    }

    if (state) {
      params.push(`%${state}%`);
      conditions.push(`da.service_state ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT da.*, u.email as user_email, u.is_active
       FROM delivery_agents da
       JOIN users u ON da.user_id = u.id
       ${whereClause}
       ORDER BY da.is_verified DESC, da.rating DESC, da.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get agents error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch agents.' });
  }
};

// PATCH /api/agents/:id/verify — SuperAdmin verifies agent
const verifyAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE delivery_agents
       SET is_verified = true, verified_by = $1, verification_date = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found.' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Agent verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to verify agent.' });
  }
};

// PATCH /api/agents/:id/availability — Agent toggles availability
const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE delivery_agents
       SET is_available = NOT is_available, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update availability.' });
  }
};

// GET /api/agents/my-deliveries — Agent sees their assigned deliveries
const getMyDeliveries = async (req, res) => {
  try {
    // Find agent profile for this user
    const agentResult = await query(
      'SELECT id FROM delivery_agents WHERE user_id = $1',
      [req.user.id]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Agent profile not found.' });
    }

    const agentId = agentResult.rows[0].id;

    const result = await query(
      `SELECT d.*, t.status as transfer_status,
              i.drug_name, i.unit,
              t.approved_quantity, t.requested_quantity,
              ph.name as providing_name, ph.address as providing_address, ph.city as providing_city,
              rh.name as requesting_name, rh.address as requesting_address, rh.city as requesting_city
       FROM deliveries d
       JOIN transfers t ON d.transfer_id = t.id
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       WHERE d.agent_id = $1
       ORDER BY d.created_at DESC`,
      [agentId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch deliveries.' });
  }
};

module.exports = { registerAgent, getAgents, verifyAgent, toggleAvailability, getMyDeliveries };
