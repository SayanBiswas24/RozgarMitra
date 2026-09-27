const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rojgar_mitra',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_min32chars!!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_in_production_min32chars!!',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Security & Rate Limiting
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  CLIENT_URL: process.env.CLIENT_URL || '*',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
  RATE_LIMIT_MAX_AUTH: parseInt(process.env.RATE_LIMIT_MAX_AUTH, 10) || 30, // 30 requests / 15 mins for auth
  RATE_LIMIT_MAX_GLOBAL: parseInt(process.env.RATE_LIMIT_MAX_GLOBAL, 10) || 200, // 200 requests / 15 mins globally
  
  // Account Security Policies
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
  LOCK_TIME_MS: parseInt(process.env.LOCK_TIME_MS, 10) || 15 * 60 * 1000, // 15 mins lockout
  PASSWORD_RESET_EXPIRES_MS: parseInt(process.env.PASSWORD_RESET_EXPIRES_MS, 10) || 15 * 60 * 1000 // 15 mins reset expiry
};

module.exports = env;
