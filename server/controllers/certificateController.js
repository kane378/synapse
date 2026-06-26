// FILE: server/controllers/certificateController.js
const { query, getClient } = require('../config/db');

const generateCertNumber = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `SYN-${yy}${mm}-${rand}`;
};

// POST /api/certificates/generate
const generateCertificate = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { transfer_id, form10_number } = req.body;

    if (!transfer_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'transfer_id is required.' });
    }

    // Return existing certificate if already generated
    const existing = await client.query(
      `SELECT tc.*,
              t.approved_quantity, t.requested_quantity,
              i.drug_name, i.generic_name, i.manufacturer, i.batch_number,
              i.expiry_date, i.unit, i.unit_price,
              ph.name as providing_name, ph.address as providing_address,
              ph.city as providing_city, ph.state as providing_state,
              ph.license_number as providing_license,
              rh.name as requesting_name, rh.address as requesting_address,
              rh.city as requesting_city, rh.state as requesting_state,
              rh.license_number as requesting_license
       FROM transfer_certificates tc
       JOIN transfers t ON tc.transfer_id = t.id
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       WHERE tc.transfer_id = $1`,
      [transfer_id]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      const row = existing.rows[0];
      const qty = row.approved_quantity || row.requested_quantity;
      const unitPrice = parseFloat(row.unit_price) || 0;
      const subtotal = unitPrice * qty;
      return res.json({ success: true, data: { ...row, quantity: qty, subtotal: subtotal.toFixed(2) }, existing: true });
    }

    // Fetch full transfer details
    const transferResult = await client.query(
      `SELECT t.*,
              i.drug_name, i.generic_name, i.manufacturer, i.batch_number,
              i.expiry_date, i.unit, i.unit_price,
              ph.name as providing_name, ph.address as providing_address,
              ph.city as providing_city, ph.state as providing_state,
              ph.license_number as providing_license,
              rh.name as requesting_name, rh.address as requesting_address,
              rh.city as requesting_city, rh.state as requesting_state,
              rh.license_number as requesting_license
       FROM transfers t
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       WHERE t.id = $1`,
      [transfer_id]
    );

    if (transferResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Transfer not found.' });
    }

    const t = transferResult.rows[0];

    if (t.status !== 'Completed' && t.status !== 'Approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Certificate can only be generated for Approved or Completed transfers.' });
    }

    const qty = t.approved_quantity || t.requested_quantity;
    const unitPrice = parseFloat(t.unit_price) || 0;
    const subtotal = unitPrice * qty;
    const gstAmount = subtotal * 0.05;
    const totalValue = subtotal + gstAmount;
    const certNumber = generateCertNumber();

    const result = await client.query(
      `INSERT INTO transfer_certificates
        (transfer_id, certificate_number, gst_amount, total_value, form10_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [transfer_id, certNumber, gstAmount.toFixed(2), totalValue.toFixed(2), form10_number || null]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        // Flatten transfer data into certificate for easy frontend use
        drug_name: t.drug_name,
        generic_name: t.generic_name,
        manufacturer: t.manufacturer,
        batch_number: t.batch_number,
        expiry_date: t.expiry_date,
        unit: t.unit,
        unit_price: t.unit_price,
        providing_name: t.providing_name,
        providing_address: t.providing_address,
        providing_city: t.providing_city,
        providing_state: t.providing_state,
        providing_license: t.providing_license,
        requesting_name: t.requesting_name,
        requesting_address: t.requesting_address,
        requesting_city: t.requesting_city,
        requesting_state: t.requesting_state,
        requesting_license: t.requesting_license,
        quantity: qty,
        subtotal: subtotal.toFixed(2),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Generate certificate error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate certificate: ' + err.message });
  } finally {
    client.release();
  }
};

// GET /api/certificates/:transferId
const getCertificate = async (req, res) => {
  try {
    const { transferId } = req.params;

    const result = await query(
      `SELECT tc.*,
              t.approved_quantity, t.requested_quantity, t.status as transfer_status,
              i.drug_name, i.generic_name, i.manufacturer, i.batch_number,
              i.expiry_date, i.unit, i.unit_price,
              ph.name as providing_name, ph.address as providing_address,
              ph.city as providing_city, ph.state as providing_state,
              ph.license_number as providing_license,
              rh.name as requesting_name, rh.address as requesting_address,
              rh.city as requesting_city, rh.state as requesting_state,
              rh.license_number as requesting_license
       FROM transfer_certificates tc
       JOIN transfers t ON tc.transfer_id = t.id
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       WHERE tc.transfer_id = $1`,
      [transferId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    const row = result.rows[0];
    const qty = row.approved_quantity || row.requested_quantity;
    const unitPrice = parseFloat(row.unit_price) || 0;
    const subtotal = unitPrice * qty;

    res.json({
      success: true,
      data: { ...row, quantity: qty, subtotal: subtotal.toFixed(2) },
    });
  } catch (err) {
    console.error('Get certificate error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch certificate.' });
  }
};

module.exports = { generateCertificate, getCertificate };
