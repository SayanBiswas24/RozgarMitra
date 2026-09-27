const cors = require('cors');
const env = require('./env');

/**
 * Configure secure CORS options with full support for Flutter Web (Chrome) & Mobile
 */
const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((url) => url.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Flutter Android/iOS apps, curl, postman)
    if (!origin) {
      return callback(null, true);
    }

    // In development or if wildcard configured, allow any localhost port (essential for Flutter Chrome dev server)
    if (env.NODE_ENV !== 'production' || env.CLIENT_URL === '*') {
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`Origin '${origin}' not permitted by CORS policy.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400 // 24 hours preflight cache
};

module.exports = cors(corsOptions);
