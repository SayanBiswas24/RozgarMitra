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
const { ROLES } = require('../src/constants/roles');
const { ACCOUNT_STATUS } = require('../src/constants/accountStatus');
const { generateAccessToken } = require('../src/utils/tokenUtils');

describe('Security & Vulnerability Defense Test Suite', () => {
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
    await RefreshToken.deleteMany({});
  });

  test('Mass Assignment Defense: User cannot grant themselves ADMIN role during registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hacker User',
      email: 'hacker@example.com',
      password: 'Password@123',
      role: 'ADMIN', // Malicious attempt to elevate privileges
      status: 'BLOCKED',
      isAdmin: true
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, ROLES.USER); // MUST remain USER
    assert.equal(res.body.data.user.status, ACCOUNT_STATUS.ACTIVE);

    // Verify in database
    const userInDb = await User.findOne({ email: 'hacker@example.com' });
    assert.equal(userInDb.role, ROLES.USER);
  });

  test('Mass Assignment Defense: User cannot modify role or status via profile update', async () => {
    const user = new User({
      name: 'Regular User',
      email: 'regular@example.com',
      password: 'Password@123',
      role: ROLES.USER,
      status: ACCOUNT_STATUS.ACTIVE
    });
    await user.save();
    const token = generateAccessToken(user);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        role: 'ADMIN', // Exploit attempt
        status: 'SUSPENDED',
        email: 'attacker@example.com'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'Updated Name');
    assert.equal(res.body.data.user.role, ROLES.USER); // Unchanged
    assert.equal(res.body.data.user.email, 'regular@example.com'); // Unchanged

    const userInDb = await User.findById(user._id);
    assert.equal(userInDb.role, ROLES.USER);
    assert.equal(userInDb.email, 'regular@example.com');
  });

  test('Malformed ObjectId Defense: Returns 400 Bad Request instead of unhandled 500 error', async () => {
    const admin = new User({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'Password@123',
      role: ROLES.ADMIN
    });
    await admin.save();
    const adminToken = generateAccessToken(admin);

    const res = await request(app)
      .get('/api/admin/users/not-a-valid-mongo-object-id')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('Account Lockout Defense: Locks account after 5 consecutive failed login attempts', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Brute Force Target',
      email: 'target@example.com',
      password: 'Password@123'
    });

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/login').send({
        email: 'target@example.com',
        password: 'WrongPassword@123'
      });
      assert.equal(res.status, 401);
    }

    // 5th failed attempt locks the account
    const fifthAttempt = await request(app).post('/api/auth/login').send({
      email: 'target@example.com',
      password: 'WrongPassword@123'
    });
    assert.equal(fifthAttempt.status, 423); // Locked
    assert.match(fifthAttempt.body.message, /temporarily locked/i);

    // Even with the CORRECT password, login is blocked while locked
    const correctPasswordWhileLocked = await request(app).post('/api/auth/login').send({
      email: 'target@example.com',
      password: 'Password@123'
    });
    assert.equal(correctPasswordWhileLocked.status, 423);
  });
});
