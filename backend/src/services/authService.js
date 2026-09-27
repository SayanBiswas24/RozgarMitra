const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const { ROLES } = require('../constants/roles');
const { ACCOUNT_STATUS } = require('../constants/accountStatus');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { logAudit } = require('../utils/auditLogger');
const {
  generateAccessToken,
  generateSecureRandomToken,
  hashToken,
  validatePasswordStrength
} = require('../utils/tokenUtils');
const env = require('../config/env');

/**
 * Authentication Service
 * Encapsulates core business logic for authentication, security policies, and token lifecycles.
 */
class AuthService {
  /**
   * Register a new user
   * Enforces field whitelisting (mass assignment defense)
   */
  static async registerUser({ name, email, phone, password, education, district, location, profile }, req = null) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      if (req) {
        await logAudit({
          action: AUDIT_ACTIONS.REGISTER_FAILED,
          status: 'FAILURE',
          details: { reason: 'Duplicate email', email: normalizedEmail },
          req
        });
      }
      const err = new Error('An account with this email already exists.');
      err.statusCode = 409;
      throw err;
    }

    // Check duplicate phone if provided
    if (phone) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        const err = new Error('An account with this phone number already exists.');
        err.statusCode = 409;
        throw err;
      }
    }

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      const err = new Error(passwordCheck.message);
      err.statusCode = 400;
      throw err;
    }

    // Whitelist allowed fields only - client can NEVER set role or status
    const initialEducation = education ? String(education).trim() : (profile?.education ? String(profile.education).trim() : null);
    const initialDistrict = district ? String(district).trim() : (profile?.location?.district ? String(profile.location.district).trim() : (typeof profile?.location === 'string' && profile.location ? profile.location.trim() : null));

    // Build structured location from pincode autofill data or legacy district field
    const locationData = {
      pincode: profile?.location?.pincode ? String(profile.location.pincode).trim() : null,
      village: profile?.location?.village ? String(profile.location.village).trim() : null,
      block: profile?.location?.block ? String(profile.location.block).trim() : null,
      district: profile?.location?.district ? String(profile.location.district).trim() : initialDistrict,
      state: profile?.location?.state ? String(profile.location.state).trim() : (profile?.state ? String(profile.state).trim() : (initialDistrict ? 'Bihar' : null)),
      gramPanchayat: profile?.location?.gramPanchayat ? String(profile.location.gramPanchayat).trim() : null,
      coordinates: profile?.location?.coordinates || null
    };

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : undefined,
      password,
      role: ROLES.USER, // Enforced default
      status: ACCOUNT_STATUS.ACTIVE,
      profile: {
        education: initialEducation,
        occupation: profile?.occupation ? String(profile.occupation).trim() : null,
        skills: Array.isArray(profile?.skills) ? profile.skills.map(String) : [],
        interests: Array.isArray(profile?.interests) ? profile.interests.map(String) : [],
        location: locationData,
        workPreferences: {
          workTypePreference: profile?.workPreferences?.workTypePreference || null,
          travelPreference: profile?.workPreferences?.travelPreference || null,
          mobility_radius_km: profile?.workPreferences?.mobility_radius_km ? Number(profile.workPreferences.mobility_radius_km) : null
        },
        preferredLanguage: profile?.preferredLanguage ? String(profile.preferredLanguage) : 'en'
      }
    });

    // Automatically calculate initial progress and prediction readiness
    const ProfileService = require('./profileService');
    user.progress = ProfileService.calculateProfileProgress(user);
    user.prediction = ProfileService.calculatePredictionReadiness(user);

    await user.save();

    // Issue tokens
    const tokens = await this._issueTokenPair(user, req);

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.REGISTER_SUCCESS,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        req
      });
    }

    return { user: user.toJSON(), tokens };
  }

  /**
   * Authenticate user with password and account lockout check
   */
  static async loginUser({ email, password }, req = null) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password +failedLoginAttempts +lockUntil'
    );

    const genericInvalidMsg = 'Invalid email or password.';

    if (!user) {
      if (req) {
        await logAudit({
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          status: 'FAILURE',
          details: { reason: 'User not found', email: normalizedEmail },
          req
        });
      }
      const err = new Error(genericInvalidMsg);
      err.statusCode = 401;
      throw err;
    }

    // Check account lockout
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      const err = new Error(
        `Account is temporarily locked due to excessive failed attempts. Please try again in ${minutesRemaining} minutes.`
      );
      err.statusCode = 423;
      throw err;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account if max attempts reached
      if (user.failedLoginAttempts >= env.MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + env.LOCK_TIME_MS);
        await user.save();

        if (req) {
          await logAudit({
            actor: { userId: user._id, email: user.email, role: user.role },
            action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
            target: { resourceType: 'USER', resourceId: user._id.toString() },
            status: 'FAILURE',
            details: { attempts: user.failedLoginAttempts },
            req
          });
        }

        const err = new Error(
          'Account is temporarily locked due to excessive failed attempts. Please try again in 15 minutes.'
        );
        err.statusCode = 423;
        throw err;
      }

      await user.save();

      if (req) {
        await logAudit({
          actor: { userId: user._id, email: user.email, role: user.role },
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          target: { resourceType: 'USER', resourceId: user._id.toString() },
          status: 'FAILURE',
          details: { failedAttempts: user.failedLoginAttempts },
          req
        });
      }

      const err = new Error(genericInvalidMsg);
      err.statusCode = 401;
      throw err;
    }

    // Check account status
    if (user.status === ACCOUNT_STATUS.SUSPENDED) {
      const err = new Error('Your account is suspended. Please contact support.');
      err.statusCode = 403;
      throw err;
    }
    if (user.status === ACCOUNT_STATUS.BLOCKED) {
      const err = new Error('Your account is blocked.');
      err.statusCode = 403;
      throw err;
    }
    if (user.status === ACCOUNT_STATUS.DEACTIVATED) {
      const err = new Error('Your account has been deactivated.');
      err.statusCode = 403;
      throw err;
    }

    // Reset failed login counter on success
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this._issueTokenPair(user, req);

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        req
      });
    }

    return { user: user.toJSON(), tokens };
  }

  /**
   * Rotate refresh token and issue new token pair
   */
  static async refreshAuthToken(rawToken, req = null) {
    if (!rawToken) {
      const err = new Error('Refresh token is required.');
      err.statusCode = 400;
      throw err;
    }

    const tokenHash = hashToken(rawToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (!tokenDoc) {
      const err = new Error('Invalid refresh token.');
      err.statusCode = 401;
      throw err;
    }

    // Reuse detection: revoked token reuse indicates token theft
    if (tokenDoc.revokedAt) {
      await RefreshToken.updateMany(
        { user: tokenDoc.user, revokedAt: null },
        { revokedAt: new Date() }
      );
      if (req) {
        await logAudit({
          actor: { userId: tokenDoc.user },
          action: AUDIT_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT,
          status: 'FAILURE',
          details: { reason: 'Refresh token reuse detected' },
          req
        });
      }
      const err = new Error('Invalid refresh token. Session terminated.');
      err.statusCode = 401;
      throw err;
    }

    if (tokenDoc.expiresAt < new Date()) {
      const err = new Error('Refresh token has expired. Please log in again.');
      err.statusCode = 401;
      throw err;
    }

    const user = await User.findById(tokenDoc.user);
    if (!user || user.status !== ACCOUNT_STATUS.ACTIVE) {
      const err = new Error('User account is not active.');
      err.statusCode = 403;
      throw err;
    }

    // Token Rotation: Invalidate current token and link to replacement
    const newRawRefreshToken = generateSecureRandomToken();
    const newTokenHash = hashToken(newRawRefreshToken);

    tokenDoc.revokedAt = new Date();
    tokenDoc.replacedByTokenHash = newTokenHash;
    await tokenDoc.save();

    const newRefreshTokenDoc = new RefreshToken({
      tokenHash: newTokenHash,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByIp: req?.ip || req?.socket?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
    await newRefreshTokenDoc.save();

    const newAccessToken = generateAccessToken(user);

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.REFRESH_TOKEN,
        status: 'SUCCESS',
        req
      });
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: env.JWT_EXPIRES_IN
    };
  }

  /**
   * Revoke active refresh token on logout
   */
  static async logoutUser(rawToken, user = null, req = null) {
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
    }

    if (user && req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.LOGOUT,
        status: 'SUCCESS',
        req
      });
    }
  }

  /**
   * Change password with old password verification and token revocation
   */
  static async changeUserPassword(userId, currentPassword, newPassword, req = null) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const err = new Error('Current password is incorrect.');
      err.statusCode = 400;
      throw err;
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      const err = new Error(validation.message);
      err.statusCode = 400;
      throw err;
    }

    user.password = newPassword;
    await user.save();

    // Revoke all existing sessions on password change
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { revokedAt: new Date() }
    );

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        req
      });
    }
  }

  /**
   * Request password reset token
   */
  static async requestPasswordReset(email, req = null) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return null; // Return null so controller returns generic message without leaking email existence
    }

    const rawToken = generateSecureRandomToken(32);
    const tokenHash = hashToken(rawToken);

    // Invalidate prior unused tokens
    await PasswordResetToken.updateMany(
      { user: user._id, usedAt: null },
      { usedAt: new Date() }
    );

    const resetDoc = new PasswordResetToken({
      tokenHash,
      user: user._id,
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MS)
    });
    await resetDoc.save();

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        status: 'SUCCESS',
        req
      });
    }

    return rawToken;
  }

  /**
   * Reset password with valid single-use token
   */
  static async resetUserPassword(token, newPassword, req = null) {
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      const err = new Error(validation.message);
      err.statusCode = 400;
      throw err;
    }

    const tokenHash = hashToken(token);
    const resetDoc = await PasswordResetToken.findOne({ tokenHash });

    if (!resetDoc || !resetDoc.isValid()) {
      const err = new Error('Invalid or expired password reset token.');
      err.statusCode = 400;
      throw err;
    }

    const user = await User.findById(resetDoc.user);
    if (!user) {
      const err = new Error('User account not found.');
      err.statusCode = 400;
      throw err;
    }

    user.password = newPassword;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    resetDoc.usedAt = new Date();
    await resetDoc.save();

    // Revoke all refresh tokens
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { revokedAt: new Date() }
    );

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        req
      });
    }
  }

  /**
   * Helper: Issue access & refresh token pair
   * @private
   */
  static async _issueTokenPair(user, req = null) {
    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateSecureRandomToken();
    const tokenHash = hashToken(rawRefreshToken);

    const refreshTokenDoc = new RefreshToken({
      tokenHash,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByIp: req?.ip || req?.socket?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
    await refreshTokenDoc.save();

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: env.JWT_EXPIRES_IN
    };
  }
}

module.exports = AuthService;
