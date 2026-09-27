const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rojgar_mitra_test';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Training & Real Dataset Integration Suite', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDB();
  });

  test('GET /api/training/categories - Returns real distinct sectors from dataset', async () => {
    const res = await request(app).get('/api/training/categories').expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.categories));
    assert.ok(res.body.data.categories.includes('All'));
    assert.ok(res.body.data.categories.includes('Renewable Energy'));
    assert.ok(res.body.data.categories.includes('IT & ITeS'));
    assert.ok(res.body.data.categories.length > 5);
  });

  test('GET /api/training/opportunities - Returns paginated real dataset opportunities', async () => {
    const res = await request(app)
      .get('/api/training/opportunities?page=1&limit=10')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.page, 1);
    assert.equal(res.body.data.limit, 10);
    assert.equal(res.body.data.total, 132);
    assert.equal(res.body.data.opportunities.length, 10);

    const first = res.body.data.opportunities[0];
    assert.ok(first.id);
    assert.ok(first.courseName);
    assert.ok(first.sector);
    assert.ok(first.applicationUrl);
    assert.ok(first.sourceUrl);

    // Verify no sentinel characters ('—', '–', '\ufffd') leaked into response
    for (const [key, value] of Object.entries(first)) {
      if (typeof value === 'string') {
        assert.notEqual(value, '—');
        assert.notEqual(value, '–');
        assert.notEqual(value, 'Unknown');
        assert.notEqual(value, 'N/A');
      }
    }
  });

  test('GET /api/training/opportunities - Category filtering matches sector', async () => {
    const res = await request(app)
      .get('/api/training/opportunities?category=Renewable Energy')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.total > 0);
    for (const opp of res.body.data.opportunities) {
      assert.equal(opp.sector, 'Renewable Energy');
    }
  });

  test('GET /api/training/opportunities - Case-insensitive search across courses and skills', async () => {
    const res = await request(app)
      .get('/api/training/opportunities?search=solar')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.total > 0);
    for (const opp of res.body.data.opportunities) {
      const match =
        (opp.courseName && opp.courseName.toLowerCase().includes('solar')) ||
        (opp.jobRole && opp.jobRole.toLowerCase().includes('solar')) ||
        (opp.skillsAcquired && opp.skillsAcquired.toLowerCase().includes('solar')) ||
        (opp.sector && opp.sector.toLowerCase().includes('solar'));
      assert.ok(match);
    }
  });

  test('GET /api/training/:id - Returns complete 68-field dataset structure for valid ID', async () => {
    // Get list first
    const listRes = await request(app)
      .get('/api/training/opportunities?limit=1')
      .expect(200);

    const oppId = listRes.body.data.opportunities[0].id;

    const res = await request(app).get(`/api/training/${oppId}`).expect(200);

    assert.equal(res.body.success, true);
    const opp = res.body.data.opportunity;

    // Check sections
    assert.ok(opp.course);
    assert.equal(opp.course.courseName, listRes.body.data.opportunities[0].courseName);
    assert.ok(opp.eligibility);
    assert.ok(opp.feesAndBenefits);
    assert.ok(opp.training);
    assert.ok(opp.availability);
    assert.ok(opp.source);

    // Verify application and source links exist and are valid URLs
    assert.ok(opp.source.applicationUrl.startsWith('http'));
    assert.ok(opp.source.sourceUrl.startsWith('http'));

    // Check missing coordinates result in null distance
    assert.equal(opp.distanceKm, null);
  });

  test('GET /api/training/:id - Returns 404 for invalid ID without crashing', async () => {
    const res = await request(app)
      .get('/api/training/NON_EXISTENT_ID_99999')
      .expect(404);

    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('not found'));
  });

  test('GET /api/training/near-you - Returns featured top opportunities', async () => {
    const res = await request(app).get('/api/training/near-you').expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.opportunities));
    assert.equal(res.body.data.opportunities.length, 3);
  });
});
