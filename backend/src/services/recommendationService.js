const {
  EDUCATION_ENUM,
  normalizeEducation,
  OCCUPATION_ENUM,
  normalizeOccupation,
  SKILL_ENUM,
  normalizeSkill,
  INTEREST_ENUM,
  normalizeInterest
} = require('../constants/profileEnums');

/**
 * Configurable Weights for Course Recommendation Engine
 * Total sum = 1.0 (100%)
 */
const RECOMMENDATION_WEIGHTS = {
  education: 0.25,      // 25%
  skills: 0.20,         // 20%
  interests: 0.20,      // 20%
  occupation: 0.15,     // 15%
  workPreference: 0.15, // 15%
  location: 0.05        // 5%
};

/**
 * Educational qualification hierarchy levels for eligibility and scoring
 */
const EDUCATION_LEVELS = {
  NONE: 0,
  CLASS_8: 1,
  CLASS_10: 2,
  CLASS_12: 3,
  DIPLOMA_ITI: 3,
  DEGREE: 4
};

/**
 * Maps keywords to known skill categories for robust semantic matching
 */
const SKILL_KEYWORDS_MAP = {
  [SKILL_ENUM.BASIC_COMPUTER]: ['computer', 'software', 'it', 'typing', 'digital', 'pc', 'ms office', 'internet', 'data entry'],
  [SKILL_ENUM.MS_OFFICE]: ['office', 'excel', 'word', 'powerpoint', 'spreadsheet', 'data entry'],
  [SKILL_ENUM.COMMUNICATION]: ['communication', 'english', 'customer', 'speaking', 'call center', 'bpo', 'crm'],
  [SKILL_ENUM.BASIC_ENGLISH]: ['english', 'communication', 'language', 'speaking'],
  [SKILL_ENUM.DRIVING]: ['driving', 'driver', 'auto', 'vehicle', 'transport', 'chauffeur'],
  [SKILL_ENUM.ELECTRICAL_REPAIR]: ['electric', 'electrician', 'wiring', 'appliances', 'power', 'circuit', 'solar', 'electronic'],
  [SKILL_ENUM.PLUMBING]: ['plumb', 'pipe', 'sanitary', 'drainage', 'fitting'],
  [SKILL_ENUM.CARPENTRY]: ['carpentry', 'wood', 'furniture', 'joinery'],
  [SKILL_ENUM.MASONRY]: ['mason', 'brick', 'construction', 'concrete', 'building', 'plaster'],
  [SKILL_ENUM.TAILORING]: ['tailor', 'stitching', 'garment', 'sewing', 'apparel', 'textile', 'clothing', 'fashion'],
  [SKILL_ENUM.STITCHING]: ['stitch', 'tailor', 'sewing', 'garment', 'apparel', 'textile'],
  [SKILL_ENUM.MOBILE_REPAIR]: ['mobile', 'repair', 'smartphone', 'electronics', 'hardware', 'servicing', 'telecom'],
  [SKILL_ENUM.HANDICRAFT]: ['handicraft', 'craft', 'artisan', 'bamboo', 'pottery', 'embroidery', 'weaving', 'handloom'],
  [SKILL_ENUM.AGRICULTURE]: ['agri', 'farm', 'crop', 'organic', 'soil', 'irrigation', 'dairy', 'horticulture', 'mushroom', 'cultivation'],
  [SKILL_ENUM.SALES]: ['sales', 'retail', 'selling', 'marketing', 'store', 'cashier'],
  [SKILL_ENUM.CUSTOMER_SERVICE]: ['customer', 'service', 'client', 'support', 'hospitality', 'helpdesk', 'front desk'],
  [SKILL_ENUM.DIGITAL_MARKETING]: ['digital marketing', 'social media', 'online marketing', 'seo', 'advertising', 'graphic']
};

/**
 * Maps interests to domain and sector keywords
 */
const INTEREST_KEYWORDS_MAP = {
  [INTEREST_ENUM.TECHNOLOGY]: ['it & ites', 'it-ites', 'it', 'technology', 'computer', 'software', 'telecom', 'media & entertainment', 'digital'],
  [INTEREST_ENUM.ELECTRICAL_WORK]: ['electronics', 'electrical', 'power', 'electronic', 'repair'],
  [INTEREST_ENUM.SOLAR_ENERGY]: ['green jobs', 'solar', 'renewable energy', 'solar panel', 'renewable'],
  [INTEREST_ENUM.CONSTRUCTION]: ['construction', 'infrastructure', 'building', 'masonry', 'plumbing'],
  [INTEREST_ENUM.AGRICULTURE]: ['agriculture', 'farming', 'food processing', 'dairy', 'horticulture', 'animal husbandry', 'mushroom'],
  [INTEREST_ENUM.HEALTHCARE]: ['healthcare', 'health', 'medical', 'nursing', 'patient care', 'paramedical', 'hospital'],
  [INTEREST_ENUM.EDUCATION]: ['education', 'training', 'teaching'],
  [INTEREST_ENUM.RETAIL]: ['retail', 'sales', 'logistics', 'store', 'merchandising', 'commerce'],
  [INTEREST_ENUM.BUSINESS]: ['business', 'retail', 'commerce', 'trade', 'management', 'store'],
  [INTEREST_ENUM.ENTREPRENEURSHIP]: ['management', 'entrepreneurship', 'business', 'enterprise', 'micro-enterprise', 'self employment'],
  [INTEREST_ENUM.HANDICRAFTS]: ['handicrafts', 'textile', 'apparel', 'handloom', 'leather', 'gems & jewellery', 'artisan'],
  [INTEREST_ENUM.BEAUTY_WELLNESS]: ['beauty & wellness', 'beauty', 'spa', 'cosmetology', 'hair', 'wellness'],
  [INTEREST_ENUM.AUTOMOBILE]: ['automotive', 'automobile', 'auto', 'vehicle', 'driving', 'mechanic'],
  [INTEREST_ENUM.DIGITAL_SERVICES]: ['it & ites', 'digital', 'computer', 'data entry', 'graphic', 'web'],
  [INTEREST_ENUM.CREATIVE_WORK]: ['media & entertainment', 'animation', 'design', 'craft', 'textile', 'fashion']
};

class RecommendationService {
  constructor() {
    this.weights = RECOMMENDATION_WEIGHTS;
  }

  /**
   * Robust keyword matching that avoids false substring hits on short words (e.g. 'it' inside 'Locksmith' or 'Recognition')
   */
  _matchKeyword(text, keyword) {
    if (!text || !keyword) return false;
    const kw = keyword.toLowerCase().trim();
    if (kw.length <= 3) {
      const regex = new RegExp('(?:^|[^a-zA-Z0-9])' + kw + '(?:[^a-zA-Z0-9]|$)', 'i');
      return regex.test(text);
    }
    return text.toLowerCase().includes(kw);
  }

  /**
   * Parse educational requirement into an ordinal level (0 to 4)
   */
  _parseEducationLevel(eduStr) {
    if (!eduStr) return EDUCATION_LEVELS.NONE;
    const str = String(eduStr).trim().toUpperCase();

    if (str.includes('DEGREE') || str.includes('GRADUAT') || str.includes('POST GRAD') || str.includes('BACHELOR')) {
      return EDUCATION_LEVELS.DEGREE;
    }
    if (str.includes('12') || str.includes('INTERMEDIATE') || str.includes('HIGHER SECONDARY') || str.includes('ITI') || str.includes('DIPLOMA')) {
      return EDUCATION_LEVELS.CLASS_12;
    }
    if (str.includes('10') || str.includes('MATRIC') || str.includes('SECONDARY')) {
      return EDUCATION_LEVELS.CLASS_10;
    }
    if (str.includes('8') || str.includes('MIDDLE')) {
      return EDUCATION_LEVELS.CLASS_8;
    }
    if (str.includes('5') || str.includes('PRIMARY') || str.includes('BELOW 10') || str.includes('NON') || str.includes('NONE') || str.includes('LITERATE')) {
      return EDUCATION_LEVELS.NONE;
    }
    return EDUCATION_LEVELS.NONE;
  }

  /**
   * Check strict eligibility criteria against course requirements
   * Returns { isEligible: boolean, ineligibilityReason: string|null }
   */
  checkEligibility(userProfile, course) {
    if (!userProfile) {
      return { isEligible: true, ineligibilityReason: null };
    }

    // 1. Education Eligibility Check
    if (userProfile.education && course.minimumEducation) {
      const userLevel = this._parseEducationLevel(userProfile.education);
      const courseMinLevel = this._parseEducationLevel(course.minimumEducation);

      if (userLevel < courseMinLevel) {
        return {
          isEligible: false,
          ineligibilityReason: `Requires minimum education: ${course.minimumEducation}`
        };
      }
    }

    // 2. Age Eligibility Check
    if (typeof userProfile.age === 'number' && userProfile.age > 0) {
      if (course.minimumAge && userProfile.age < course.minimumAge) {
        return {
          isEligible: false,
          ineligibilityReason: `Requires minimum age of ${course.minimumAge} years`
        };
      }
      if (course.maximumAge && userProfile.age > course.maximumAge) {
        return {
          isEligible: false,
          ineligibilityReason: `Maximum age limit is ${course.maximumAge} years`
        };
      }
    }

    // 3. Gender Eligibility Check
    if (userProfile.gender && course.genderEligibility) {
      const gCourse = course.genderEligibility.trim().toLowerCase();
      const gUser = userProfile.gender.trim().toLowerCase();

      if (gCourse.includes('female') || gCourse.includes('women')) {
        if (gUser.startsWith('m') && !gUser.startsWith('mix')) {
          return {
            isEligible: false,
            ineligibilityReason: 'Course is reserved for female candidates'
          };
        }
      }
    }

    return { isEligible: true, ineligibilityReason: null };
  }

  /**
   * Calculates multidimensional relevance score (0.0 - 1.0) and generates explanatory reasons
   */
  calculateRelevance(userProfile, course, userCoords = null) {
    if (!userProfile) {
      return {
        score: 0.0,
        reasons: [],
        breakdown: {}
      };
    }

    let reasons = [];
    let hasProfileData = false;

    // --- 1. Education Fit (25%) ---
    let eduScore = 0.5; // Neutral baseline
    if (userProfile.education) {
      hasProfileData = true;
      const userLevel = this._parseEducationLevel(userProfile.education);
      const courseMinLevel = this._parseEducationLevel(course.minimumEducation);

      if (courseMinLevel === EDUCATION_LEVELS.NONE) {
        eduScore = 0.85;
      } else if (userLevel === courseMinLevel) {
        eduScore = 1.0;
        reasons.push(`Perfect match for your ${userProfile.education} qualification`);
      } else if (userLevel > courseMinLevel) {
        eduScore = 0.80;
      } else {
        eduScore = 0.0;
      }
    }

    // --- 2. Skills Match (20%) ---
    let skillsScore = 0.0;
    const userSkills = Array.isArray(userProfile.skills) ? userProfile.skills : [];
    if (userSkills.length > 0) {
      hasProfileData = true;
      const courseText = [
        course.skillsAcquired || '',
        course.courseName || '',
        course.jobRole || '',
        course.description || ''
      ].join(' ').toLowerCase();

      let matchedSkills = [];
      for (const skill of userSkills) {
        const norm = normalizeSkill(skill) || skill;
        const keywords = SKILL_KEYWORDS_MAP[norm] || [skill.toLowerCase()];

        const matched = keywords.some((kw) => this._matchKeyword(courseText, kw));
        if (matched) {
          matchedSkills.push(skill);
        }
      }

      if (matchedSkills.length > 0) {
        const matchRatio = matchedSkills.length / userSkills.length;
        skillsScore = Math.min(1.0, 0.4 + 0.6 * matchRatio);
        reasons.push(`Matches your skill in ${matchedSkills[0]}`);
      } else {
        skillsScore = 0.2; // Small base if no direct skill match
      }
    } else {
      skillsScore = 0.5; // Neutral if user hasn't specified skills
    }

    // --- 3. Interests Match (20%) ---
    let interestsScore = 0.0;
    const userInterests = Array.isArray(userProfile.interests) ? userProfile.interests : [];
    if (userInterests.length > 0) {
      hasProfileData = true;
      const courseDomainText = [
        course.sector || '',
        course.subSector || '',
        course.jobRole || '',
        course.courseName || ''
      ].join(' ').toLowerCase();

      let matchedInterests = [];
      for (const interest of userInterests) {
        const norm = normalizeInterest(interest) || interest;
        const keywords = INTEREST_KEYWORDS_MAP[norm] || [interest.toLowerCase()];

        const matched = keywords.some((kw) => this._matchKeyword(courseDomainText, kw));
        if (matched) {
          matchedInterests.push(interest);
        }
      }

      if (matchedInterests.length > 0) {
        interestsScore = 1.0;
        reasons.push(`Matches your interest in ${matchedInterests[0]}`);
      } else {
        interestsScore = 0.15;
      }
    } else {
      interestsScore = 0.5;
    }

    // --- 4. Current Occupation Fit (15%) ---
    let occScore = 0.5;
    if (userProfile.occupation) {
      hasProfileData = true;
      const occNorm = normalizeOccupation(userProfile.occupation) || userProfile.occupation;
      const sectorLower = (course.sector || '').toLowerCase();
      const courseNameLower = (course.courseName || '').toLowerCase();
      const placementAvail = course.placementAvailable === 'Yes';
      const isEnterprise = course.courseType === 'ENTERPRISE';

      switch (occNorm) {
        case OCCUPATION_ENUM.STUDENT:
          if (placementAvail || sectorLower.includes('it') || sectorLower.includes('health') || sectorLower.includes('media')) {
            occScore = 1.0;
            reasons.push('High employability course suitable for students');
          } else {
            occScore = 0.75;
          }
          break;

        case OCCUPATION_ENUM.UNEMPLOYED:
          if (placementAvail || course.stipendAvailable === 'Yes') {
            occScore = 1.0;
            reasons.push('Includes placement support and stipends for job seekers');
          } else {
            occScore = 0.70;
          }
          break;

        case OCCUPATION_ENUM.SELF_EMPLOYED:
        case OCCUPATION_ENUM.BUSINESS_OWNER:
          if (isEnterprise || sectorLower.includes('management') || sectorLower.includes('handicraft') || sectorLower.includes('apparel') || sectorLower.includes('agriculture')) {
            occScore = 1.0;
            reasons.push('Relevant for business expansion & enterprise building');
          } else {
            occScore = 0.60;
          }
          break;

        case OCCUPATION_ENUM.FARMER:
          if (sectorLower.includes('agri') || sectorLower.includes('green') || sectorLower.includes('solar') || courseNameLower.includes('farm') || courseNameLower.includes('crop')) {
            occScore = 1.0;
            reasons.push('Directly enhances modern farming & agri-income');
          } else {
            occScore = 0.40;
          }
          break;

        case OCCUPATION_ENUM.DAILY_WAGE_WORKER:
          if (sectorLower.includes('construct') || sectorLower.includes('electr') || sectorLower.includes('plumb') || sectorLower.includes('auto') || sectorLower.includes('solar')) {
            occScore = 1.0;
            reasons.push('Technical vocational trade with skill certification');
          } else {
            occScore = 0.60;
          }
          break;

        case OCCUPATION_ENUM.HOMEMAKER:
          if (sectorLower.includes('apparel') || sectorLower.includes('beauty') || sectorLower.includes('handicraft') || sectorLower.includes('food') || sectorLower.includes('it')) {
            occScore = 1.0;
            reasons.push('Flexible & high-demand livelihood skill');
          } else {
            occScore = 0.60;
          }
          break;

        default:
          occScore = 0.70;
          break;
      }
    }

    // --- 5. Work Preference Alignment (15%) ---
    let prefScore = 0.5;
    const workPref = (userProfile.workPreference || userProfile.workTypePreference || '').toUpperCase();
    if (workPref) {
      hasProfileData = true;
      const isEnterprise = course.courseType === 'ENTERPRISE';
      const placementAvail = course.placementAvailable === 'Yes';
      const empType = (course.employmentType || '').toLowerCase();

      if (workPref.includes('JOB') || workPref.includes('WAGE')) {
        if (placementAvail || empType.includes('wage') || empType.includes('job')) {
          prefScore = 1.0;
          reasons.push('Matches preference for wage employment');
        } else if (!isEnterprise) {
          prefScore = 0.8;
        } else {
          prefScore = 0.4;
        }
      } else if (workPref.includes('SELF') || workPref.includes('ENTREPRENEUR')) {
        if (isEnterprise || empType.includes('self')) {
          prefScore = 1.0;
          reasons.push('Matches preference for self-employment & enterprise');
        } else {
          prefScore = 0.7;
        }
      } else if (workPref.includes('APPRENTICE')) {
        prefScore = course.nsqfLevel >= 3 ? 1.0 : 0.8;
      } else if (workPref.includes('FREELANCE')) {
        prefScore = (course.mode === 'HYBRID' || (course.sector && course.sector.toLowerCase().includes('it'))) ? 1.0 : 0.7;
      } else {
        prefScore = 0.8;
      }
    }

    // --- 6. Location Alignment (5%) ---
    let locScore = 0.2; // Default fallback for other state
    if (userProfile.district && course.district) {
      if (userProfile.district.trim().toLowerCase() === course.district.trim().toLowerCase()) {
        locScore = 1.0;
        reasons.push(`Located near your district (${course.district})`);
      } else if (userProfile.state && course.state && userProfile.state.trim().toLowerCase() === course.state.trim().toLowerCase()) {
        locScore = 0.6;
      }
    } else if (userProfile.state && course.state && userProfile.state.trim().toLowerCase() === course.state.trim().toLowerCase()) {
      locScore = 0.6;
    }

    if (course.distanceKm !== null && course.distanceKm !== undefined) {
      locScore = Math.max(0.1, 1.0 - (course.distanceKm / 500.0));
    }

    // Calculate weighted aggregate score
    const weightedTotal =
      (eduScore * this.weights.education) +
      (skillsScore * this.weights.skills) +
      (interestsScore * this.weights.interests) +
      (occScore * this.weights.occupation) +
      (prefScore * this.weights.workPreference) +
      (locScore * this.weights.location);

    return {
      score: parseFloat(weightedTotal.toFixed(3)),
      reasons: reasons.slice(0, 3), // Return top 3 strongest human-readable reasons
      hasProfileData,
      breakdown: {
        education: eduScore,
        skills: skillsScore,
        interests: interestsScore,
        occupation: occScore,
        workPreference: prefScore,
        location: locScore
      }
    };
  }

  /**
   * Evaluates all opportunities for a user, assigning recommendation badges and scores.
   * Limits isRecommended to at most 5 to 6 top recommended courses.
   */
  scoreOpportunities(opportunities, userProfile, userCoords = null, maxRecommendations = 6) {
    if (!opportunities || opportunities.length === 0) return [];

    // If user is not logged in (userProfile is null/undefined):
    // Do NOT show recommendations. Return all normal courses without isRecommended flag.
    if (!userProfile) {
      return opportunities.map((opp) => ({
        ...opp,
        isEligible: true,
        ineligibilityReason: null,
        recommendationScore: 0.0,
        hasProfileData: false,
        recommendationReasons: [],
        isRecommended: false
      }));
    }

    const evaluated = opportunities.map((opp) => {
      const eligibility = this.checkEligibility(userProfile, opp);
      const relevance = eligibility.isEligible
        ? this.calculateRelevance(userProfile, opp, userCoords)
        : { score: 0.0, reasons: [], hasProfileData: false, breakdown: {} };

      return {
        ...opp,
        isEligible: eligibility.isEligible,
        ineligibilityReason: eligibility.ineligibilityReason,
        recommendationScore: relevance.score,
        hasProfileData: relevance.hasProfileData,
        recommendationReasons: relevance.reasons
      };
    });

    // Identify top 5 to 6 highest-scoring eligible recommendations for logged-in user
    let candidateRecs = evaluated
      .filter((opp) => opp.isEligible && opp.hasProfileData && opp.recommendationScore >= 0.40)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, maxRecommendations);

    // If logged-in user has an unconfigured profile: recommend top eligible programs
    if (candidateRecs.length === 0) {
      candidateRecs = evaluated
        .filter((opp) => opp.isEligible)
        .slice(0, maxRecommendations);

      candidateRecs.forEach((opp) => {
        if (!opp.recommendationReasons || opp.recommendationReasons.length === 0) {
          opp.recommendationReasons = ['Recommended for your skill development journey'];
        }
      });
    }

    const recommendedIdSet = new Set(candidateRecs.map((opp) => opp.id));

    return evaluated.map((opp) => ({
      ...opp,
      isRecommended: recommendedIdSet.has(opp.id)
    }));
  }
}

module.exports = new RecommendationService();
