// FILE: server/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Security middleware stack
 * Addresses OWASP Top 10: Injection, Broken Auth, Security Misconfiguration
 */

// Helmet: Sets secure HTTP headers
// Prevents: Clickjacking (X-Frame-Options), XSS (CSP), MIME sniffing
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Global rate limiter — prevents brute force & DDoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

// Audit logger — logs all mutating requests
const auditLogger = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const start = Date.now();
    res.on('finish', () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        user: req.user?.id || 'unauthenticated',
        hospital: req.user?.hospital_id || null,
        ip: req.ip,
        duration: `${Date.now() - start}ms`,
      }));
    });
  }
  next();
};

module.exports = { helmetConfig, globalLimiter, authLimiter, auditLogger };
