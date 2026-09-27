const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rojgar_mitra_test';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const { ROLES } = require('../src/constants/roles');
const { ACCOUNT_STATUS } = require('../src/constants/accountStatus');
const { generateAccessToken } = require('../src/utils/tokenUtils');

describe('Role-Based Access Control (RBAC) Test Suite', () => {
  let normalUser;
  let adminUser;
  let govtOfficial;
  let userToken;
  let adminToken;
  let govtToken;

  before(async () => {
    await connectDB();
  });

  after(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    // Create Normal User
    normalUser = new User({
      name: 'Regular Beneficiary',
      email: 'user@example.com',
      password: 'Password@123',
      role: ROLES.USER,
      status: ACCOUNT_STATUS.ACTIVE
    });
    await normalUser.save();
    userToken = generateAccessToken(normalUser);

    // Create Admin User
    adminUser = new User({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'Password@123',
      role: ROLES.ADMIN,
      status: ACCOUNT_STATUS.ACTIVE
    });
    await adminUser.save();
    adminToken = generateAccessToken(adminUser);

    // Create Govt Official
    govtOfficial = new User({
      name: 'Govt Officer',
      email: 'officer@example.com',
      password: 'Password@123',
      role: ROLES.GOVT_OFFICIAL,
      status: ACCOUNT_STATUS.ACTIVE,
      profile: { department: 'Skill Development' }
    });
    await govtOfficial.save();
    govtToken = generateAccessToken(govtOfficial);
  });

  test('GET /api/users/profile - Normal user can access their own profile', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, 'user@example.com');
  });

  test('GET /api/admin/users - Regular user is DENIED access to Admin route (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Access denied/i);
  });

  test('GET /api/admin/users - Admin is ALLOWED access to Admin route (200)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.users));
  });

  test('GET /api/govt/beneficiaries - Regular user is DENIED access to Govt route (403)', async () => {
    const res = await request(app)
      .get('/api/govt/beneficiaries')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test('GET /api/govt/beneficiaries - Govt official is ALLOWED access (200)', async () => {
    const res = await request(app)
      .get('/api/govt/beneficiaries')
      .set('Authorization', `Bearer ${govtToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('Suspended user is REJECTED on protected routes (403)', async () => {
    // Suspend user
    normalUser.status = ACCOUNT_STATUS.SUSPENDED;
    await normalUser.save();

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Account is suspended/i);
  });

  test('Missing token is REJECTED on protected routes (401)', async () => {
    const res = await request(app).get('/api/users/profile');
    assert.equal(res.status, 401);
  });

  test('Invalid token is REJECTED on protected routes (401)', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer invalid_garbage_token_123');
    assert.equal(res.status, 401);
  });
});
