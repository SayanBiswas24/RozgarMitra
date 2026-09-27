const User = require('../models/User');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { logAudit } = require('../utils/auditLogger');
const {
  EDUCATION_ENUM,
  EDUCATION_LIST,
  EDUCATION_LABELS,
  normalizeEducation,
  OCCUPATION_ENUM,
  OCCUPATION_LIST,
  OCCUPATION_LABELS,
  normalizeOccupation,
  SKILL_ENUM,
  SKILL_LIST,
  SKILL_LABELS,
  normalizeSkill,
  INTEREST_ENUM,
  INTEREST_LIST,
  INTEREST_LABELS,
  normalizeInterest
} = require('../constants/profileEnums');

/**
 * Opportunities Catalog for Training & Livelihood Recommendations
 * Directly mirrors the domains, categories, and duration in the Rojgar Mitra / Kaushal Saathi application.
 */
const OPPORTUNITIES_CATALOG = [
  {
    id: 'opp-1',
    title: 'Tailoring & Stitching',
    category: 'Services',
    description: 'Learn basic tailoring, stitching and garment-making skills for self-employment or textile units.',
    duration: '3 months',
    type: 'Skill Training',
    requiredMinEducation: 'None',
    keywords: ['tailoring', 'stitching', 'garment', 'sewing', 'clothing', 'fashion', 'handicrafts'],
    district: 'Patna',
    coordinates: { latitude: 25.5941, longitude: 85.1376 }
  },
  {
    id: 'opp-2',
    title: 'Modern Farming & Crop Management',
    category: 'Farming',
    description: 'Learn modern farming techniques, drip irrigation, and ways to improve agricultural yield and income.',
    duration: '2 months',
    type: 'Skill Training',
    requiredMinEducation: 'None',
    keywords: ['farming', 'agriculture', 'crops', 'organic', 'soil', 'irrigation', 'dairy'],
    district: 'Vaishali',
    coordinates: { latitude: 25.684, longitude: 85.2238 }
  },
  {
    id: 'opp-3',
    title: 'Mobile Phone & Hardware Repair',
    category: 'Technical',
    description: 'Learn smartphone diagnostics, screen replacement, and basic electronic servicing.',
    duration: '4 months',
    type: 'Skill Training',
    requiredMinEducation: '8th Pass',
    keywords: ['mobile', 'repair', 'electronics', 'phone', 'hardware', 'technical', 'gadgets'],
    district: 'Muzaffarpur',
    coordinates: { latitude: 26.1209, longitude: 85.3647 }
  },
  {
    id: 'opp-4',
    title: 'Small Business & Micro-Enterprise Basics',
    category: 'Business',
    description: 'Learn bookkeeping, micro-credit access, local market selling, and managing a village store or enterprise.',
    duration: '1 month',
    type: 'Enterprise',
    requiredMinEducation: 'None',
    keywords: ['business', 'shop', 'retail', 'enterprise', 'finance', 'selling', 'trading'],
    district: 'Gaya',
    coordinates: { latitude: 24.7914, longitude: 85.0002 }
  },
  {
    id: 'opp-5',
    title: 'Electrician & Home Wiring Training',
    category: 'Technical',
    description: 'Build practical skills for domestic electrical installation, safety, and repair.',
    duration: '3 months',
    type: 'Skill Training',
    requiredMinEducation: '8th Pass',
    keywords: ['electrician', 'wiring', 'appliances', 'power', 'technical', 'repair'],
    district: 'Patna',
    coordinates: { latitude: 25.61, longitude: 85.14 }
  },
  {
    id: 'opp-6',
    title: 'Solar Panel Installation & Maintenance',
    category: 'Technical',
    description: 'Practical training on rooftop solar assembly, battery maintenance, and green energy servicing.',
    duration: '3 months',
    type: 'Skill Training',
    requiredMinEducation: '10th Pass',
    keywords: ['solar', 'energy', 'installation', 'technical', 'electrician', 'green energy'],
    district: 'Nalanda',
    coordinates: { latitude: 25.1979, longitude: 85.5179 }
  },
  {
    id: 'opp-7',
    title: 'General Duty Healthcare Assistant',
    category: 'Services',
    description: 'Learn patient care, elder care assistance, basic first aid, and community healthcare support.',
    duration: '6 months',
    type: 'Skill Training',
    requiredMinEducation: '10th Pass',
    keywords: ['health', 'nursing', 'care', 'hospital', 'medical', 'services', 'patient'],
    district: 'Patna',
    coordinates: { latitude: 25.59, longitude: 85.12 }
  },
  {
    id: 'opp-8',
    title: 'Mushroom Cultivation & Organic Value-Addition',
    category: 'Farming',
    description: 'High-income low-investment mushroom farming and post-harvest packaging for local markets.',
    duration: '1.5 months',
    type: 'Enterprise',
    requiredMinEducation: 'None',
    keywords: ['mushroom', 'organic', 'farming', 'food processing', 'horticulture', 'agriculture'],
    district: 'Samastipur',
    coordinates: { latitude: 25.8629, longitude: 85.7811 }
  }
];

/**
 * Profile & Recommendation Service
 * Responsible for Profile completion progress, Prediction readiness, and Recommendation matching.
 */
class ProfileService {
  /**
   * Pincode Lookup via India Post API + Nominatim Geocoding
   * Source of truth for Village, Block, District, State, and genuine coordinates
   */
  static async lookupPincode(pincode) {
    const cleanPin = String(pincode || '').trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      const err = new Error('Invalid Pincode format: Must be exactly a 6-digit Indian postal code starting with 1-9.');
      err.statusCode = 400;
      throw err;
    }

    let postalData = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const postRes = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (postRes.ok) {
        const json = await postRes.json();
        if (
          Array.isArray(json) &&
          json[0] &&
          json[0].Status === 'Success' &&
          Array.isArray(json[0].PostOffice) &&
          json[0].PostOffice.length > 0
        ) {
          postalData = json[0].PostOffice;
        }
      }
    } catch (e) {
      // Postal service failure will be checked below
    }

    if (!postalData || postalData.length === 0) {
      const err = new Error(`Pincode ${cleanPin} not found or no postal records available.`);
      err.statusCode = 404;
      throw err;
    }

    const first = postalData[0];
    const state = first.State || null;
    const district = first.District || null;
    const block = first.Block && first.Block !== 'NA' ? first.Block : first.Taluk && first.Taluk !== 'NA' ? first.Taluk : district;
    const villages = Array.from(new Set(postalData.map((p) => p.Name).filter(Boolean)));
    const village = villages[0] || null;

    // Fetch coordinates via Nominatim (OpenStreetMap)
    // Never fabricate coordinates. If unavailable or invalid, return null.
    let coordinates = { latitude: null, longitude: null };
    try {
      const geoController = new AbortController();
      const geoTimeout = setTimeout(() => geoController.abort(), 5000);
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=json`,
        {
          signal: geoController.signal,
          headers: {
            'User-Agent': 'RojgarMitra/1.0 (contact@rojgarmitra.gov.in)',
            Accept: 'application/json'
          }
        }
      );
      clearTimeout(geoTimeout);

      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        if (Array.isArray(geoJson) && geoJson.length > 0 && geoJson[0].lat && geoJson[0].lon) {
          const lat = parseFloat(geoJson[0].lat);
          const lon = parseFloat(geoJson[0].lon);
          if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            coordinates = { latitude: lat, longitude: lon };
          }
        }
      }
    } catch (e) {
      // Nominatim failed or timed out: preserve null coordinates as required
      coordinates = { latitude: null, longitude: null };
    }

    return {
      pincode: cleanPin,
      state,
      district,
      block,
      village,
      villages,
      coordinates
    };
  }

  /**
   * Weights defined in backend configuration for calculating profile completion
   * Basic Info: 20% (awarded on registration)
   * Education: 15%
   * Current Occupation: 15%
   * Skills: 15%
   * Location: 15%
   * Interests: 10%
   * Work Preferences: 10%
   * Total = 100%
   */
  static SECTION_WEIGHTS = {
    basicInfo: 20,
    education: 15,
    occupation: 15,
    skills: 15,
    location: 15,
    interests: 10,
    workPreferences: 10
  };

  /**
   * Calculate Profile Completion Progress
   * @param {object} user - User document
   * @returns {{ completionPercentage: number, status: string, completedSections: string[], missingSections: string[] }}
   */
  static calculateProfileProgress(user) {
    let score = 0;
    const completedSections = [];
    const missingSections = [];

    // 1. Basic Info (Name, email, phone) - 20%
    if (user.name && (user.email || user.phone)) {
      score += this.SECTION_WEIGHTS.basicInfo;
      completedSections.push('basicInfo');
    } else {
      missingSections.push('basicInfo');
    }

    // 2. Education - 15%
    if (user.profile?.education && String(user.profile.education).trim() !== '') {
      score += this.SECTION_WEIGHTS.education;
      completedSections.push('education');
    } else {
      missingSections.push('education');
    }

    // 3. Current Occupation - 15%
    if (
      (user.profile?.occupation_type && String(user.profile.occupation_type).trim() !== '') ||
      (user.profile?.occupation && String(user.profile.occupation).trim() !== '')
    ) {
      score += this.SECTION_WEIGHTS.occupation;
      completedSections.push('occupation');
    } else {
      missingSections.push('occupation');
    }

    // 4. Skills - 15% (skills or other_skills)
    const hasSkills =
      (Array.isArray(user.profile?.skills) && user.profile.skills.length > 0) ||
      (Array.isArray(user.profile?.other_skills) && user.profile.other_skills.length > 0);
    if (hasSkills) {
      score += this.SECTION_WEIGHTS.skills;
      completedSections.push('skills');
    } else {
      missingSections.push('skills');
    }

    // 5. Location - 15% (Pincode, District, or State)
    if (
      user.profile?.location?.pincode ||
      user.profile?.location?.district ||
      user.profile?.location?.state
    ) {
      score += this.SECTION_WEIGHTS.location;
      completedSections.push('location');
    } else {
      missingSections.push('location');
    }

    // 6. Interests - 10% (interests or other_interests)
    const hasInterests =
      (Array.isArray(user.profile?.interests) && user.profile.interests.length > 0) ||
      (Array.isArray(user.profile?.other_interests) && user.profile.other_interests.length > 0);
    if (hasInterests) {
      score += this.SECTION_WEIGHTS.interests;
      completedSections.push('interests');
    } else {
      missingSections.push('interests');
    }

    // 7. Work Preferences - 10%
    if (
      user.profile?.workPreferences?.workTypePreference ||
      user.profile?.workPreferences?.travelPreference ||
      (typeof user.profile?.workPreferences?.mobility_radius_km === 'number' &&
        user.profile.workPreferences.mobility_radius_km > 0)
    ) {
      score += this.SECTION_WEIGHTS.workPreferences;
      completedSections.push('workPreferences');
    } else {
      missingSections.push('workPreferences');
    }

    const completionPercentage = Math.min(100, Math.round(score));

    // Determine lifecycle status
    let status = 'NOT_STARTED';
    if (completionPercentage >= 100) {
      status = 'COMPLETE';
    } else if (completionPercentage >= 65) {
      status = 'PROFILE_READY';
    } else if (completionPercentage >= 35) {
      status = 'PARTIALLY_COMPLETE';
    } else if (completionPercentage > 0) {
      status = 'STARTED';
    }

    return {
      completionPercentage,
      status,
      completedSections,
      missingSections
    };
  }

  /**
   * Calculate Prediction Readiness Level
   * Separate from overall profile % - requires relevant prediction information.
   */
  static calculatePredictionReadiness(user) {
    const missingFields = [];
    let predictionPoints = 0;

    // Skills or Interests (30 pts)
    const hasSkills =
      (Array.isArray(user.profile?.skills) && user.profile.skills.length > 0) ||
      (Array.isArray(user.profile?.other_skills) && user.profile.other_skills.length > 0);
    const hasInterests =
      (Array.isArray(user.profile?.interests) && user.profile.interests.length > 0) ||
      (Array.isArray(user.profile?.other_interests) && user.profile.other_interests.length > 0);

    if (hasSkills || hasInterests) {
      predictionPoints += 30;
      if (hasSkills && hasInterests) {
        predictionPoints += 10; // Bonus for having both
      }
    } else {
      missingFields.push('skills or interests');
    }

    // Education (25 pts)
    if (user.profile?.education && String(user.profile.education).trim() !== '') {
      predictionPoints += 25;
    } else {
      missingFields.push('education');
    }

    // Location (20 pts)
    if (
      user.profile?.location?.pincode ||
      user.profile?.location?.district ||
      user.profile?.location?.state
    ) {
      predictionPoints += 20;
    } else {
      missingFields.push('location');
    }

    // Occupation (15 pts)
    if (
      (user.profile?.occupation_type && String(user.profile.occupation_type).trim() !== '') ||
      (user.profile?.occupation && String(user.profile.occupation).trim() !== '')
    ) {
      predictionPoints += 15;
    }

    // Can recommend if minimum essential fields exist
    const hasLocation = !!(
      user.profile?.location?.pincode ||
      user.profile?.location?.district ||
      user.profile?.location?.state
    );
    const canRecommend = (hasSkills || hasInterests) && hasLocation;

    let readiness = 'INSUFFICIENT';
    if (predictionPoints >= 80) {
      readiness = 'HIGH';
    } else if (predictionPoints >= 60) {
      readiness = 'MODERATE';
    } else if (predictionPoints >= 40) {
      readiness = 'BASIC';
    }

    return {
      readiness,
      canRecommend,
      predictionScore: predictionPoints,
      missingFields,
      lastCalculatedAt: new Date()
    };
  }

  /**
   * Calculate Haversine distance in kilometers between two lat/lon coordinates
   */
  static calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Run Recommendation Engine based on user profile
   * Scores and returns matched training opportunities and livelihood options.
   * Uses BOTH the curated catalog AND the real training dataset for nearest-course matching.
   * @param {object} user 
   * @returns {Array<object>} Recommended opportunities
   */
  static generateRecommendations(user) {
    const rawSkills = [
      ...(user.profile?.skills || []).map((s) => SKILL_LABELS[s] || s),
      ...(user.profile?.other_skills || [])
    ];
    const userSkills = rawSkills.map((s) => String(s).toLowerCase());

    const rawInterests = [
      ...(user.profile?.interests || []).map((i) => INTEREST_LABELS[i] || i),
      ...(user.profile?.other_interests || [])
    ];
    const userInterests = rawInterests.map((i) => String(i).toLowerCase());

    const userOccupation = (
      user.profile?.occupation_other ||
      OCCUPATION_LABELS[user.profile?.occupation_type] ||
      user.profile?.occupation ||
      ''
    ).toLowerCase();

    const userEducation = user.profile?.education || '';
    const userWorkPreference = (user.profile?.workPreferences?.workTypePreference || '').toLowerCase();
    const userDistrict = user.profile?.location?.district || 'Nearby Centers';
    const userLat = user.profile?.location?.coordinates?.latitude;
    const userLon = user.profile?.location?.coordinates?.longitude;
    const userMobility = user.profile?.workPreferences?.mobility_radius_km;
    const userPincode = user.profile?.location?.pincode;
    const userState = user.profile?.location?.state;

    // --- Part 1: Curated catalog recommendations (existing logic) ---
    const catalogScored = OPPORTUNITIES_CATALOG.map((opp) => {
      let score = 30; // Base baseline score
      const reasons = [];

      // Check keywords against skills
      const skillMatches = opp.keywords.filter((kw) => userSkills.some((s) => s.includes(kw) || kw.includes(s)));
      if (skillMatches.length > 0) {
        score += 35;
        reasons.push(`Matches your skills in ${skillMatches.join(', ')}`);
      }

      // Check keywords against interests
      const interestMatches = opp.keywords.filter((kw) => userInterests.some((i) => i.includes(kw) || kw.includes(i)));
      if (interestMatches.length > 0) {
        score += 25;
        reasons.push(`Aligns with your interest in ${opp.category}`);
      }

      // Check occupation alignment
      if (userOccupation && opp.keywords.some((kw) => userOccupation.includes(kw))) {
        score += 15;
        reasons.push(`Relevant to your current work background`);
      }

      // Check education eligibility criteria
      if (opp.requiredMinEducation === '10th Pass') {
        if (userEducation === EDUCATION_ENUM.NON_EDUCATED) {
          score -= 10;
        } else if (
          userEducation === EDUCATION_ENUM.CLASS_10 ||
          userEducation === EDUCATION_ENUM.CLASS_12 ||
          userEducation === EDUCATION_ENUM.DEGREE
        ) {
          score += 10;
          reasons.push('Meets educational eligibility criteria');
        }
      }

      // Check work type preference alignment (e.g. Enterprise vs Skill Training)
      if (userWorkPreference && opp.type.toLowerCase().includes(userWorkPreference)) {
        score += 10;
        reasons.push(`Matches your preference for ${opp.type}`);
      }

      // Offline/Hybrid distance calculation (only when genuine coordinates exist, never fabricate)
      if (
        typeof userLat === 'number' &&
        typeof userLon === 'number' &&
        opp.coordinates?.latitude &&
        opp.coordinates?.longitude
      ) {
        const distKm = ProfileService.calculateDistanceKm(
          userLat,
          userLon,
          opp.coordinates.latitude,
          opp.coordinates.longitude
        );
        if (typeof userMobility === 'number') {
          if (distKm <= userMobility) {
            score += 15;
            reasons.push(`Within your travel radius (${distKm} km away)`);
          } else {
            score -= 15;
            reasons.push(`Center is ${distKm} km away (outside your preferred ${userMobility} km radius)`);
          }
        } else {
          reasons.push(`Center is ${distKm} km away`);
        }
      } else if (opp.district && userDistrict.toLowerCase() === opp.district.toLowerCase()) {
        score += 10;
        reasons.push(`Located in your district (${opp.district})`);
      }

      if (reasons.length === 0) {
        reasons.push(`In-demand training opportunity in ${userDistrict}`);
      }

      return {
        title: opp.title,
        category: opp.category,
        description: opp.description,
        duration: opp.duration,
        type: opp.type,
        matchScore: Math.min(98, Math.max(10, score)),
        reasoning: reasons.join('. ') + '.',
        source: 'curated'
      };
    });

    // --- Part 2: Real dataset nearest-course recommendations ---
    let datasetScored = [];
    try {
      const trainingService = require('./trainingService');
      trainingService.loadDataset();

      // Get opportunities filtered by user's state/district and sorted by distance
      const datasetResult = trainingService.getOpportunities({
        page: 1,
        limit: 50,
        state: userState || undefined,
        userLat: userLat || undefined,
        userLon: userLon || undefined,
        mobilityRadius: userMobility || undefined
      });

      const seenTitles = new Set();

      for (const opp of datasetResult.opportunities) {
        // Skip duplicates by course name
        const normTitle = (opp.courseName || '').toLowerCase().trim();
        if (seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);

        let score = 25; // Base score for real dataset entries
        const reasons = [];

        // District match bonus
        if (opp.district && userDistrict && opp.district.toLowerCase() === userDistrict.toLowerCase()) {
          score += 20;
          reasons.push(`Located in your district (${opp.district})`);
        }

        // State match bonus
        if (opp.state && userState && opp.state.toLowerCase() === userState.toLowerCase()) {
          score += 5;
        }

        // Pincode match — strongest proximity signal
        if (opp.pincode && userPincode && opp.pincode === userPincode) {
          score += 25;
          reasons.push(`In your pincode area (${opp.pincode})`);
        }

        // Distance bonus
        if (opp.distanceKm !== null && opp.distanceKm !== undefined) {
          if (opp.distanceKm <= 10) {
            score += 20;
            reasons.push(`Very close to you (${opp.distanceKm} km)`);
          } else if (opp.distanceKm <= 30) {
            score += 15;
            reasons.push(`Nearby (${opp.distanceKm} km away)`);
          } else if (opp.distanceKm <= 50) {
            score += 10;
            reasons.push(`${opp.distanceKm} km from your location`);
          } else {
            reasons.push(`${opp.distanceKm} km away`);
          }
        }

        // Skills matching with course name, sector, skills acquired
        const courseText = [opp.courseName, opp.sector, opp.skillsAcquired, opp.jobRole]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const skillHits = userSkills.filter((s) => s && courseText.includes(s));
        if (skillHits.length > 0) {
          score += 20;
          reasons.push(`Matches your skills`);
        }

        const interestHits = userInterests.filter((i) => i && courseText.includes(i));
        if (interestHits.length > 0) {
          score += 15;
          reasons.push(`Aligns with your interests`);
        }

        // Registration open bonus
        if (opp.registrationOpen === 'Yes') {
          score += 5;
          reasons.push('Registration is open');
        }

        if (reasons.length === 0) {
          reasons.push(`Training opportunity${opp.district ? ` in ${opp.district}` : ''}`);
        }

        datasetScored.push({
          title: opp.courseName,
          category: opp.sector || opp.category || 'General',
          description: opp.description || opp.courseDescription || `${opp.courseName} training program`,
          duration: opp.duration || (opp.durationHours ? `${opp.durationHours} hours` : null),
          type: opp.courseType === 'ENTERPRISE' ? 'Enterprise' : 'Skill Training',
          matchScore: Math.min(98, Math.max(10, score)),
          reasoning: reasons.join('. ') + '.',
          source: 'dataset'
        });
      }
    } catch (e) {
      // If training dataset is not available, proceed with catalog only
      console.warn('[ProfileService] Could not load training dataset for recommendations:', e.message);
    }

    // --- Merge and deduplicate ---
    const allScored = [...catalogScored, ...datasetScored];

    // Remove dataset entries that duplicate catalog titles
    const catalogTitles = new Set(catalogScored.map((o) => o.title.toLowerCase()));
    const dedupedAll = allScored.filter((o) => {
      if (o.source === 'dataset' && catalogTitles.has(o.title.toLowerCase())) {
        return false;
      }
      return true;
    });

    // Sort by match score descending and take top 6
    return dedupedAll
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6)
      .map(({ source, ...rest }) => rest); // Strip internal 'source' field
  }

  /**
   * Get complete user profile structured for the frontend
   * Source of truth for Profile, About You, Your Progress, and Recommendations.
   */
  static async getCompleteProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    // Calculate real-time progress & prediction readiness
    const progress = this.calculateProfileProgress(user);
    const prediction = this.calculatePredictionReadiness(user);

    const edu = user.profile?.education || null;
    const eduNorm = normalizeEducation(edu);
    const eduLabel = eduNorm ? EDUCATION_LABELS[eduNorm] : edu || null;

    const occType =
      user.profile?.occupation_type ||
      (user.profile?.occupation ? normalizeOccupation(user.profile.occupation) : null);
    const occOther = user.profile?.occupation_other || null;
    const occLabel =
      occType === OCCUPATION_ENUM.OTHER && occOther
        ? occOther
        : (occType && OCCUPATION_LABELS[occType]) || user.profile?.occupation || null;

    // Format About You section strictly with actual saved data or null
    const aboutYou = {
      education: edu,
      educationEnum: eduNorm,
      educationLabel: eduLabel,
      occupation: user.profile?.occupation || null,
      occupation_type: occType,
      occupation_other: occOther,
      occupationLabel: occLabel,
      skills: Array.isArray(user.profile?.skills) ? user.profile.skills : [],
      other_skills: Array.isArray(user.profile?.other_skills) ? user.profile.other_skills : [],
      interests: Array.isArray(user.profile?.interests) ? user.profile.interests : [],
      other_interests: Array.isArray(user.profile?.other_interests) ? user.profile.other_interests : [],
      location: {
        state: user.profile?.location?.state || null,
        district: user.profile?.location?.district || null,
        block: user.profile?.location?.block || null,
        gramPanchayat: user.profile?.location?.gramPanchayat || null,
        village: user.profile?.location?.village || null,
        pincode: user.profile?.location?.pincode || null,
        coordinates: user.profile?.location?.coordinates || { latitude: null, longitude: null }
      }
    };

    const workPreferences = {
      workTypePreference: user.profile?.workPreferences?.workTypePreference || null,
      travelPreference: user.profile?.workPreferences?.travelPreference || null,
      mobility_radius_km: user.profile?.workPreferences?.mobility_radius_km ?? null
    };

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        status: user.status
      },
      aboutYou,
      workPreferences,
      progress,
      prediction
    };
  }

  /**
   * Update profile progressively
   * Allows users to incrementally add Education, Occupation, Skills, Interests, Location, etc.
   */
  static async updateProgressiveProfile(userId, updateData, req = null) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    // Safe field whitelisting
    if (updateData.name && typeof updateData.name === 'string') {
      user.name = updateData.name.trim();
    }
    if (updateData.phone && typeof updateData.phone === 'string') {
      const phoneExists = await User.findOne({ phone: updateData.phone.trim(), _id: { $ne: user._id } });
      if (phoneExists) {
        const err = new Error('Phone number is already associated with another account.');
        err.statusCode = 409;
        throw err;
      }
      user.phone = updateData.phone.trim();
    }

    // Ensure profile subdocument exists
    if (!user.profile) {
      user.profile = {};
    }

    // 1. Education: Controlled enum only
    if (updateData.education !== undefined) {
      if (updateData.education === null || updateData.education === '') {
        user.profile.education = null;
      } else {
        const rawEdu = String(updateData.education).trim();
        const normEdu = normalizeEducation(rawEdu);
        if (!normEdu || !EDUCATION_LIST.includes(normEdu)) {
          const err = new Error(
            `Invalid education value '${rawEdu}'. Allowed values: ${EDUCATION_LIST.join(', ')}`
          );
          err.statusCode = 400;
          throw err;
        }
        user.profile.education = normEdu;
      }
    }

    // 2. Occupation: Controlled enum + validated Other text
    if (updateData.occupation_type !== undefined || updateData.occupation !== undefined) {
      const rawOcc = updateData.occupation_type !== undefined ? updateData.occupation_type : updateData.occupation;
      if (rawOcc === null || rawOcc === '') {
        user.profile.occupation_type = null;
        user.profile.occupation_other = null;
        user.profile.occupation = null;
      } else {
        const rawStr = String(rawOcc).trim();
        const normOcc = normalizeOccupation(rawStr);
        if (!normOcc || !OCCUPATION_LIST.includes(normOcc)) {
          const err = new Error(
            `Invalid occupation value '${rawStr}'. Allowed values: ${OCCUPATION_LIST.join(', ')}`
          );
          err.statusCode = 400;
          throw err;
        }
        user.profile.occupation_type = normOcc;

        if (normOcc === OCCUPATION_ENUM.OTHER) {
          const customOther =
            updateData.occupation_other !== undefined
              ? String(updateData.occupation_other || '').trim()
              : updateData.occupation && !OCCUPATION_LIST.includes(String(updateData.occupation).toUpperCase())
              ? String(updateData.occupation).trim()
              : '';
          if (customOther.length > 100) {
            const err = new Error('Custom occupation exceeds maximum length of 100 characters.');
            err.statusCode = 400;
            throw err;
          }
          user.profile.occupation_other = customOther || null;
          user.profile.occupation = customOther || 'Other';
        } else {
          user.profile.occupation_other = null;
          user.profile.occupation = OCCUPATION_LABELS[normOcc] || normOcc;
        }
      }
    } else if (updateData.occupation_other !== undefined) {
      if (user.profile.occupation_type === OCCUPATION_ENUM.OTHER) {
        const customOther = String(updateData.occupation_other || '').trim();
        if (customOther.length > 100) {
          const err = new Error('Custom occupation exceeds maximum length of 100 characters.');
          err.statusCode = 400;
          throw err;
        }
        user.profile.occupation_other = customOther || null;
        user.profile.occupation = customOther || 'Other';
      }
    }

    // 3. Skills: Controlled enums + separate other_skills (no duplicates)
    if (updateData.skills !== undefined || updateData.other_skills !== undefined) {
      let rawSkills = [];
      if (updateData.skills !== undefined) {
        if (Array.isArray(updateData.skills)) {
          rawSkills = updateData.skills;
        } else if (typeof updateData.skills === 'string') {
          rawSkills = updateData.skills.split(',');
        }
      } else {
        rawSkills = user.profile.skills || [];
      }

      let rawOtherSkills = [];
      if (updateData.other_skills !== undefined) {
        if (Array.isArray(updateData.other_skills)) {
          rawOtherSkills = updateData.other_skills;
        } else if (typeof updateData.other_skills === 'string') {
          rawOtherSkills = updateData.other_skills.split(',');
        }
      } else {
        rawOtherSkills = user.profile.other_skills || [];
      }

      const validatedSkillsSet = new Set();
      const validatedOtherSkillsSet = new Set();

      for (const item of rawSkills) {
        const trimmed = String(item || '').trim();
        if (!trimmed) continue;
        const norm = normalizeSkill(trimmed);
        if (norm && SKILL_LIST.includes(norm)) {
          if (norm !== SKILL_ENUM.OTHER) {
            validatedSkillsSet.add(norm);
          }
        } else {
          const lower = trimmed.toLowerCase();
          const alreadyExists = Array.from(validatedOtherSkillsSet).some((s) => s.toLowerCase() === lower);
          if (!alreadyExists) {
            validatedOtherSkillsSet.add(trimmed.slice(0, 100));
          }
        }
      }

      for (const item of rawOtherSkills) {
        const trimmed = String(item || '').trim();
        if (!trimmed) continue;
        const norm = normalizeSkill(trimmed);
        if (norm && norm !== SKILL_ENUM.OTHER && SKILL_LIST.includes(norm)) {
          validatedSkillsSet.add(norm);
        } else {
          const lower = trimmed.toLowerCase();
          const alreadyExists = Array.from(validatedOtherSkillsSet).some((s) => s.toLowerCase() === lower);
          if (!alreadyExists) {
            validatedOtherSkillsSet.add(trimmed.slice(0, 100));
          }
        }
      }

      user.profile.skills = Array.from(validatedSkillsSet);
      user.profile.other_skills = Array.from(validatedOtherSkillsSet);
    }

    // 4. Interests: Controlled enums + separate other_interests (no duplicates)
    if (updateData.interests !== undefined || updateData.other_interests !== undefined) {
      let rawInterests = [];
      if (updateData.interests !== undefined) {
        if (Array.isArray(updateData.interests)) {
          rawInterests = updateData.interests;
        } else if (typeof updateData.interests === 'string') {
          rawInterests = updateData.interests.split(',');
        }
      } else {
        rawInterests = user.profile.interests || [];
      }

      let rawOtherInterests = [];
      if (updateData.other_interests !== undefined) {
        if (Array.isArray(updateData.other_interests)) {
          rawOtherInterests = updateData.other_interests;
        } else if (typeof updateData.other_interests === 'string') {
          rawOtherInterests = updateData.other_interests.split(',');
        }
      } else {
        rawOtherInterests = user.profile.other_interests || [];
      }

      const validatedInterestsSet = new Set();
      const validatedOtherInterestsSet = new Set();

      for (const item of rawInterests) {
        const trimmed = String(item || '').trim();
        if (!trimmed) continue;
        const norm = normalizeInterest(trimmed);
        if (norm && INTEREST_LIST.includes(norm)) {
          if (norm !== INTEREST_ENUM.OTHER) {
            validatedInterestsSet.add(norm);
          }
        } else {
          const lower = trimmed.toLowerCase();
          const alreadyExists = Array.from(validatedOtherInterestsSet).some((i) => i.toLowerCase() === lower);
          if (!alreadyExists) {
            validatedOtherInterestsSet.add(trimmed.slice(0, 100));
          }
        }
      }

      for (const item of rawOtherInterests) {
        const trimmed = String(item || '').trim();
        if (!trimmed) continue;
        const norm = normalizeInterest(trimmed);
        if (norm && norm !== INTEREST_ENUM.OTHER && INTEREST_LIST.includes(norm)) {
          validatedInterestsSet.add(norm);
        } else {
          const lower = trimmed.toLowerCase();
          const alreadyExists = Array.from(validatedOtherInterestsSet).some((i) => i.toLowerCase() === lower);
          if (!alreadyExists) {
            validatedOtherInterestsSet.add(trimmed.slice(0, 100));
          }
        }
      }

      user.profile.interests = Array.from(validatedInterestsSet);
      user.profile.other_interests = Array.from(validatedOtherInterestsSet);
    }

    // 5. Structured Location: Pincode validation & Autofill integration
    if (updateData.location && typeof updateData.location === 'object') {
      if (!user.profile.location) user.profile.location = {};
      const loc = updateData.location;

      if (loc.pincode !== undefined) {
        if (loc.pincode === null || loc.pincode === '') {
          user.profile.location.pincode = null;
        } else {
          const cleanPin = String(loc.pincode).trim();
          if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
            const err = new Error('Invalid Pincode: Must be a 6-digit Indian postal code starting with 1-9.');
            err.statusCode = 400;
            throw err;
          }
          user.profile.location.pincode = cleanPin;
        }
      }

      if (loc.state !== undefined) user.profile.location.state = loc.state ? String(loc.state).trim() : null;
      if (loc.district !== undefined) user.profile.location.district = loc.district ? String(loc.district).trim() : null;
      if (loc.block !== undefined) user.profile.location.block = loc.block ? String(loc.block).trim() : null;
      if (loc.gramPanchayat !== undefined) user.profile.location.gramPanchayat = loc.gramPanchayat ? String(loc.gramPanchayat).trim() : null;
      if (loc.village !== undefined) user.profile.location.village = loc.village ? String(loc.village).trim() : null;

      // Coordinates validation & assignment
      const inputLat = loc.coordinates?.latitude !== undefined ? loc.coordinates.latitude : loc.latitude;
      const inputLon = loc.coordinates?.longitude !== undefined ? loc.coordinates.longitude : loc.longitude;

      if (inputLat !== undefined || inputLon !== undefined) {
        if (inputLat === null && inputLon === null) {
          user.profile.location.coordinates = { latitude: null, longitude: null };
        } else if (inputLat !== null && inputLon !== null && inputLat !== undefined && inputLon !== undefined) {
          const lat = Number(inputLat);
          const lon = Number(inputLon);
          if (isNaN(lat) || lat < -90 || lat > 90) {
            const err = new Error('Invalid latitude: Must be a numeric value between -90 and 90.');
            err.statusCode = 400;
            throw err;
          }
          if (isNaN(lon) || lon < -180 || lon > 180) {
            const err = new Error('Invalid longitude: Must be a numeric value between -180 and 180.');
            err.statusCode = 400;
            throw err;
          }
          user.profile.location.coordinates = { latitude: lat, longitude: lon };
        }
      }
    }

    // 6. Work Preferences
    if (updateData.workPreferences && typeof updateData.workPreferences === 'object') {
      if (!user.profile.workPreferences) user.profile.workPreferences = {};
      const wp = updateData.workPreferences;
      if (wp.workTypePreference !== undefined) {
        user.profile.workPreferences.workTypePreference = wp.workTypePreference ? String(wp.workTypePreference).trim() : null;
      }
      if (wp.travelPreference !== undefined) {
        user.profile.workPreferences.travelPreference = wp.travelPreference ? String(wp.travelPreference).trim() : null;
      }
      if (wp.mobility_radius_km !== undefined) {
        if (wp.mobility_radius_km === null) {
          user.profile.workPreferences.mobility_radius_km = null;
        } else {
          const radiusNum = Number(wp.mobility_radius_km);
          if (isNaN(radiusNum) || radiusNum <= 0 || radiusNum > 500) {
            const err = new Error(
              'Invalid travel distance: mobility_radius_km must be a positive number between 1 and 500.'
            );
            err.statusCode = 400;
            throw err;
          }
          user.profile.workPreferences.mobility_radius_km = radiusNum;
        }
      }
    }

    // Recalculate progress & readiness
    const progress = this.calculateProfileProgress(user);
    const prediction = this.calculatePredictionReadiness(user);

    user.progress = progress;
    user.prediction = prediction;

    // If prediction is ready, generate and cache recommendations
    if (prediction.canRecommend) {
      user.recommendations = this.generateRecommendations(user);
    }

    await user.save();

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.PROFILE_UPDATED,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        details: { progress: progress.completionPercentage, readiness: prediction.readiness },
        req
      });
    }

    return this.getCompleteProfile(user._id);
  }

  /**
   * Get Recommendations for user
   */
  static async getUserRecommendations(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const prediction = this.calculatePredictionReadiness(user);

    if (!prediction.canRecommend) {
      return {
        ready: false,
        readiness: prediction.readiness,
        missingFields: prediction.missingFields,
        message: 'Please complete your Education, Skills or Interests, and Location to receive personalized recommendations.',
        recommendations: []
      };
    }

    // If recommendations are not cached or stale, generate now
    if (!user.recommendations || user.recommendations.length === 0) {
      user.recommendations = this.generateRecommendations(user);
      await user.save();
    }

    return {
      ready: true,
      readiness: prediction.readiness,
      recommendations: user.recommendations
    };
  }
}

module.exports = ProfileService;
