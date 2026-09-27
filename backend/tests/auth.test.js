const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rojgar_mitra_test';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const PasswordResetToken = require('../src/models/PasswordResetToken');
const { ROLES } = require('../src/constants/roles');
const { ACCOUNT_STATUS } = require('../src/constants/accountStatus');

describe('Authentication Test Suite', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    // Clean up test DB
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
    await PasswordResetToken.deleteMany({});
  });

  test('POST /api/auth/register - Should register a new user with hashed password and tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Riyan Khan',
        email: 'riyan@example.com',
        phone: '+919876543210',
        password: 'Password@123',
        profile: {
          bio: 'Developer from Patna',
          district: 'Patna',
          state: 'Bihar'
        }
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, 'riyan@example.com');
    assert.equal(res.body.data.user.role, ROLES.USER);
    assert.equal(res.body.data.user.status, ACCOUNT_STATUS.ACTIVE);
    assert.equal(res.body.data.user.password, undefined); // Never leaked
    assert.ok(res.body.data.tokens.accessToken);
    assert.ok(res.body.data.tokens.refreshToken);

    // Verify user in DB has hashed password
    const userInDb = await User.findOne({ email: 'riyan@example.com' }).select('+password');
    assert.ok(userInDb);
    assert.notEqual(userInDb.password, 'Password@123'); // Hashed
    assert.ok(userInDb.password.startsWith('$2')); // bcrypt hash
  });

  test('POST /api/auth/register - Should reject duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'duplicate@example.com',
      password: 'Password@123'
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'duplicate@example.com',
      password: 'Password@123'
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  test('POST /api/auth/register - Should reject weak password with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak User',
      email: 'weak@example.com',
      password: 'weak' // Less than 8 chars
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('POST /api/auth/login - Should successfully authenticate and return tokens', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Tester',
      email: 'tester@example.com',
      password: 'Password@123'
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'tester@example.com',
      password: 'Password@123'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.tokens.accessToken);
    assert.ok(res.body.data.tokens.refreshToken);
    assert.equal(res.body.data.user.email, 'tester@example.com');
  });

  test('POST /api/auth/login - Should reject invalid password with 401 without leaking internal details', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Tester',
      email: 'tester@example.com',
      password: 'Password@123'
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'tester@example.com',
      password: 'WrongPassword@123'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  test('POST /api/auth/login - Should reject non-existent user with 401 generic error', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'Password@123'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  test('POST /api/auth/refresh-token - Should rotate refresh tokens and return new access token', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Refresh Tester',
      email: 'refresh@example.com',
      password: 'Password@123'
    });

    const oldRefreshToken = regRes.body.data.tokens.refreshToken;

    const res = await request(app).post('/api/auth/refresh-token').send({
      refreshToken: oldRefreshToken
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.tokens.accessToken);
    assert.ok(res.body.data.tokens.refreshToken);
    assert.notEqual(res.body.data.tokens.refreshToken, oldRefreshToken); // Rotated
  });

  test('POST /api/auth/logout - Should revoke refresh token', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Logout Tester',
      email: 'logout@example.com',
      password: 'Password@123'
    });

    const refreshToken = regRes.body.data.tokens.refreshToken;

    const logoutRes = await request(app).post('/api/auth/logout').send({
      refreshToken
    });
    assert.equal(logoutRes.status, 200);

    // Attempting to refresh with the revoked token should now fail
    const refreshRes = await request(app).post('/api/auth/refresh-token').send({
      refreshToken
    });
    assert.equal(refreshRes.status, 401);
  });

  test('POST /api/auth/forgot-password & reset-password - Complete flow', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Reset Tester',
      email: 'reset@example.com',
      password: 'Password@123'
    });

    // Request reset
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'reset@example.com'
    });
    assert.equal(forgotRes.status, 200);
    const resetToken = forgotRes.body.data?.resetToken;
    assert.ok(resetToken);

    // Reset password using token
    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: resetToken,
      newPassword: 'NewPassword@456'
    });
    assert.equal(resetRes.status, 200);

    // Login with new password
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'reset@example.com',
      password: 'NewPassword@456'
    });
    assert.equal(loginRes.status, 200);
  });
});
