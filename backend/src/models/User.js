const mongoose = require('mongoose');
const { ROLES, ROLE_LIST } = require('../constants/roles');
const { ACCOUNT_STATUS, ACCOUNT_STATUS_LIST } = require('../constants/accountStatus');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
      match: [/^[0-9+ -]{7,20}$/, 'Please provide a valid phone number']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ROLE_LIST,
        message: 'Invalid role: {VALUE}'
      },
      default: ROLES.USER,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ACCOUNT_STATUS_LIST,
        message: 'Invalid status: {VALUE}'
      },
      default: ACCOUNT_STATUS.ACTIVE,
      index: true
    },

    // --- Progressive Profile Architecture ---
    profile: {
      // 1. Basic Identity
      gender: { type: String, default: null },
      age: { type: Number, default: null },
      preferredLanguage: { type: String, default: 'en' },

      // 2. About You (Frontend Profile Fields)
      education: { type: String, default: null },
      occupation: { type: String, default: null },
      occupation_type: { type: String, default: null },
      occupation_other: { type: String, default: null, trim: true, maxlength: 100 },
      skills: [{ type: String, trim: true }],
      other_skills: [{ type: String, trim: true, maxlength: 100 }],
      interests: [{ type: String, trim: true }],
      other_interests: [{ type: String, trim: true, maxlength: 100 }],

      // 3. Structured Location
      location: {
        pincode: { type: String, default: null, trim: true },
        village: { type: String, default: null, trim: true },
        block: { type: String, default: null, trim: true },
        district: { type: String, default: null, trim: true },
        state: { type: String, default: null, trim: true },
        gramPanchayat: { type: String, default: null, trim: true },
        coordinates: {
          latitude: { type: Number, default: null },
          longitude: { type: Number, default: null }
        }
      },

      // 4. Work Preferences
      workPreferences: {
        workTypePreference: { type: String, default: null },
        travelPreference: { type: String, default: null },
        mobility_radius_km: { type: Number, default: null }
      },

      // For Government Officials
      department: { type: String, default: null },
      designation: { type: String, default: null }
    },

    // --- Backend-Calculated Progress & Readiness (Source of Truth) ---
    progress: {
      completionPercentage: { type: Number, default: 20 },
      status: {
        type: String,
        enum: ['NOT_STARTED', 'STARTED', 'PARTIALLY_COMPLETE', 'PROFILE_READY', 'COMPLETE'],
        default: 'STARTED'
      },
      completedSections: [{ type: String }],
      missingSections: [{ type: String }]
    },

    // --- Prediction & Recommendation Readiness ---
    prediction: {
      readiness: {
        type: String,
        enum: ['INSUFFICIENT', 'BASIC', 'MODERATE', 'HIGH'],
        default: 'INSUFFICIENT'
      },
      canRecommend: { type: Boolean, default: false },
      missingFields: [{ type: String }],
      lastCalculatedAt: { type: Date, default: null }
    },

    // Cached recommendations to avoid expensive re-computations
    recommendations: [
      {
        title: { type: String, required: true },
        category: { type: String, required: true },
        description: { type: String, default: '' },
        duration: { type: String, default: '' },
        type: { type: String, default: 'Skill Training' },
        matchScore: { type: Number, default: 0 },
        reasoning: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Security & Lockout
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Pre-save hook: automatically hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to check password match
userSchema.methods.comparePassword = async function (plainPassword) {
  return comparePassword(plainPassword, this.password);
};

// Instance method to check if account is currently locked out
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

const User = mongoose.model('User', userSchema);

module.exports = User;
