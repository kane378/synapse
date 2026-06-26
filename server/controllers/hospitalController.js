// FILE: server/controllers/hospitalController.js
const { query } = require('../config/db');

// GET /api/hospitals — SuperAdmin sees all; HospitalAdmin sees verified only
const getHospitals = async (req, res) => {
  try {
    let sql, params = [];

    if (req.user.role === 'SuperAdmin') {
      sql = `SELECT h.*, COUNT(u.id) as admin_count
             FROM hospitals h LEFT JOIN users u ON h.id = u.hospital_id
             GROUP BY h.id ORDER BY h.created_at DESC`;
    } else {
      sql = `SELECT id, name, city, state, contact_email, contact_phone
             FROM hospitals WHERE is_verified = true ORDER BY name`;
    }

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch hospitals.' });
  }
};

// PATCH /api/hospitals/:id/verify — SuperAdmin verifies a hospital
const verifyHospital = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE hospitals
       SET is_verified = true, verification_date = NOW(), verified_by = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hospital not found.' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Hospital verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to verify hospital.' });
  }
};

// GET /api/hospitals/stats — Dashboard summary stats
const getDashboardStats = async (req, res) => {
  try {
    const params = [];
    let hospitalFilter = '';

    if (req.user.role === 'HospitalAdmin') {
      params.push(req.user.hospital_id);
      hospitalFilter = `WHERE i.hospital_id = $${params.length}`;
    }

    const [inventoryStats, transferStats, wasteAlerts, hospitalCount] = await Promise.all([
      query(
        `SELECT
           COUNT(*) as total_items,
           SUM(quantity) as total_units,
           COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date >= CURRENT_DATE) as expiring_soon,
           COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND expiry_date >= CURRENT_DATE) as critical_expiry
         FROM inventory i ${hospitalFilter}
         ${hospitalFilter ? 'AND' : 'WHERE'} is_available = true`,
        params
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'Pending') as pending,
           COUNT(*) FILTER (WHERE status = 'Approved') as approved,
           COUNT(*) FILTER (WHERE status = 'Completed') as completed,
           COUNT(*) as total
         FROM transfers t
         ${req.user.role === 'HospitalAdmin'
           ? `WHERE (requesting_hospital_id = $1 OR providing_hospital_id = $1)`
           : ''
         }`,
        req.user.role === 'HospitalAdmin' ? [req.user.hospital_id] : []
      ),
      query(
        `SELECT COUNT(*) as count FROM inventory i ${hospitalFilter}
         ${hospitalFilter ? 'AND' : 'WHERE'} expiry_date <= CURRENT_DATE + INTERVAL '30 days'
         AND expiry_date >= CURRENT_DATE AND is_available = true`,
        params
      ),
      req.user.role === 'SuperAdmin'
        ? query(`SELECT COUNT(*) FILTER (WHERE is_verified) as verified, COUNT(*) as total FROM hospitals`)
        : Promise.resolve({ rows: [{}] }),
    ]);

    res.json({
      success: true,
      data: {
        inventory: inventoryStats.rows[0],
        transfers: transferStats.rows[0],
        wasteAlerts: wasteAlerts.rows[0].count,
        hospitals: hospitalCount.rows[0],
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats.' });
  }
};

module.exports = { getHospitals, verifyHospital, getDashboardStats };
