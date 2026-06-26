// FILE: server/controllers/gpsController.js
const { query } = require('../config/db');

// POST /api/gps/:token — Agent sends their location (public, no auth)
const updateLocation = async (req, res) => {
  try {
    const { token } = req.params;
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'latitude and longitude required.' });
    }

    // Get delivery by token
    const deliveryResult = await query(
      'SELECT id, agent_id, status FROM deliveries WHERE agent_token = $1',
      [token]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid delivery token.' });
    }

    const delivery = deliveryResult.rows[0];

    // Only track active deliveries
    if (delivery.status === 'Delivered' || delivery.status === 'Failed') {
      return res.json({ success: true, message: 'Delivery completed, tracking stopped.' });
    }

    // Save location
    await query(
      `INSERT INTO agent_locations (delivery_id, agent_id, latitude, longitude, accuracy)
       VALUES ($1, $2, $3, $4, $5)`,
      [delivery.id, delivery.agent_id, latitude, longitude, accuracy || null]
    );

    // Keep only last 50 locations per delivery (cleanup old ones)
    await query(
      `DELETE FROM agent_locations
       WHERE delivery_id = $1
       AND id NOT IN (
         SELECT id FROM agent_locations
         WHERE delivery_id = $1
         ORDER BY recorded_at DESC
         LIMIT 50
       )`,
      [delivery.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('GPS update error:', err);
    res.status(500).json({ success: false, error: 'Failed to save location.' });
  }
};

// GET /api/gps/:deliveryId/latest — Hospital gets agent's latest location
const getLatestLocation = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const result = await query(
      `SELECT latitude, longitude, accuracy, recorded_at
       FROM agent_locations
       WHERE delivery_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [deliveryId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No location data yet.' });
    }

    const location = result.rows[0];
    const secondsAgo = Math.floor((Date.now() - new Date(location.recorded_at)) / 1000);

    res.json({
      success: true,
      data: {
        ...location,
        secondsAgo,
        isLive: secondsAgo < 30, // Consider live if updated within 30 seconds
      }
    });
  } catch (err) {
    console.error('Get location error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch location.' });
  }
};

// GET /api/gps/:deliveryId/trail — Get last 20 locations for trail on map
const getLocationTrail = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const result = await query(
      `SELECT latitude, longitude, recorded_at
       FROM agent_locations
       WHERE delivery_id = $1
       ORDER BY recorded_at DESC
       LIMIT 20`,
      [deliveryId]
    );

    res.json({ success: true, data: result.rows.reverse() }); // oldest first for trail
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch trail.' });
  }
};

module.exports = { updateLocation, getLatestLocation, getLocationTrail };
