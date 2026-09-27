const AuditLog = require('../models/AuditLog');

// Sensitive keys that must NEVER be written to audit logs
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'oldpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'resettoken',
  'authorization',
  'cookie'
]);

/**
 * Recursively sanitize details object to prevent logging secrets
 * @param {any} obj 
 * @returns {any}
 */
function sanitizeDetails(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDetails);
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      clean[key] = sanitizeDetails(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Record an audit log entry asynchronously without crashing caller
 * @param {object} params
 */
async function logAudit({
  actor = {},
  action,
  target = {},
  status = 'SUCCESS',
  details = {},
  req = null
}) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || null) : null;
    const userAgent = req ? req.headers['user-agent'] || null : null;

    const auditEntry = new AuditLog({
      actor: {
        userId: actor.userId || (req && req.user ? req.user._id : null),
        email: actor.email || (req && req.user ? req.user.email : null),
        role: actor.role || (req && req.user ? req.user.role : 'ANONYMOUS')
      },
      action,
      target,
      status,
      details: sanitizeDetails(details),
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    await auditEntry.save();
  } catch (err) {
    // Non-blocking error handling for audit logging
    console.error('[AuditLog Error]', err.message);
  }
}

module.exports = {
  logAudit,
  sanitizeDetails
};
