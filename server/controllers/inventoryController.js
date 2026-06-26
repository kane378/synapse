// FILE: server/controllers/inventoryController.js
const { query } = require('../config/db');

// GET /api/inventory — All hospitals see all inventory (needed for transfer requests)
const getInventory = async (req, res) => {
  try {
    const { expiring_soon, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let conditions = ['i.is_available = true'];

    // NOTE: HospitalAdmins can see ALL hospitals inventory
    // so they can request transfers from other hospitals.
    // Ownership is enforced at add/edit/delete level only.

    if (expiring_soon === 'true') {
      conditions.push(`i.expiry_date <= CURRENT_DATE + INTERVAL '30 days'`);
      conditions.push(`i.expiry_date >= CURRENT_DATE`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(i.drug_name ILIKE $${params.length} OR i.generic_name ILIKE $${params.length} OR i.batch_number ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit));
    params.push(offset);

    const result = await query(
      `SELECT i.*, h.name as hospital_name, h.city, h.state,
              (i.expiry_date - CURRENT_DATE) as days_to_expiry,
              CASE
                WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
                WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
                ELSE 'normal'
              END as urgency_level
       FROM inventory i
       JOIN hospitals h ON i.hospital_id = h.id
       ${whereClause}
       ORDER BY i.expiry_date ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM inventory i ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory.' });
  }
};

// GET /api/inventory/waste-alerts — Items expiring within 30 days
const getWasteAlerts = async (req, res) => {
  try {
    const params = [];
    let hospitalFilter = '';

    if (req.user.role === 'HospitalAdmin') {
      params.push(req.user.hospital_id);
      hospitalFilter = `AND i.hospital_id = $${params.length}`;
    }

    const result = await query(
      `SELECT i.*, h.name as hospital_name, h.city, h.state,
              (i.expiry_date - CURRENT_DATE) as days_to_expiry,
              CASE
                WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
                WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
                ELSE 'warning'
              END as urgency_level
       FROM inventory i
       JOIN hospitals h ON i.hospital_id = h.id
       WHERE i.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
         AND i.expiry_date >= CURRENT_DATE
         AND i.is_available = true
         AND i.quantity > 0
         ${hospitalFilter}
       ORDER BY i.expiry_date ASC`,
      params
    );

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Waste alerts error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch waste alerts.' });
  }
};

// POST /api/inventory — Add new inventory item
const addInventory = async (req, res) => {
  try {
    const {
      drug_name, generic_name, manufacturer, batch_number,
      quantity, unit, unit_price, expiry_date, storage_conditions
    } = req.body;

    if (!drug_name || !batch_number || !quantity || !expiry_date) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    const hospitalId = req.user.role === 'HospitalAdmin' ? req.user.hospital_id : req.body.hospital_id;

    if (!hospitalId) {
      return res.status(400).json({ success: false, error: 'Hospital ID required.' });
    }

    const result = await query(
      `INSERT INTO inventory
        (hospital_id, drug_name, generic_name, manufacturer, batch_number, quantity, unit, unit_price, expiry_date, storage_conditions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [hospitalId, drug_name, generic_name, manufacturer, batch_number, quantity, unit || 'vials', unit_price, expiry_date, storage_conditions]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Add inventory error:', err);
    res.status(500).json({ success: false, error: 'Failed to add inventory.' });
  }
};

// PUT /api/inventory/:id — Update inventory item
const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unit_price, storage_conditions, is_available } = req.body;

    const ownership = await query('SELECT hospital_id FROM inventory WHERE id = $1', [id]);

    if (ownership.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found.' });
    }

    if (req.user.role === 'HospitalAdmin' && ownership.rows[0].hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ success: false, error: 'Access forbidden.' });
    }

    const result = await query(
      `UPDATE inventory
       SET quantity = COALESCE($1, quantity),
           unit_price = COALESCE($2, unit_price),
           storage_conditions = COALESCE($3, storage_conditions),
           is_available = COALESCE($4, is_available),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [quantity, unit_price, storage_conditions, is_available, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update inventory error:', err);
    res.status(500).json({ success: false, error: 'Failed to update inventory.' });
  }
};

// DELETE /api/inventory/:id
const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const ownership = await query('SELECT hospital_id FROM inventory WHERE id = $1', [id]);
    if (ownership.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found.' });
    }

    if (req.user.role === 'HospitalAdmin' && ownership.rows[0].hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ success: false, error: 'Access forbidden.' });
    }

    await query('UPDATE inventory SET is_available = false, updated_at = NOW() WHERE id = $1', [id]);
    res.json({ success: true, message: 'Inventory item removed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete inventory.' });
  }
};

module.exports = { getInventory, getWasteAlerts, addInventory, updateInventory, deleteInventory };
