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

describe('Profile, Progress & Recommendation Complete Workflow Suite', () => {
  let userToken;
  let userEmail = 'beneficiary_flow@test.com';

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

    // Step 1: Register with ONLY mandatory basic identity information
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Rohan Kumar',
        email: userEmail,
        password: 'Password@123'
      });

    assert.equal(regRes.status, 201);
    userToken = regRes.body.data.tokens.accessToken;
    assert.ok(userToken);
  });

  test('Step 1 & 2: Registration initializes profile progress at 20% without forcing full details', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { user, aboutYou, workPreferences, progress, prediction } = res.body.data;

    // Basic identity
    assert.equal(user.name, 'Rohan Kumar');
    assert.equal(user.email, userEmail);

    // About You uncompleted fields must be null/empty (never fabricated)
    assert.equal(aboutYou.education, null);
    assert.equal(aboutYou.occupation, null);
    assert.deepEqual(aboutYou.skills, []);
    assert.deepEqual(aboutYou.interests, []);
    assert.equal(aboutYou.location.district, null);
    assert.equal(aboutYou.location.state, null);
    assert.equal(workPreferences.workTypePreference, null);

    // Initial Progress is 20% (for Basic Info)
    assert.equal(progress.completionPercentage, 20);
    assert.equal(progress.status, 'STARTED');
    assert.ok(progress.completedSections.includes('basicInfo'));
    assert.ok(progress.missingSections.includes('education'));
    assert.ok(progress.missingSections.includes('occupation'));
    assert.ok(progress.missingSections.includes('skills'));

    // Prediction is not ready initially
    assert.equal(prediction.readiness, 'INSUFFICIENT');
    assert.equal(prediction.canRecommend, false);
  });

  test('Step 3: "Your progress" card endpoint returns progress % and actionable next steps', async () => {
    const res = await request(app)
      .get('/api/profile/progress')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.completionPercentage, 20);
    assert.equal(res.body.data.status, 'STARTED');
    assert.ok(res.body.data.nextStep);
    assert.equal(res.body.data.canRecommend, false);
  });

  test('Step 4 & 5: Progressive profile updates increase progress percentage predictably', async () => {
    // 1. User adds Education (+15%) -> 35% (PARTIALLY_COMPLETE)
    const eduRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ education: 'CLASS_10' });


    assert.equal(eduRes.status, 200);
    assert.equal(eduRes.body.data.progress.completionPercentage, 35);
    assert.equal(eduRes.body.data.progress.status, 'PARTIALLY_COMPLETE');
    assert.equal(eduRes.body.data.aboutYou.education, 'CLASS_10');
    assert.equal(eduRes.body.data.aboutYou.educationLabel, 'Class 10');

    // 2. User adds Current Occupation (+15%) -> 50%
    const occRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ occupation_type: 'FARMER' });

    assert.equal(occRes.status, 200);
    assert.equal(occRes.body.data.progress.completionPercentage, 50);
    assert.equal(occRes.body.data.aboutYou.occupation_type, 'FARMER');
    assert.equal(occRes.body.data.aboutYou.occupationLabel, 'Farmer');

    // 3. User adds Skills (+15%) -> 65% (PROFILE_READY)
    const skillRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ skills: ['AGRICULTURE'], other_skills: ['Irrigation'] });

    assert.equal(skillRes.status, 200);
    assert.equal(skillRes.body.data.progress.completionPercentage, 65);
    assert.equal(skillRes.body.data.progress.status, 'PROFILE_READY');
    assert.ok(skillRes.body.data.aboutYou.skills.includes('AGRICULTURE'));
    assert.ok(skillRes.body.data.aboutYou.other_skills.includes('Irrigation'));

    // 4. User adds Location (+15%) -> 80%
    const locRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        location: {
          state: 'Bihar',
          district: 'Patna',
          block: 'Phulwari'
        }
      });

    assert.equal(locRes.status, 200);
    assert.equal(locRes.body.data.progress.completionPercentage, 80);
    assert.equal(locRes.body.data.aboutYou.location.district, 'Patna');
  });

  test('Step 6: Prediction & Recommendation becomes available when minimum prediction fields are complete', async () => {
    // Before minimum fields, recommendations endpoint reports missing requirements
    const unreadyRes = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(unreadyRes.status, 200);
    assert.equal(unreadyRes.body.data.ready, false);
    assert.equal(unreadyRes.body.data.readiness, 'INSUFFICIENT');
    assert.ok(unreadyRes.body.data.missingFields.length > 0);

    // Provide minimum prediction fields: Education, Skills, and District
    await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        education: 'CLASS_10',
        skills: ['TAILORING', 'STITCHING'],
        location: { state: 'Bihar', district: 'Patna' }
      });

    // Now query recommendations
    const readyRes = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.body.data.ready, true);
    assert.ok(['BASIC', 'MODERATE', 'HIGH'].includes(readyRes.body.data.readiness));
    assert.ok(Array.isArray(readyRes.body.data.recommendations));
    assert.ok(readyRes.body.data.recommendations.length > 0);

    // Top recommendation should match user skills
    const topRec = readyRes.body.data.recommendations[0];
    assert.ok(topRec.title);
    assert.ok(topRec.matchScore >= 50);
    assert.match(topRec.reasoning, /skills/i);
  });

  test('Step 7: 100% completion workflow with Interests and Work Preferences', async () => {
    // Fill all remaining fields
    const fullRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        education: 'CLASS_12',
        occupation_type: 'SELF_EMPLOYED',
        skills: ['MOBILE_REPAIR'],
        other_skills: ['Electronics'],
        interests: ['TECHNOLOGY'],
        other_interests: ['Robotics'],
        location: {
          state: 'Bihar',
          district: 'Patna',
          block: 'Patna Sadar',
          pincode: '800001'
        },
        workPreferences: {
          workTypePreference: 'Skill Training',
          travelPreference: 'Within District'
        }
      });

    assert.equal(fullRes.status, 200);
    assert.equal(fullRes.body.data.progress.completionPercentage, 100);
    assert.equal(fullRes.body.data.progress.status, 'COMPLETE');
    assert.equal(fullRes.body.data.progress.missingSections.length, 0);

    // About You contains all saved information
    assert.equal(fullRes.body.data.aboutYou.education, 'CLASS_12');
    assert.equal(fullRes.body.data.aboutYou.educationLabel, 'Class 12');
    assert.equal(fullRes.body.data.aboutYou.occupation_type, 'SELF_EMPLOYED');
    assert.ok(fullRes.body.data.aboutYou.skills.includes('MOBILE_REPAIR'));
    assert.ok(fullRes.body.data.aboutYou.other_skills.includes('Electronics'));
    assert.ok(fullRes.body.data.aboutYou.interests.includes('TECHNOLOGY'));
    assert.ok(fullRes.body.data.aboutYou.other_interests.includes('Robotics'));
    assert.equal(fullRes.body.data.aboutYou.location.pincode, '800001');
    assert.equal(fullRes.body.data.workPreferences.workTypePreference, 'Skill Training');
    assert.equal(fullRes.body.data.prediction.readiness, 'HIGH');
  });

  test('Security: User cannot elevate role or change account status via profile update', async () => {
    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        education: 'Graduate',
        role: 'ADMIN', // Malicious attempt
        status: 'SUSPENDED' // Malicious attempt
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, ROLES.USER);
    assert.equal(res.body.data.user.status, 'ACTIVE');

    const userInDb = await User.findOne({ email: userEmail });
    assert.equal(userInDb.role, ROLES.USER);
    assert.equal(userInDb.status, 'ACTIVE');
  });

  test('Work Preferences: Validates mobility_radius_km and rejects invalid values', async () => {
    // 1. Reject invalid negative radius
    const badRes1 = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        workPreferences: {
          mobility_radius_km: -5
        }
      });
    assert.equal(badRes1.status, 400);

    // 2. Reject excessive radius > 500 km
    const badRes2 = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        workPreferences: {
          mobility_radius_km: 1500
        }
      });
    assert.equal(badRes2.status, 400);

    // 3. Accept valid travel distance (e.g. 25 km)
    const validRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        workPreferences: {
          travelPreference: 'Within District',
          mobility_radius_km: 25
        }
      });
    assert.equal(validRes.status, 200);
    assert.equal(validRes.body.data.workPreferences.mobility_radius_km, 25);
    assert.equal(validRes.body.data.workPreferences.travelPreference, 'Within District');
  });

  test('Registration with initial About You education initializes profile progress at 35%', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Sunita Devi',
        email: 'sunita_initial@test.com',
        password: 'Password@123',
        education: 'CLASS_10'
      });

    assert.equal(regRes.status, 201);
    const token = regRes.body.data.tokens.accessToken;

    const profileRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(profileRes.status, 200);
    // 20% (basic identity) + 15% (education) = 35%
    assert.equal(profileRes.body.data.progress.completionPercentage, 35);
    assert.equal(profileRes.body.data.aboutYou.education, 'CLASS_10');
  });

  test('Recommendations: Offline/Hybrid distance calculation with coordinates & mobility radius', async () => {
    // Provide education, skills, location coordinates (Patna), and mobility radius (15 km)
    await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        education: 'CLASS_10',
        skills: ['TAILORING', 'STITCHING'],
        location: {
          district: 'Patna',
          latitude: 25.5941,
          longitude: 85.1376
        },
        workPreferences: {
          mobility_radius_km: 20
        }
      });

    const recRes = await request(app)
      .get('/api/profile/recommendations')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(recRes.status, 200);
    assert.equal(recRes.body.data.ready, true);
    assert.ok(recRes.body.data.recommendations.length > 0);

    const topRec = recRes.body.data.recommendations[0];
    assert.ok(topRec.matchScore >= 80);
    // Reasons should mention travel radius
    assert.ok(topRec.reasoning.includes('Within your travel radius'));
  });

  test('Pincode Lookup: Resolves official postal information and coordinates', async () => {
    const res = await request(app)
      .get('/api/profile/pincode/800001')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.pincode, '800001');
    assert.equal(res.body.data.state, 'Bihar');
    assert.equal(res.body.data.district, 'Patna');
    assert.ok(res.body.data.village);
    assert.ok(Array.isArray(res.body.data.villages));
    assert.ok(res.body.data.coordinates);
  });

  test('Pincode Lookup: Rejects invalid pincode format with 400 Bad Request', async () => {
    const res = await request(app)
      .get('/api/profile/pincode/invalid-pin')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('Pincode Lookup: Returns 404 for non-existent postal code', async () => {
    const res = await request(app)
      .get('/api/profile/pincode/999999')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('Controlled Enums: Rejects invalid education and occupation enums with 400', async () => {
    // 1. Invalid Education
    const badEduRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ education: 'INVALID_DEGREE_XYZ' });
    assert.equal(badEduRes.status, 400);

    // 2. Invalid Occupation
    const badOccRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ occupation_type: 'INVALID_OCCUPATION_XYZ' });
    assert.equal(badOccRes.status, 400);
  });

  test('Controlled Enums: Correctly stores OTHER occupation with custom occupation_other', async () => {
    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        occupation_type: 'OTHER',
        occupation_other: 'Mobile Repair Technician'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.aboutYou.occupation_type, 'OTHER');
    assert.equal(res.body.data.aboutYou.occupation_other, 'Mobile Repair Technician');
    assert.equal(res.body.data.aboutYou.occupationLabel, 'Mobile Repair Technician');
  });

  test('Skills & Interests: Deduplicates entries and stores custom other items', async () => {
    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        skills: ['DRIVING', 'DRIVING', 'PLUMBING'],
        other_skills: ['Drone Operator', 'drone operator'],
        interests: ['SOLAR_ENERGY', 'SOLAR_ENERGY'],
        other_interests: ['Robotics', 'robotics']
      });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.aboutYou.skills.sort(), ['DRIVING', 'PLUMBING'].sort());
    assert.equal(res.body.data.aboutYou.other_skills.length, 1);
    assert.equal(res.body.data.aboutYou.other_skills[0], 'Drone Operator');
    assert.deepEqual(res.body.data.aboutYou.interests, ['SOLAR_ENERGY']);
    assert.equal(res.body.data.aboutYou.other_interests.length, 1);
    assert.equal(res.body.data.aboutYou.other_interests[0], 'Robotics');
  });

  test('Coordinates Validation: Rejects coordinates outside valid geographic range', async () => {
    // Latitude out of range (> 90)
    const badLatRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        location: {
          latitude: 95.5,
          longitude: 85.0
        }
      });
    assert.equal(badLatRes.status, 400);

    // Longitude out of range (> 180)
    const badLonRes = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        location: {
          latitude: 25.5,
          longitude: 195.0
        }
      });
    assert.equal(badLonRes.status, 400);
  });
});
