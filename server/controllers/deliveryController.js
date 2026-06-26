// FILE: server/controllers/deliveryController.js
const { query, getClient } = require('../config/db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const DELIVERY_METHODS = {
  self_pickup:          { label: 'Self Pickup',             description: 'Requesting hospital sends their own vehicle', estimated_hours: 24, cost: 0 },
  hospital_vehicle:     { label: 'Hospital Vehicle',        description: 'Providing hospital delivers via their own vehicle', estimated_hours: 24, cost: 0 },
  porter:               { label: 'Porter',                  description: 'Porter app — same city delivery', estimated_hours: 4, cost: 500, contact: 'porter.in | 1800-XXX-XXXX' },
  shadowfax:            { label: 'Shadowfax',               description: 'Shadowfax medical logistics — cold chain available', estimated_hours: 12, cost: 800, contact: 'shadowfax.in | 1800-XXX-XXXX' },
  dunzo:                { label: 'Dunzo',                   description: 'Dunzo Business — hyperlocal delivery', estimated_hours: 3, cost: 400, contact: 'dunzo.com/business' },
  licensed_distributor: { label: 'Licensed Drug Distributor', description: 'C&F agent with Form 10 — required for inter-state', estimated_hours: 48, cost: 1500, contact: 'Contact your local CDSCO registered distributor' },
};

// Email helper
const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`📧 Email skipped — would send to: ${to}`);
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

// GET /api/deliveries/methods
const getDeliveryMethods = async (req, res) => {
  res.json({ success: true, data: DELIVERY_METHODS });
};

// GET /api/deliveries/track/:token — PUBLIC route for delivery agent (no auth needed)
const getDeliveryByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await query(
      `SELECT d.*,
              t.approved_quantity, t.requested_quantity,
              i.drug_name, i.unit,
              ph.name as providing_name, ph.address as providing_address, ph.city as providing_city,
              rh.name as requesting_name, rh.address as requesting_address, rh.city as requesting_city
       FROM deliveries d
       JOIN transfers t ON d.transfer_id = t.id
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       WHERE d.agent_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid delivery link.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch delivery.' });
  }
};

// PATCH /api/deliveries/track/:token/status — PUBLIC route for agent to update status
const updateDeliveryStatusByToken = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { token } = req.params;
    const { status } = req.body;

    const validStatuses = ['Packed', 'PickedUp', 'InTransit', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    // Get delivery by token
    const deliveryResult = await client.query(
      'SELECT * FROM deliveries WHERE agent_token = $1',
      [token]
    );

    if (deliveryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Invalid delivery link.' });
    }

    const delivery = deliveryResult.rows[0];

    // Prevent going backwards
    const STATUS_ORDER = ['Pending', 'Packed', 'PickedUp', 'InTransit', 'Delivered'];
    const currentIdx = STATUS_ORDER.indexOf(delivery.status);
    const newIdx = STATUS_ORDER.indexOf(status);
    if (newIdx <= currentIdx) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Cannot go back to a previous status.' });
    }

    const timestampField = {
      Packed: 'packed_at', PickedUp: 'picked_up_at',
      InTransit: 'in_transit_at', Delivered: 'delivered_at',
    };
    const tsUpdate = timestampField[status] ? `, ${timestampField[status]} = NOW()` : '';

    await client.query(
      `UPDATE deliveries SET status = $1, updated_at = NOW() ${tsUpdate} WHERE agent_token = $2`,
      [status, token]
    );

    // If delivered — auto complete transfer and send emails
    if (status === 'Delivered') {
      await client.query(
        `UPDATE transfers SET status = 'Completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [delivery.transfer_id]
      );

      const transferInfo = await client.query(
        `SELECT t.requesting_hospital_id, t.providing_hospital_id,
                i.drug_name, ph.name as providing_name,
                rh.contact_email as requesting_email,
                ph.contact_email as providing_email
         FROM transfers t
         JOIN inventory i ON t.inventory_id = i.id
         JOIN hospitals ph ON t.providing_hospital_id = ph.id
         JOIN hospitals rh ON t.requesting_hospital_id = rh.id
         WHERE t.id = $1`,
        [delivery.transfer_id]
      );

      if (transferInfo.rows.length > 0) {
        const t = transferInfo.rows[0];

        // Notify both hospitals in-app
        await client.query(
          `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id)
           VALUES ($1, 'delivery_completed', 'Medicine Delivered!', $2, $3)`,
          [t.requesting_hospital_id, `${t.drug_name} has been delivered by the agent. Transfer completed.`, delivery.transfer_id]
        );
        await client.query(
          `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id)
           VALUES ($1, 'delivery_completed', 'Delivery Confirmed', $2, $3)`,
          [t.providing_hospital_id, `Agent confirmed delivery of ${t.drug_name}. Transfer completed.`, delivery.transfer_id]
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Email to requesting hospital
        await sendEmail(
          t.requesting_email,
          `🎉 Synapse: Medicine Delivered — ${t.drug_name}`,
          `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#070b14;color:#e2e8f0;padding:32px;border-radius:12px;">
            <h1 style="color:#00d4ff;letter-spacing:4px;text-align:center;">SYNAPSE</h1>
            <div style="background:#0d1526;border:1px solid #00ff9d33;border-radius:8px;padding:24px;margin:16px 0;">
              <h2 style="color:#00ff9d;margin-top:0;">🎉 Medicine Delivered!</h2>
              <p style="color:#64748b;">The delivery agent has confirmed delivery.</p>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">Drug</td><td style="color:#e2e8f0;font-weight:bold;">${t.drug_name}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">From</td><td style="color:#e2e8f0;">${t.providing_name}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Status</td><td style="color:#00ff9d;font-weight:bold;">✅ Completed</td></tr>
              </table>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${frontendUrl}/transfers" style="background:#00ff9d;color:#070b14;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Download Certificate →</a>
            </div>
          </div>`
        );

        // Email to providing hospital
        await sendEmail(
          t.providing_email,
          `✅ Synapse: Delivery Confirmed — ${t.drug_name}`,
          `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#070b14;color:#e2e8f0;padding:32px;border-radius:12px;">
            <h1 style="color:#00d4ff;letter-spacing:4px;text-align:center;">SYNAPSE</h1>
            <div style="background:#0d1526;border:1px solid #00ff9d33;border-radius:8px;padding:24px;margin:16px 0;">
              <h2 style="color:#00ff9d;margin-top:0;">✅ Delivery Confirmed by Agent</h2>
              <p style="color:#64748b;">Your delivery agent has confirmed the medicine was delivered.</p>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">Drug</td><td style="color:#e2e8f0;font-weight:bold;">${t.drug_name}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Delivered To</td><td style="color:#e2e8f0;">${t.requesting_name || ''}</td></tr>
              </table>
            </div>
          </div>`
        );
      }
    } else {
      // Notify both hospitals of status update
      const transferInfo = await client.query(
        `SELECT t.requesting_hospital_id, t.providing_hospital_id, i.drug_name
         FROM transfers t JOIN inventory i ON t.inventory_id = i.id
         WHERE t.id = $1`,
        [delivery.transfer_id]
      );

      if (transferInfo.rows.length > 0) {
        const t = transferInfo.rows[0];
        const statusLabels = { Packed: 'Medicine Packed 📦', PickedUp: 'Picked Up by Agent 🚗', InTransit: 'In Transit 🚚' };

        for (const hospitalId of [t.requesting_hospital_id, t.providing_hospital_id]) {
          await client.query(
            `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id)
             VALUES ($1, 'delivery_update', $2, $3, $4)`,
            [hospitalId, `Delivery Update: ${statusLabels[status]}`, `Agent updated status for ${t.drug_name}: ${statusLabels[status]}`, delivery.transfer_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Agent status update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update status.' });
  } finally {
    client.release();
  }
};

// POST /api/deliveries
const createDelivery = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { transfer_id, delivery_method, agent_name, agent_phone, tracking_id, notes, estimated_delivery } = req.body;

    if (!transfer_id || !delivery_method) {
      return res.status(400).json({ success: false, error: 'transfer_id and delivery_method are required.' });
    }

    const transferResult = await client.query(
      `SELECT t.*,
              ph.address as providing_address, ph.name as providing_name, ph.city as providing_city,
              rh.address as requesting_address, rh.name as requesting_name, rh.city as requesting_city,
              rh.contact_email as requesting_email,
              i.drug_name, i.unit
       FROM transfers t
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       JOIN inventory i ON t.inventory_id = i.id
       WHERE t.id = $1`,
      [transfer_id]
    );

    if (transferResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Transfer not found.' });
    }

    const transfer = transferResult.rows[0];

    if (transfer.status !== 'Approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Transfer must be approved before creating delivery.' });
    }

    const existing = await client.query('SELECT id FROM deliveries WHERE transfer_id = $1', [transfer_id]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Delivery already exists for this transfer.' });
    }

    // Generate unique agent token
    const agentToken = crypto.randomBytes(32).toString('hex');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const agentLink = `${frontendUrl}/agent/${agentToken}`;

    const result = await client.query(
      `INSERT INTO deliveries
        (transfer_id, delivery_method, agent_name, agent_phone, tracking_id,
         pickup_address, delivery_address, notes, estimated_delivery, status, agent_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending', $10)
       RETURNING *`,
      [
        transfer_id, delivery_method, agent_name, agent_phone, tracking_id,
        `${transfer.providing_name}, ${transfer.providing_address}, ${transfer.providing_city}`,
        `${transfer.requesting_name}, ${transfer.requesting_address}, ${transfer.requesting_city}`,
        notes,
        estimated_delivery || new Date(Date.now() + (DELIVERY_METHODS[delivery_method]?.estimated_hours || 24) * 3600000),
        agentToken,
      ]
    );

    // In-app notification for requesting hospital
    await client.query(
      `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id)
       VALUES ($1, 'delivery_created', 'Delivery Arranged', $2, $3)`,
      [
        transfer.requesting_hospital_id,
        `${transfer.providing_name} arranged delivery via ${DELIVERY_METHODS[delivery_method]?.label}.${agent_name ? ` Agent: ${agent_name}` : ''}${agent_phone ? ` Phone: ${agent_phone}` : ''}`,
        transfer_id,
      ]
    );

    // Email to requesting hospital about delivery
    await sendEmail(
      transfer.requesting_email,
      `🚚 Synapse: Delivery Arranged — ${transfer.drug_name}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#070b14;color:#e2e8f0;padding:32px;border-radius:12px;">
        <h1 style="color:#00d4ff;letter-spacing:4px;text-align:center;">SYNAPSE</h1>
        <div style="background:#0d1526;border:1px solid #1e3a5f;border-radius:8px;padding:24px;margin:16px 0;">
          <h2 style="color:#00d4ff;margin-top:0;">🚚 Delivery Arranged</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">Method</td><td style="color:#e2e8f0;">${DELIVERY_METHODS[delivery_method]?.label}</td></tr>
            ${agent_name ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Agent</td><td style="color:#e2e8f0;">${agent_name}</td></tr>` : ''}
            ${agent_phone ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Phone</td><td style="color:#00d4ff;">${agent_phone}</td></tr>` : ''}
          </table>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${frontendUrl}/transfers" style="background:#00d4ff;color:#070b14;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Track Delivery →</a>
        </div>
      </div>`
    );

    await client.query('COMMIT');

    // Return agent link so frontend can include it in WhatsApp message
    res.status(201).json({
      success: true,
      data: result.rows[0],
      agentLink,
      agentToken,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create delivery error:', err);
    res.status(500).json({ success: false, error: 'Failed to create delivery.' });
  } finally {
    client.release();
  }
};

// PATCH /api/deliveries/:id/status — Hospital updates status (existing)
const updateDeliveryStatus = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Packed', 'PickedUp', 'InTransit', 'Delivered', 'Failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    const timestampField = { Packed: 'packed_at', PickedUp: 'picked_up_at', InTransit: 'in_transit_at', Delivered: 'delivered_at' };
    const tsUpdate = timestampField[status] ? `, ${timestampField[status]} = NOW()` : '';

    const result = await client.query(
      `UPDATE deliveries SET status = $1, updated_at = NOW() ${tsUpdate} WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Delivery not found.' });
    }

    const delivery = result.rows[0];

    if (status === 'Delivered') {
      await client.query(
        `UPDATE transfers SET status = 'Completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [delivery.transfer_id]
      );

      const transferInfo = await client.query(
        `SELECT t.requesting_hospital_id, t.providing_hospital_id, i.drug_name,
                ph.name as providing_name, rh.contact_email as requesting_email
         FROM transfers t JOIN inventory i ON t.inventory_id = i.id
         JOIN hospitals ph ON t.providing_hospital_id = ph.id
         JOIN hospitals rh ON t.requesting_hospital_id = rh.id
         WHERE t.id = $1`,
        [delivery.transfer_id]
      );

      if (transferInfo.rows.length > 0) {
        const t = transferInfo.rows[0];
        await client.query(
          `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id)
           VALUES ($1, 'delivery_completed', 'Medicine Delivered!', $2, $3)`,
          [t.requesting_hospital_id, `${t.drug_name} from ${t.providing_name} delivered. Transfer completed.`, delivery.transfer_id]
        );

        await sendEmail(
          t.requesting_email,
          `🎉 Synapse: Medicine Delivered — ${t.drug_name}`,
          `<div style="font-family:Arial,sans-serif;max-width:600px;background:#070b14;color:#e2e8f0;padding:32px;border-radius:12px;">
            <h1 style="color:#00d4ff;text-align:center;">SYNAPSE</h1>
            <div style="background:#0d1526;border:1px solid #00ff9d33;border-radius:8px;padding:24px;">
              <h2 style="color:#00ff9d;">🎉 Medicine Delivered!</h2>
              <p style="color:#64748b;">Drug: <strong style="color:#e2e8f0;">${t.drug_name}</strong> from ${t.providing_name}</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/transfers" style="background:#00ff9d;color:#070b14;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Download Certificate →</a>
            </div>
          </div>`
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update delivery status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update delivery status.' });
  } finally {
    client.release();
  }
};

// GET /api/deliveries/transfer/:transferId
const getDeliveryByTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const result = await query('SELECT * FROM deliveries WHERE transfer_id = $1', [transferId]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch delivery.' });
  }
};

// GET /api/deliveries
const getDeliveries = async (req, res) => {
  try {
    const params = [];
    let hospitalFilter = '';
    if (req.user.role === 'HospitalAdmin') {
      params.push(req.user.hospital_id);
      hospitalFilter = `AND (t.requesting_hospital_id = $${params.length} OR t.providing_hospital_id = $${params.length})`;
    }

    const result = await query(
      `SELECT d.*, t.status as transfer_status, t.requesting_hospital_id, t.providing_hospital_id,
              i.drug_name, i.quantity as transfer_quantity, i.unit,
              rh.name as requesting_hospital_name, ph.name as providing_hospital_name
       FROM deliveries d
       JOIN transfers t ON d.transfer_id = t.id
       JOIN inventory i ON t.inventory_id = i.id
       JOIN hospitals rh ON t.requesting_hospital_id = rh.id
       JOIN hospitals ph ON t.providing_hospital_id = ph.id
       WHERE 1=1 ${hospitalFilter}
       ORDER BY d.created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch deliveries.' });
  }
};

module.exports = {
  getDeliveryMethods, createDelivery, updateDeliveryStatus,
  getDeliveryByTransfer, getDeliveries,
  getDeliveryByToken, updateDeliveryStatusByToken,
  DELIVERY_METHODS,
};
