const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Course = require('../models/Course');
const trainingService = require('../services/trainingService');

/**
 * Seed and store all courses from the real training dataset into MongoDB
 */
async function seedCourses() {
  console.log('[CourseSeeder] Loading training dataset...');
  trainingService.loadDataset();

  const opps = trainingService._opportunities;
  console.log(`[CourseSeeder] Loaded ${opps.length} courses from Excel dataset.`);

  if (opps.length === 0) {
    console.warn('[CourseSeeder] No courses found in dataset to seed.');
    return 0;
  }

  const bulkOps = opps.map((opp) => ({
    updateOne: {
      filter: { opportunityId: opp.opportunityId },
      update: {
        $set: {
          opportunityId: opp.opportunityId,
          courseId: opp.courseId,
          courseName: opp.courseName,
          courseDescription: opp.courseDescription,
          schemeDescription: opp.schemeDescription,
          description: opp.description,
          sector: opp.sector,
          subSector: opp.subSector,
          jobRole: opp.jobRole,
          nsqfLevel: opp.nsqfLevel,
          courseType: opp.courseType,
          trainingType: opp.trainingType,
          durationHours: opp.durationHours,
          duration: opp.duration,
          skillsAcquired: opp.skillsAcquired,

          eligibility: {
            targetCategories: opp.targetCategories,
            genderEligibility: opp.genderEligibility,
            minimumAge: opp.minimumAge,
            maximumAge: opp.maximumAge,
            minimumEducation: opp.minimumEducation,
            incomeLimit: opp.incomeLimit,
            employmentType: opp.employmentType
          },

          feesAndBenefits: {
            courseFee: opp.courseFee,
            freeForSc: opp.freeForSc,
            stipendAvailable: opp.stipendAvailable,
            certificateProvided: opp.certificateProvided,
            placementAvailable: opp.placementAvailable
          },

          trainingCenter: {
            mode: opp.mode,
            trainingCenterId: opp.trainingCenterId,
            centerName: opp.centerName,
            centerType: opp.centerType,
            address: opp.address,
            state: opp.state,
            stateCode: opp.stateCode,
            district: opp.district,
            districtCode: opp.districtCode,
            block: opp.block,
            gramPanchayat: opp.gramPanchayat,
            village: opp.village,
            pincode: opp.pincode,
            latitude: opp.latitude,
            longitude: opp.longitude,
            phone: opp.phone,
            email: opp.email,
            centerWebsite: opp.centerWebsite
          },

          scheme: {
            schemeId: opp.schemeId,
            schemeName: opp.schemeName,
            department: opp.department,
            schemeOfficialUrl: opp.schemeOfficialUrl,
            providerId: opp.providerId,
            providerName: opp.providerName,
            providerType: opp.providerType,
            providerWebsite: opp.providerWebsite
          },

          availability: {
            batchId: opp.batchId,
            batchStatus: opp.batchStatus,
            batchStartDate: opp.batchStartDate,
            batchEndDate: opp.batchEndDate,
            classTiming: opp.classTiming,
            daysPerWeek: opp.daysPerWeek,
            seatsTotal: opp.seatsTotal,
            seatsAvailable: opp.seatsAvailable,
            registrationOpen: opp.registrationOpen,
            registrationDeadline: opp.registrationDeadline
          },

          source: {
            applicationUrl: opp.applicationUrl,
            sourceName: opp.sourceName,
            sourceUrl: opp.sourceUrl,
            lastVerifiedDate: opp.lastVerifiedDate,
            verificationStatus: opp.verificationStatus
          },

          mode: opp.mode,
          centerName: opp.centerName,
          state: opp.state,
          district: opp.district,
          latitude: opp.latitude,
          longitude: opp.longitude,
          minimumEducation: opp.minimumEducation,
          minimumAge: opp.minimumAge,
          maximumAge: opp.maximumAge,
          genderEligibility: opp.genderEligibility,
          freeForSc: opp.freeForSc,
          stipendAvailable: opp.stipendAvailable,
          placementAvailable: opp.placementAvailable,
          registrationOpen: opp.registrationOpen,
          applicationUrl: opp.applicationUrl,
          sourceUrl: opp.sourceUrl
        }
      },
      upsert: true
    }
  }));

  const result = await Course.bulkWrite(bulkOps);
  console.log(`[CourseSeeder] Successfully synced ${opps.length} courses to MongoDB (Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}).`);
  return opps.length;
}

// Allow standalone execution: `node src/seeders/seedCourses.js`
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedCourses();
      await disconnectDB();
      console.log('[CourseSeeder] Database seeding completed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('[CourseSeeder] Error during course seeding:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedCourses };
