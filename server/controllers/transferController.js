// FILE: server/controllers/transferController.js
const { query, getClient } = require('../config/db');
const nodemailer = require('nodemailer');

// ─── Email helper ─────────────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`📧 Email skipped (not configured) — would send to: ${to} | Subject: ${subject}`);
      return;
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"Synapse Health 🧬" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error('Email error (non-fatal):', err.message);
  }
};

const emailRequestHTML = (drugName, qty, unit, reqHospital, frontendUrl) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#070b14;color:#e2e8f0;padding:32px;border-radius:12px;">
  <h1 style="color:#00d4ff;letter-spacing:4px;text-align:center;">SYNAPSE</h1>
  <div style="background:#0d1526;border:1px solid #1e3a5f;border-radius:8px;padding:24px;margin:16px 0;">
    <h2 style="color:#ffd32a;margin-top:0;">⚡ New Transfer Request</h2>
    <p style="color:#64748b;">A hospital has requested medicines from your inventory.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">Drug Name</td><td style="color:#e2e8f0;font-weight:bold;">${drugName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Quantity</td><td style="color:#00d4ff;font-weight:bold;">${qty} ${unit}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Requested By</td><td style="color:#e2e8f0;">${reqHospital}</td></tr>
    </table>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="${frontendUrl}/transfers" style="background:#00d4ff;color:#070b14;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Review Request →</a>
  </div>
  <p style="color:#64748b;font-size:11px;text-align:center;">Login to Synapse to approve or reject this transfer.</p>
</div>`;

const emailApprovedHTML = (drugName, qty, unit, provHospital, frontendUrl) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#070b14;color:#e2e8f0;padding:32px;border-radius:12px;">
  <h1 style="color:#00d4ff;letter-spacing:4px;text-align:center;">SYNAPSE</h1>
  <div style="background:#0d1526;border:1px solid #00ff9d33;border-radius:8px;padding:24px;margin:16px 0;">
    <h2 style="color:#00ff9d;margin-top:0;">✅ Transfer Approved!</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">Drug</td><td style="color:#e2e8f0;font-weight:bold;">${drugName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Approved Qty</td><td style="color:#00ff9d;font-weight:bold;">${qty} ${unit}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">From</td><td style="color:#e2e8f0;">${provHospital}</td></tr>
    </table>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="${frontendUrl}/transfers" style="background:#00ff9d;color:#070b14;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Track Delivery →</a>
  </div>
</div>`;

const emailRejectedHTML = (drugName, provHospital, reason, frontendUrl) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#070b14;color:#e2e8f0;padding:32px;border-radius:12px;">
  <h1 style="color:#00d4ff;letter-spacing:4px;text-align:center;">SYNAPSE</h1>
  <div style="background:#0d1526;border:1px solid #ff475733;border-radius:8px;padding:24px;margin:16px 0;">
    <h2 style="color:#ff4757;margin-top:0;">❌ Transfer Declined</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">Drug</td><td style="color:#e2e8f0;">${drugName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">From Hospital</td><td style="color:#e2e8f0;">${provHospital}</td></tr>
      ${reason ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Reason</td><td style="color:#e2e8f0;font-style:italic;">"${reason}"</td></tr>` : ''}
    </table>
  </div>
  <p style="color:#64748b;font-size:12px;text-align:center;">You can search for other hospitals on Synapse.</p>
</div>`;

// ─── GET /api/transfers ───────────────────────────────────────────────────────
const getTransfers = async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let statusFilter = '';
    let hospitalFilter = '';

    if (status) {
      params.push(status);
      statusFilter = `AND t.status = $${params.length}`;
    }

    if (req.user.role === 'HospitalAdmin') {
      params.push(req.user.hospital_id);
      hospitalFilter = `AND (t.requesting_hospital_id = $${params.length} OR t.providing_hospital_id = $${params.length})`;
    }

    const result = await query(
      `SELECT t.*,
              i.drug_name, i.batch_number, i.expiry_date, i.unit,
              rh.name as requesting_hospital_name,
              ph.name as providing_hospital_name,
              rh.contact_email as requesting_hospital_email,
              ph.contact_email as providing_hospital_email,
              u.full_name as requested_by_name,
              au.full_name as approved_by_name
       FROM transfers t
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       JOIN users u ON t.requested_by = u.id
       LEFT JOIN users au ON t.approved_by = au.id
       WHERE 1=1 ${statusFilter} ${hospitalFilter}
       ORDER BY t.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get transfers error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch transfers.' });
  }
};

// ─── POST /api/transfers ──────────────────────────────────────────────────────
const requestTransfer = async (req, res) => {
  try {
    const { inventory_id, requested_quantity, request_note } = req.body;

    if (!inventory_id || !requested_quantity) {
      return res.status(400).json({ success: false, error: 'inventory_id and requested_quantity are required.' });
    }

    const invResult = await query(
      `SELECT i.*, h.contact_email as hospital_email, h.name as hospital_name
       FROM inventory i JOIN hospitals h ON i.hospital_id = h.id
       WHERE i.id = $1 AND i.is_available = true`,
      [inventory_id]
    );

    if (invResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found or unavailable.' });
    }

    const item = invResult.rows[0];

    if (item.hospital_id === req.user.hospital_id) {
      return res.status(400).json({ success: false, error: 'Cannot request transfer from your own hospital.' });
    }

    if (requested_quantity > item.quantity) {
      return res.status(400).json({ success: false, error: `Requested quantity exceeds available stock (${item.quantity} ${item.unit}).` });
    }

    const dupCheck = await query(
      `SELECT id FROM transfers WHERE inventory_id = $1 AND requesting_hospital_id = $2 AND status = 'Pending'`,
      [inventory_id, req.user.hospital_id]
    );

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'A pending request already exists for this item.' });
    }

    const result = await query(
      `INSERT INTO transfers
        (inventory_id, requesting_hospital_id, providing_hospital_id, requested_quantity, request_note, requested_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [inventory_id, req.user.hospital_id, item.hospital_id, requested_quantity, request_note, req.user.id]
    );

    const reqHospitalResult = await query('SELECT name FROM hospitals WHERE id = $1', [req.user.hospital_id]);
    const reqHospitalName = reqHospitalResult.rows[0]?.name || 'Unknown Hospital';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // In-app notification for providing hospital
    await query(
      `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id)
       VALUES ($1, 'transfer_requested', $2, $3, $4)`,
      [
        item.hospital_id,
        `New Transfer Request: ${item.drug_name}`,
        `${reqHospitalName} requested ${requested_quantity} ${item.unit} of ${item.drug_name}.`,
        result.rows[0].id,
      ]
    );

    // Email to providing hospital
    await sendEmail(
      item.hospital_email,
      `🚨 Synapse: New Transfer Request — ${item.drug_name}`,
      emailRequestHTML(item.drug_name, requested_quantity, item.unit, reqHospitalName, frontendUrl)
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Request transfer error:', err);
    res.status(500).json({ success: false, error: 'Failed to create transfer request.' });
  }
};

// ─── PATCH /api/transfers/:id/respond ────────────────────────────────────────
const respondToTransfer = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { action, approved_quantity, response_note } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be "approve" or "reject".' });
    }

    const transferResult = await client.query(
      `SELECT t.*,
              i.drug_name, i.unit,
              rh.contact_email as requesting_email, rh.name as requesting_name,
              ph.name as providing_name
       FROM transfers t
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       WHERE t.id = $1`,
      [id]
    );

    if (transferResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Transfer not found.' });
    }

    const transfer = transferResult.rows[0];

    if (transfer.status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Transfer is no longer pending.' });
    }

    if (req.user.role === 'HospitalAdmin' && transfer.providing_hospital_id !== req.user.hospital_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Only the providing hospital can respond.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (action === 'approve') {
      const finalQty = approved_quantity || transfer.requested_quantity;

      const invCheck = await client.query(
        'SELECT quantity FROM inventory WHERE id = $1 FOR UPDATE',
        [transfer.inventory_id]
      );

      if (invCheck.rows[0].quantity < finalQty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Insufficient stock.' });
      }

      await client.query(
        'UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
        [finalQty, transfer.inventory_id]
      );

      await client.query(
        `UPDATE transfers SET status = 'Approved', approved_quantity = $1, response_note = $2,
         approved_by = $3, responded_at = NOW(), updated_at = NOW() WHERE id = $4`,
        [finalQty, response_note, req.user.id, id]
      );

      await client.query(
        `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id)
         VALUES ($1, 'transfer_approved', $2, $3, $4)`,
        [transfer.requesting_hospital_id,
         `Transfer Approved: ${transfer.drug_name}`,
         `${transfer.providing_name} approved ${finalQty} ${transfer.unit} of ${transfer.drug_name}. Delivery will be arranged.`,
         id]
      );

      await sendEmail(
        transfer.requesting_email,
        `✅ Synapse: Transfer Approved — ${transfer.drug_name}`,
        emailApprovedHTML(transfer.drug_name, finalQty, transfer.unit, transfer.providing_name, frontendUrl)
      );

    } else {
      await client.query(
        `UPDATE transfers SET status = 'Rejected', response_note = $1,
         approved_by = $2, responded_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [response_note, req.user.id, id]
      );

      await sendEmail(
        transfer.requesting_email,
        `❌ Synapse: Transfer Declined — ${transfer.drug_name}`,
        emailRejectedHTML(transfer.drug_name, transfer.providing_name, response_note, frontendUrl)
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Transfer ${action}d successfully.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Respond to transfer error:', err);
    res.status(500).json({ success: false, error: 'Failed to process transfer response.' });
  } finally {
    client.release();
  }
};

// ─── PATCH /api/transfers/:id/complete ───────────────────────────────────────
const completeTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE transfers SET status = 'Completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'Approved'
         AND (requesting_hospital_id = $2 OR $3 = 'SuperAdmin')
       RETURNING *`,
      [id, req.user.hospital_id, req.user.role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer not found or cannot be completed.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to complete transfer.' });
  }
};

module.exports = { getTransfers, requestTransfer, respondToTransfer, completeTransfer };
