// FILE: server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { helmetConfig, globalLimiter, auditLogger } = require('./middleware/security');

const app = express();

// 💡 ADD THIS LINE RIGHT HERE BEFORE HELMET AND LIMITERS
app.set('trust proxy', 1); 

app.use(helmetConfig);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // If it's a server-to-server request or matching allowed origins
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(globalLimiter);
app.use(auditLogger);

// ... The rest of your routes and error handling remain exactly the same
// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/inventory',     require('./routes/inventory'));
app.use('/api/transfers',     require('./routes/transfers'));
app.use('/api/hospitals',     require('./routes/hospitals'));
app.use('/api/deliveries',    require('./routes/deliveries'));
app.use('/api/certificates',  require('./routes/certificates'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/agents',        require('./routes/agents'));
app.use('/api/gps',           require('./routes/gps'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Synapse API v3' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🧬 Synapse API v3 running on port ${PORT} [${process.env.NODE_ENV}]`);
});
module.exports = app;
