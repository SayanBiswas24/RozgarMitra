# Rojgar Mitra - Backend Architecture & Authentication System

A production-ready, scalable, and secure RESTful Backend built with **Node.js, Express, and MongoDB (Mongoose)** for Rojgar Mitra.

---

## 🛡️ Security Architecture Overview

### 1. Authentication (Who is this user?)
- **Password Hashing:** Passwords hashed with `bcryptjs` using 12 salt rounds with pre-save hooks. Passwords are never returned in queries or logs (`select: false`).
- **Access Tokens:** Short-lived JWTs (default: 15 minutes) signed with `HS256`. Minimal payload claims (`sub`, `role`, `email`) avoiding sensitive data leakage.
- **Refresh Tokens:** Cryptographically secure random tokens (`crypto.randomBytes(40)`). Only SHA-256 hashes are stored server-side with TTL indexes and revocation tracking.
- **Token Rotation & Theft Detection:** Every `/api/auth/refresh-token` rotates tokens (invalidates the old token and generates a new one). Replay/reuse of a revoked token invalidates all sessions for that account immediately.
- **Account Lockout:** Automatically locks accounts after 5 consecutive failed login attempts for 15 minutes to prevent brute-force attacks.
- **Single-Use Password Reset:** Cryptographic reset tokens hashed server-side with 15-minute TTL.

### 2. Authorization & RBAC (Is this user allowed?)
- **Roles:** `USER`, `ADMIN`, `GOVT_OFFICIAL`.
- **RBAC Middleware:** `authorize(...roles)` enforces least privilege on protected endpoints.
- **Account Status Enforcement:** Prevents `SUSPENDED`, `BLOCKED`, and `DEACTIVATED` accounts from authenticating or accessing protected resources.
- **Mass Assignment Defense:** Strict field whitelisting. Client input cannot inject `role`, `status`, `isAdmin`, or security flags.

### 3. Attack Surface Defense
- **Brute Force & Rate Limiting:** `express-rate-limit` protects authentication endpoints (30 req / 15 min) and password reset endpoints (5 req / 15 min).
- **Security Headers:** HTTP headers configured with `helmet`.
- **CORS:** Configurable whitelisted origins with credentials support (`CLIENT_URL`).
- **Payload Limits:** Request bodies restricted to 1MB to prevent memory exhaustion DoS.
- **Database Injection:** MongoDB schema validation, parameterized queries, and ObjectId sanitization.
- **Audit Logging:** Security events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `LOGOUT`, `ROLE_CHANGED`, etc.) logged with automatic redaction of sensitive credentials.

---

## 📁 Directory Structure

```text
Backend/
├── src/
│   ├── config/
│   │   ├── db.js                   # MongoDB connection & reconnect handling
│   │   ├── env.js                  # Centralized validated environment configuration
│   │   └── cors.js                 # Secure CORS policy
│   ├── constants/
│   │   ├── roles.js                # USER, ADMIN, GOVT_OFFICIAL
│   │   ├── accountStatus.js        # ACTIVE, PENDING, SUSPENDED, BLOCKED, DEACTIVATED
│   │   └── auditActions.js         # Audit log action identifiers
│   ├── models/
│   │   ├── User.js                 # User schema, bcrypt hooks, lockout & safe toJSON
│   │   ├── RefreshToken.js         # Hashed refresh tokens with TTL & revocation
│   │   ├── PasswordResetToken.js   # Single-use reset tokens with TTL
│   │   └── AuditLog.js             # Security audit logs with secret redaction
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT extraction, verification, & status enforcement
│   │   ├── roleMiddleware.js       # RBAC role authorization & violation auditing
│   │   ├── rateLimitMiddleware.js  # Brute-force & DDoS protection
│   │   ├── validateMiddleware.js   # Input validation with express-validator
│   │   └── errorMiddleware.js      # Centralized error & 404 handler
│   ├── controllers/
│   │   ├── authController.js       # Register, login, refresh, logout, password flows
│   │   ├── userController.js       # Profile management with mass assignment protection
│   │   ├── adminController.js      # User management, role/status updates, audit logs
│   │   └── govtController.js       # Government official verification endpoints
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth routes
│   │   ├── userRoutes.js           # /api/users routes
│   │   ├── adminRoutes.js          # /api/admin routes
│   │   ├── govtRoutes.js           # /api/govt routes
│   │   └── index.js                # Root router & health check
│   ├── utils/
│   │   ├── apiResponse.js          # Standardized JSON response contract
│   │   ├── auditLogger.js          # Asynchronous audit log persistence
│   │   ├── passwordUtils.js        # Bcrypt hashing & strength validation
│   │   └── tokenUtils.js           # JWT & crypto token generation/hashing
│   ├── app.js                      # Express app configuration
│   └── server.js                   # Server entrypoint with graceful shutdown
├── tests/
│   ├── auth.test.js                # 9 integration tests for authentication lifecycle
│   ├── rbac.test.js                # 8 tests for role permissions & status policy
│   └── security.test.js            # 4 tests for mass assignment, lockout, & ID validation
├── .env.example                    # Environment template
├── .env                            # Active environment configuration
└── package.json
```

---

## 📑 API Endpoint Matrix

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health & uptime |
| `POST` | `/api/auth/register` | Public (Rate-limited) | Register user (whitelisted fields, defaults to `USER`) |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Login, returns JWT + rotated refresh token |
| `POST` | `/api/auth/refresh-token` | Public | Exchange refresh token for new access + refresh token |
| `POST` | `/api/auth/logout` | Public / Auth | Revoke refresh token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |
| `POST` | `/api/auth/change-password` | Authenticated | Update password, revokes existing refresh tokens |
| `POST` | `/api/auth/forgot-password` | Public (Rate-limited) | Request single-use password reset token |
| `POST` | `/api/auth/reset-password` | Public (Rate-limited) | Reset password with token |
| `GET` | `/api/users/profile` | Authenticated | View authenticated user profile |
| `PUT` | `/api/users/profile` | Authenticated | Update user profile (strictly whitelisted fields) |
| `GET` | `/api/admin/users` | Admin Only | View paginated list of all users |
| `GET` | `/api/admin/users/:id` | Admin Only | View detailed user account |
| `PATCH`| `/api/admin/users/:id/status`| Admin Only | Update account status (`ACTIVE`, `SUSPENDED`, `BLOCKED`) |
| `PATCH`| `/api/admin/users/:id/role`| Admin Only | Update role (`USER`, `GOVT_OFFICIAL`, `ADMIN`) |
| `GET` | `/api/admin/audit-logs` | Admin Only | View paginated security audit logs |
| `GET` | `/api/admin/stats` | Admin Only | Aggregated system metrics |
| `GET` | `/api/govt/beneficiaries`| Govt / Admin | View beneficiaries list for schemes |
| `POST` | `/api/govt/verify` | Govt / Admin | Verify beneficiary application |

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and verify database URI:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/rojgar_mitra
JWT_SECRET=super_secret_jwt_key_for_rojgar_mitra_auth_2026_at_least_32_bytes
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_for_rojgar_mitra_refresh_2026
```

### 3. Run the Backend Server
```bash
npm start
# or development with auto-reload:
npm run dev
```

### 4. Run Automated Test Suite
```bash
npm test
```
All 21 integration tests run sequentially against a clean test database.
