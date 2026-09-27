const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    // Unique Opportunity & Course Identifiers
    opportunityId: {
      type: String,
      required: [true, 'Opportunity ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    courseId: {
      type: String,
      trim: true,
      index: true,
      default: null
    },

    // Course Core Information
    courseName: {
      type: String,
      required: [true, 'Course Name is required'],
      trim: true,
      index: true
    },
    courseDescription: { type: String, default: null, trim: true },
    schemeDescription: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true },

    sector: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    subSector: { type: String, default: null, trim: true },
    jobRole: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    nsqfLevel: { type: Number, default: null },
    courseType: { type: String, default: null, trim: true },
    trainingType: { type: String, default: null, trim: true },
    durationHours: { type: Number, default: null },
    duration: { type: String, default: null, trim: true },
    skillsAcquired: { type: String, default: null, trim: true },

    // Structured Eligibility
    eligibility: {
      targetCategories: { type: String, default: null, trim: true },
      genderEligibility: { type: String, default: null, trim: true },
      minimumAge: { type: Number, default: null },
      maximumAge: { type: Number, default: null },
      minimumEducation: { type: String, default: null, trim: true },
      incomeLimit: { type: String, default: null, trim: true },
      employmentType: { type: String, default: null, trim: true }
    },

    // Fees, Subsidies & Benefits
    feesAndBenefits: {
      courseFee: { type: mongoose.Schema.Types.Mixed, default: null },
      freeForSc: { type: String, default: null, trim: true },
      stipendAvailable: { type: String, default: null, trim: true },
      certificateProvided: { type: String, default: null, trim: true },
      placementAvailable: { type: String, default: null, trim: true }
    },

    // Training Center & Location
    trainingCenter: {
      mode: { type: String, default: null, trim: true },
      trainingCenterId: { type: String, default: null, trim: true },
      centerName: { type: String, default: null, trim: true },
      centerType: { type: String, default: null, trim: true },
      address: { type: String, default: null, trim: true },
      state: { type: String, default: null, trim: true, index: true },
      stateCode: { type: String, default: null, trim: true },
      district: { type: String, default: null, trim: true, index: true },
      districtCode: { type: String, default: null, trim: true },
      block: { type: String, default: null, trim: true },
      gramPanchayat: { type: String, default: null, trim: true },
      village: { type: String, default: null, trim: true },
      pincode: { type: String, default: null, trim: true, index: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      phone: { type: String, default: null, trim: true },
      email: { type: String, default: null, trim: true },
      centerWebsite: { type: String, default: null, trim: true }
    },

    // Scheme & Provider Metadata
    scheme: {
      schemeId: { type: String, default: null, trim: true },
      schemeName: { type: String, default: null, trim: true },
      department: { type: String, default: null, trim: true },
      schemeOfficialUrl: { type: String, default: null, trim: true },
      providerId: { type: String, default: null, trim: true },
      providerName: { type: String, default: null, trim: true },
      providerType: { type: String, default: null, trim: true },
      providerWebsite: { type: String, default: null, trim: true }
    },

    // Availability & Batch Details
    availability: {
      batchId: { type: String, default: null, trim: true },
      batchStatus: { type: String, default: null, trim: true },
      batchStartDate: { type: String, default: null, trim: true },
      batchEndDate: { type: String, default: null, trim: true },
      classTiming: { type: String, default: null, trim: true },
      daysPerWeek: { type: Number, default: null },
      seatsTotal: { type: Number, default: null },
      seatsAvailable: { type: Number, default: null },
      registrationOpen: { type: String, default: null, trim: true },
      registrationDeadline: { type: String, default: null, trim: true }
    },

    // Source & Verification Tracking
    source: {
      applicationUrl: { type: String, default: null, trim: true },
      sourceName: { type: String, default: null, trim: true },
      sourceUrl: { type: String, default: null, trim: true },
      lastVerifiedDate: { type: String, default: null, trim: true },
      verificationStatus: { type: String, default: null, trim: true }
    },

    // Top-Level Flat Properties for Fast High-Volume Querying & Backward Compatibility
    mode: { type: String, default: null, trim: true },
    centerName: { type: String, default: null, trim: true },
    state: { type: String, default: null, trim: true, index: true },
    district: { type: String, default: null, trim: true, index: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    minimumEducation: { type: String, default: null, trim: true },
    minimumAge: { type: Number, default: null },
    maximumAge: { type: Number, default: null },
    genderEligibility: { type: String, default: null, trim: true },
    freeForSc: { type: String, default: null, trim: true },
    stipendAvailable: { type: String, default: null, trim: true },
    placementAvailable: { type: String, default: null, trim: true },
    registrationOpen: { type: String, default: null, trim: true },
    applicationUrl: { type: String, default: null, trim: true },
    sourceUrl: { type: String, default: null, trim: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound Text Index for fast multi-field full-text search
courseSchema.index(
  {
    courseName: 'text',
    jobRole: 'text',
    sector: 'text',
    skillsAcquired: 'text',
    centerName: 'text',
    district: 'text',
    state: 'text'
  },
  {
    weights: {
      courseName: 10,
      jobRole: 8,
      sector: 5,
      skillsAcquired: 5,
      centerName: 3,
      district: 3,
      state: 2
    },
    name: 'CourseTextIndex'
  }
);

// Location-based compound indexes
courseSchema.index({ state: 1, district: 1 });
courseSchema.index({ sector: 1, registrationOpen: 1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
