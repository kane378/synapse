# 🧬 Synapse — Secure Inter-Hospital Oncology Resource Exchange

A high-integrity platform that prevents expensive oncology drug wastage by enabling verified hospitals to transfer near-expiry medicines in real-time.

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm

### 1. Database Setup
```bash
createdb synapse_db
psql -U postgres -d synapse_db -f server/schema.sql
```

### 2. Backend
```bash
cd server
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET
npm install
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

### Default SuperAdmin
- **Email:** `superadmin@synapse.health`
- **Password:** `SuperAdmin@123`
> ⚠️ Change this password immediately in production.

---

## 📁 Directory Structure

```
synapse/
├── server/
│   ├── config/
│   │   └── db.js                # PostgreSQL pool (parameterized queries)
│   ├── controllers/
│   │   ├── authController.js    # Login, register, JWT issuance
│   │   ├── inventoryController.js
│   │   ├── transferController.js
│   │   └── hospitalController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT verification + RBAC
│   │   └── security.js          # Helmet, rate limiting, audit logging
│   ├── routes/
│   │   ├── auth.js
│   │   ├── inventory.js
│   │   ├── transfers.js
│   │   └── hospitals.js
│   ├── index.js                 # Express app entry point
│   ├── schema.sql               # PostgreSQL schema
│   ├── package.json
│   └── .env.example
│
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── layout/          # Sidebar, Layout wrapper
    │   │   ├── transfers/       # RequestTransferModal
    │   │   └── ui/              # Button, Modal, Input, Alert, StatCard
    │   ├── context/
    │   │   └── AuthContext.jsx  # JWT state management
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── InventoryPage.jsx
    │   │   ├── TransfersPage.jsx
    │   │   ├── WasteAlertsPage.jsx
    │   │   └── HospitalsPage.jsx
    │   ├── utils/
    │   │   ├── api.js           # Axios instance with JWT interceptor
    │   │   └── helpers.js       # Formatting utilities
    │   └── App.jsx              # Router + protected routes
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 🔐 Security Architecture

### 1. Authentication — JWT (JSON Web Tokens)

**Implementation:** `server/middleware/auth.js`, `server/controllers/authController.js`

- Tokens are signed with `HS256` using a secret key (≥64 chars recommended)
- Default expiry: **8 hours** (configurable via `JWT_EXPIRES_IN`)
- Every protected request re-validates the user against the database — a deactivated account cannot use a previously issued token
- **OWASP Resistance:** Broken Authentication (A07:2021) — token expiry + DB re-validation prevents session hijacking

```js
// Token generation
jwt.sign({ userId, role, hospitalId }, process.env.JWT_SECRET, { expiresIn: '8h' });

// Verification (middleware)
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Then re-fetch user from DB to confirm still active
```

### 2. Password Security — Bcrypt

**Implementation:** `server/controllers/authController.js`

- Passwords hashed with **bcrypt cost factor 12** (≈250ms per hash — resistant to GPU brute-force)
- Raw passwords are **never stored or logged**
- Constant-time comparison prevents timing attacks during login — even for non-existent users, a dummy bcrypt comparison is performed

```js
const passwordHash = await bcrypt.hash(adminPassword, 12);
// Login: constant time even for non-existent users
await bcrypt.compare(password, '$2a$12$invalidhashtopreventtimingattack...');
```

- **OWASP Resistance:** Identification and Authentication Failures (A07:2021)

### 3. SQL Injection Prevention — Parameterized Queries

**Implementation:** `server/config/db.js`, all controllers

ALL database interactions use PostgreSQL parameterized queries via `pg`. **String concatenation into SQL is never used.**

```js
// ✅ CORRECT — parameterized
await query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ NEVER — string interpolation
await query(`SELECT * FROM users WHERE email = '${email}'`); // NOT in codebase
```

- **OWASP Resistance:** Injection (A03:2021) — parameterized queries make SQL injection structurally impossible

### 4. Role-Based Access Control (RBAC)

**Implementation:** `server/middleware/auth.js` — `requireRole()` and `requireHospitalOwnership()`

Two roles with strict separation:

| Role | Capabilities |
|------|-------------|
| `SuperAdmin` | Verify hospitals, view all inventory/transfers globally |
| `HospitalAdmin` | Manage own hospital's inventory, request/respond to transfers |

```js
// Route-level RBAC
router.patch('/:id/verify', requireRole('SuperAdmin'), verifyHospital);

// Hospital ownership enforcement
if (req.user.role === 'HospitalAdmin' && ownership.rows[0].hospital_id !== req.user.hospital_id) {
  return res.status(403).json({ error: 'Access forbidden.' });
}
```

Unverified hospital admins are **blocked at login** — they cannot access the platform until a SuperAdmin approves their hospital.

- **OWASP Resistance:** Broken Access Control (A01:2021)

### 5. Security Headers — Helmet.js

**Implementation:** `server/middleware/security.js`

```
X-Frame-Options: DENY            → Prevents clickjacking
X-Content-Type-Options: nosniff  → Prevents MIME sniffing
Strict-Transport-Security        → Forces HTTPS (1 year, preload)
Content-Security-Policy          → Restricts script/style sources
X-XSS-Protection                 → Legacy XSS filter
```

### 6. Rate Limiting

- **Global:** 200 requests per 15 minutes per IP
- **Auth endpoints:** 10 attempts per 15 minutes per IP (brute-force protection)

```js
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true });
```

- **OWASP Resistance:** Security Misconfiguration (A05:2021)

### 7. CORS Whitelist

Only origins listed in `ALLOWED_ORIGINS` env variable can make cross-origin requests:
```js
origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) callback(null, true);
  else callback(new Error('Not allowed by CORS'));
}
```

### 8. Request Payload Limiting

```js
app.use(express.json({ limit: '10kb' }));
```
Prevents large payload DoS attacks.

### 9. Audit Logging

All `POST`, `PUT`, `PATCH`, `DELETE` requests are logged with:
- Timestamp, method, path, HTTP status
- User ID and hospital ID
- IP address, response time

---

## 🛡️ OWASP Top 10 Coverage Summary

| OWASP Risk | Mitigation in Synapse |
|---|---|
| A01 Broken Access Control | RBAC middleware, hospital ownership checks |
| A02 Cryptographic Failures | Bcrypt (cost 12), JWT HS256, HTTPS enforcement |
| A03 Injection | Parameterized queries, no string interpolation in SQL |
| A04 Insecure Design | Least privilege (HospitalAdmin can't see other hospitals' data) |
| A05 Security Misconfiguration | Helmet headers, CORS whitelist, no stack trace leaks in prod |
| A07 Auth Failures | JWT expiry + DB re-validation, rate limiting, constant-time comparison |
| A09 Logging Failures | Audit logger middleware on all mutating requests |

---

## 🌟 Feature Highlights

### Waste-Alert Dashboard
- Automatically surfaces inventory items expiring within **30 days**
- Three urgency tiers: **Critical** (≤7d), **High** (≤14d), **Warning** (≤30d)
- Visual progress bars show time remaining

### Inter-Hospital Transfer Flow
1. Hospital A browses available inventory from all verified hospitals
2. Clicks **"Request Transfer"** → submits quantity + clinical note
3. Hospital B receives the request → can **Approve** (with adjusted quantity) or **Reject**
4. Upon approval, inventory is atomically decremented (PostgreSQL transaction)
5. Hospital A marks the transfer **Complete** upon physical receipt

This digital "handshake" creates an auditable chain of custody for every drug transfer.

---

## 📋 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Authenticate and receive JWT |
| POST | `/api/auth/register` | Public | Register new hospital |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/inventory` | JWT | List inventory |
| POST | `/api/inventory` | HospitalAdmin+ | Add item |
| GET | `/api/inventory/waste-alerts` | JWT | Expiring items |
| PUT | `/api/inventory/:id` | HospitalAdmin+ | Update item |
| DELETE | `/api/inventory/:id` | HospitalAdmin+ | Remove item |
| GET | `/api/transfers` | JWT | List transfers |
| POST | `/api/transfers` | HospitalAdmin+ | Request transfer |
| PATCH | `/api/transfers/:id/respond` | HospitalAdmin+ | Approve/reject |
| PATCH | `/api/transfers/:id/complete` | HospitalAdmin+ | Mark complete |
| GET | `/api/hospitals` | JWT | List hospitals |
| GET | `/api/hospitals/stats` | JWT | Dashboard stats |
| PATCH | `/api/hospitals/:id/verify` | SuperAdmin | Verify hospital |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | PostgreSQL (via `pg`) |
| Auth | `jsonwebtoken` + `bcryptjs` |
| Security | `helmet` + `express-rate-limit` |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (dark medical theme) |
| Icons | Lucide React |
| HTTP Client | Axios |

---

*Built with security-first principles. Always conduct a professional security audit before production deployment.*
