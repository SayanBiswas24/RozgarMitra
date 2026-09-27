const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const recommendationService = require('./recommendationService');

class TrainingService {
  constructor() {
    this._datasetPath = path.join(__dirname, '..', 'dataset', 'SC_Training_Complete_All_Tabs.xlsx');
    this._opportunities = [];
    this._categories = ['All'];
    this._initialized = false;
  }

  /**
   * Helper to clean Excel cell values into real data or null.
   * Ensures missing/sentinel indicators ('—', '-', '–', '\ufffd', 'null', 'n/a', '')
   * never display as false text or misleading values.
   */
  _cleanVal(val) {
    if (val === null || val === undefined) return null;
    let s = String(val).trim();
    if (
      s === '' ||
      s === '—' ||
      s === '-' ||
      s === '–' ||
      s === '\ufffd' ||
      s.toLowerCase() === 'null' ||
      s.toLowerCase() === 'undefined' ||
      s.toLowerCase() === 'n/a'
    ) {
      return null;
    }
    // Remove ST references and retain SC keyword only
    s = s
      .replace(/Scheduled Caste \(SC\) and Scheduled Tribe \(ST\)/gi, 'Scheduled Caste (SC)')
      .replace(/Scheduled Castes \(SC\) and Scheduled Tribes \(ST\)/gi, 'Scheduled Castes (SC)')
      .replace(/and Scheduled Tribe \(ST\)/gi, '')
      .replace(/and Scheduled Tribes \(ST\)/gi, '')
      .replace(/and Scheduled Tribe/gi, '')
      .replace(/and Scheduled Tribes/gi, '')
      .replace(/or Scheduled Tribe \(ST\)/gi, '')
      .replace(/or Scheduled Tribes \(ST\)/gi, '')
      .replace(/or Scheduled Tribe/gi, '')
      .replace(/or Scheduled Tribes/gi, '')
      .replace(/SC\/ST/g, 'SC')
      .replace(/SC\s*\/\s*ST/g, 'SC')
      .replace(/SC;ST/g, 'SC')
      .replace(/ST;SC/g, 'SC')
      .replace(/;ST\b/g, '')
      .replace(/\bST;/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return s;
  }

  _parseNumber(val) {
    const cleaned = this._cleanVal(val);
    if (cleaned === null) return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }

  _parseFloatCoord(val) {
    const cleaned = this._cleanVal(val);
    if (cleaned === null) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Calculate Haversine distance in kilometers between two geo-coordinates.
   * Returns null if any coordinate is missing or invalid.
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const latA = this._parseFloatCoord(lat1);
    const lonA = this._parseFloatCoord(lon1);
    const latB = this._parseFloatCoord(lat2);
    const lonB = this._parseFloatCoord(lon2);

    if (latA === null || lonA === null || latB === null || lonB === null) {
      return null;
    }

    const R = 6371; // Earth radius in KM
    const dLat = ((latB - latA) * Math.PI) / 180;
    const dLon = ((lonB - lonA) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((latA * Math.PI) / 180) *
      Math.cos((latB * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Loads and validates the real training dataset from the Excel workbook.
   * Caches results in memory for high-performance sub-millisecond retrieval.
   */
  loadDataset() {
    if (this._initialized && this._opportunities.length > 0) {
      return;
    }

    if (!fs.existsSync(this._datasetPath)) {
      throw new Error(`Training dataset file not found at ${this._datasetPath}`);
    }

    const workbook = xlsx.readFile(this._datasetPath);
    const sheetName = 'All Opportunities (68 cols)';
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet '${sheetName}' not found in training dataset workbook.`);
    }

    const rawRows = xlsx.utils.sheet_to_json(worksheet);
    const categorySet = new Set();
    const opportunities = [];

    for (const row of rawRows) {
      const oppId = this._cleanVal(row['Opportunity Id']);
      const courseName = this._cleanVal(row['Course Name']);

      // Ensure minimal valid identity
      if (!oppId || !courseName) {
        continue;
      }

      const sector = this._cleanVal(row['Sector']);
      if (sector) {
        categorySet.add(sector);
      }

      const lat = this._parseFloatCoord(row['Latitude']);
      const lon = this._parseFloatCoord(row['Longitude']);

      // Course description or fallback to scheme description if specific course description is empty
      const courseDesc = this._cleanVal(row['Course Description']);
      const schemeDesc = this._cleanVal(row['Scheme Description']);
      const description = courseDesc || schemeDesc;

      const durationHours = this._parseNumber(row['Duration Hours']);
      let durationStr = null;
      if (durationHours !== null) {
        durationStr = `${durationHours} hours`;
      }

      // Course fee handling: 0 is explicitly free; null is missing
      const rawFee = this._cleanVal(row['Course Fee']);
      let courseFee = null;
      if (rawFee !== null) {
        const feeNum = Number(rawFee);
        courseFee = isNaN(feeNum) ? rawFee : feeNum;
      }

      const opp = {
        id: oppId,
        opportunityId: oppId,
        courseId: this._cleanVal(row['Course Id']),
        courseName: courseName,
        courseDescription: courseDesc,
        schemeDescription: schemeDesc,
        description: description,
        sector: sector,
        subSector: this._cleanVal(row['Sub Sector']),
        jobRole: this._cleanVal(row['Job Role']),
        nsqfLevel: this._parseNumber(row['Nsqf Level']),
        courseType: this._cleanVal(row['Course Type']),
        trainingType: this._cleanVal(row['Training Type']),
        durationHours: durationHours,
        duration: durationStr,
        skillsAcquired: this._cleanVal(row['Skills Acquired']),

        // Eligibility
        targetCategories: this._cleanVal(row['Target Categories']),
        genderEligibility: this._cleanVal(row['Gender Eligibility']),
        minimumAge: this._parseNumber(row['Minimum Age']),
        maximumAge: this._parseNumber(row['Maximum Age']),
        minimumEducation: this._cleanVal(row['Minimum Education']),
        incomeLimit: this._cleanVal(row['Income Limit']),
        employmentType: this._cleanVal(row['Employment Type']),

        // Costs & Benefits
        courseFee: courseFee,
        freeForSc: this._cleanVal(row['Free For Sc']),
        stipendAvailable: this._cleanVal(row['Stipend Available']),
        certificateProvided: this._cleanVal(row['Certificate Provided']),
        placementAvailable: this._cleanVal(row['Placement Available']),

        // Mode & Training Centre
        mode: this._cleanVal(row['Mode']),
        trainingCenterId: this._cleanVal(row['Training Center Id']),
        centerName: this._cleanVal(row['Center Name']),
        centerType: this._cleanVal(row['Center Type']),
        address: this._cleanVal(row['Address']),
        state: this._cleanVal(row['State']),
        stateCode: this._cleanVal(row['State Code']),
        district: this._cleanVal(row['District']),
        districtCode: this._cleanVal(row['District Code']),
        block: this._cleanVal(row['Block']),
        gramPanchayat: this._cleanVal(row['Gram Panchayat']),
        village: this._cleanVal(row['Village']),
        pincode: this._cleanVal(row['Pincode']),
        latitude: lat,
        longitude: lon,
        phone: this._cleanVal(row['Phone']),
        email: this._cleanVal(row['Email']),
        centerWebsite: this._cleanVal(row['Center Website']),

        // Scheme & Provider
        schemeId: this._cleanVal(row['Scheme Id']),
        schemeName: this._cleanVal(row['Scheme Name']),
        department: this._cleanVal(row['Department']),
        schemeOfficialUrl: this._cleanVal(row['Scheme Official Url']),
        providerId: this._cleanVal(row['Provider Id']),
        providerName: this._cleanVal(row['Provider Name']),
        providerType: this._cleanVal(row['Provider Type']),
        providerWebsite: this._cleanVal(row['Provider Website']),

        // Availability & Batch
        batchId: this._cleanVal(row['Batch Id']),
        batchStatus: this._cleanVal(row['Batch Status']),
        batchStartDate: this._cleanVal(row['Batch Start Date']),
        batchEndDate: this._cleanVal(row['Batch End Date']),
        classTiming: this._cleanVal(row['Class Timing']),
        daysPerWeek: this._parseNumber(row['Days Per Week']),
        seatsTotal: this._parseNumber(row['Seats Total']),
        seatsAvailable: this._parseNumber(row['Seats Available']),
        registrationOpen: this._cleanVal(row['Registration Open']),
        registrationDeadline: this._cleanVal(row['Registration Deadline']),

        // Source & Actions
        applicationUrl: this._cleanVal(row['Application Url']),
        sourceName: this._cleanVal(row['Source Name']),
        sourceUrl: this._cleanVal(row['Source Url']),
        lastVerifiedDate: this._cleanVal(row['Last Verified Date']),
        verificationStatus: this._cleanVal(row['Verification Status']),

        // Frontend convenience properties
        title: courseName,
        category: sector || 'General',
        type: this._cleanVal(row['Course Type']) === 'ENTERPRISE' ? 'Enterprise' : 'Skill Training'
      };

      opportunities.push(opp);
    }

    this._opportunities = opportunities;
    this._categories = ['All', ...Array.from(categorySet).sort()];
    this._initialized = true;
    console.log(`[TrainingService] Loaded ${this._opportunities.length} opportunities across ${this._categories.length - 1} sectors.`);
  }

  /**
   * Get all distinct sectors / categories from the dataset
   */
  getCategories() {
    this.loadDataset();
    return this._categories;
  }

  /**
   * Filter, search, compute distance, and paginate training opportunities
   */
  getOpportunities(options = {}) {
    this.loadDataset();

    const {
      page = 1,
      limit = 20,
      search,
      category,
      sector,
      mode,
      state,
      district,
      userLat,
      userLon,
      mobilityRadius,
      education,
      skills,
      interests,
      userProfile,
      enableRecommendations = true
    } = options;

    let filtered = [...this._opportunities];

    // 1. Search Query Filter (Course Name, Job Role, Sector, Skills, Center, District, State)
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((opp) => {
        return (
          (opp.courseName && opp.courseName.toLowerCase().includes(q)) ||
          (opp.jobRole && opp.jobRole.toLowerCase().includes(q)) ||
          (opp.sector && opp.sector.toLowerCase().includes(q)) ||
          (opp.skillsAcquired && opp.skillsAcquired.toLowerCase().includes(q)) ||
          (opp.centerName && opp.centerName.toLowerCase().includes(q)) ||
          (opp.district && opp.district.toLowerCase().includes(q)) ||
          (opp.state && opp.state.toLowerCase().includes(q)) ||
          (opp.providerName && opp.providerName.toLowerCase().includes(q))
        );
      });
    }

    // 2. Category / Sector Filter
    const activeCategory = category || sector;
    if (activeCategory && activeCategory !== 'All') {
      const catLower = activeCategory.trim().toLowerCase();
      filtered = filtered.filter(
        (opp) => opp.sector && opp.sector.toLowerCase() === catLower
      );
    }

    // 3. Mode Filter (HYBRID, OFFLINE)
    if (mode && mode !== 'All') {
      const modeLower = mode.trim().toLowerCase();
      filtered = filtered.filter(
        (opp) => opp.mode && opp.mode.toLowerCase() === modeLower
      );
    }

    // 4. State Filter
    if (state && state.trim().length > 0) {
      const stLower = state.trim().toLowerCase();
      filtered = filtered.filter(
        (opp) => opp.state && opp.state.toLowerCase() === stLower
      );
    }

    // 5. District Filter
    if (district && district.trim().length > 0) {
      const distLower = district.trim().toLowerCase();
      filtered = filtered.filter(
        (opp) => opp.district && opp.district.toLowerCase() === distLower
      );
    }

    // 6. Geographic Distance Calculation
    const uLat = this._parseFloatCoord(userLat);
    const uLon = this._parseFloatCoord(userLon);
    const hasUserCoords = uLat !== null && uLon !== null;

    filtered = filtered.map((opp) => {
      let distanceKm = null;
      if (hasUserCoords && opp.latitude !== null && opp.longitude !== null) {
        distanceKm = this.calculateDistance(uLat, uLon, opp.latitude, opp.longitude);
      }
      return {
        ...opp,
        distanceKm
      };
    });

    // 7. Travel Radius Filtering (Only applied when coordinates exist and mobilityRadius specified)
    if (hasUserCoords && mobilityRadius && Number(mobilityRadius) > 0) {
      const radiusKm = Number(mobilityRadius);
      filtered = filtered.filter((opp) => {
        if (opp.distanceKm !== null) {
          return opp.distanceKm <= radiusKm;
        }
        return true;
      });
    }

    // 8. Sorting:
    if (!enableRecommendations) {
      // Pure Nearest Distance / Proximity sorting (used by Opportunities Near You)
      filtered.sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== null && b.distanceKm === null) return -1;
        if (a.distanceKm === null && b.distanceKm !== null) return 1;

        const aReg = a.registrationOpen === 'Yes' ? 1 : 0;
        const bReg = b.registrationOpen === 'Yes' ? 1 : 0;
        if (bReg !== aReg) return bReg - aReg;

        return 0;
      });
    } else {
      // Recommendation Scoring & Profile Relevance Matching (used by Training Screen)
      const effectiveProfile = userProfile || (education || skills || interests ? {
        education,
        skills: Array.isArray(skills) ? skills : (skills ? [skills] : []),
        interests: Array.isArray(interests) ? interests : (interests ? [interests] : []),
        district: district || null,
        state: state || null
      } : null);

      if (!effectiveProfile) {
        // User is logged out: normal courses shown without recommendation badges
        filtered = filtered.map((opp) => ({
          ...opp,
          isRecommended: false,
          recommendationScore: 0.0,
          recommendationReasons: []
        }));

        filtered.sort((a, b) => {
          if (a.distanceKm !== null && b.distanceKm !== null) {
            return a.distanceKm - b.distanceKm;
          }
          if (a.distanceKm !== null && b.distanceKm === null) return -1;
          if (a.distanceKm === null && b.distanceKm !== null) return 1;

          const aReg = a.registrationOpen === 'Yes' ? 1 : 0;
          const bReg = b.registrationOpen === 'Yes' ? 1 : 0;
          if (bReg !== aReg) return bReg - aReg;

          return 0;
        });
      } else {
        // User is logged in: Recommendation scoring
        filtered = recommendationService.scoreOpportunities(
          filtered,
          effectiveProfile,
          hasUserCoords ? { latitude: uLat, longitude: uLon } : null
        );

        // Sorting Priority: Recommended courses first, ranked by recommendationScore descending
        filtered.sort((a, b) => {
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;

          const aScore = a.recommendationScore || 0;
          const bScore = b.recommendationScore || 0;
          if (Math.abs(bScore - aScore) > 0.05) {
            return bScore - aScore;
          }

          if (a.distanceKm !== null && b.distanceKm !== null) {
            return a.distanceKm - b.distanceKm;
          }
          if (a.distanceKm !== null && b.distanceKm === null) return -1;
          if (a.distanceKm === null && b.distanceKm !== null) return 1;

          const aReg = a.registrationOpen === 'Yes' ? 1 : 0;
          const bReg = b.registrationOpen === 'Yes' ? 1 : 0;
          if (bReg !== aReg) return bReg - aReg;

          return 0;
        });
      }
    }

    // 9. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = filtered.slice(startIndex, startIndex + limitNum);

    return {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: totalPages,
      opportunities: paginatedItems
    };
  }

  /**
   * Get single course details by Opportunity Id with structured sections.
   */
  getOpportunityById(id, userCoords = null) {
    this.loadDataset();

    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();

    const found = this._opportunities.find(
      (opp) =>
        opp.id.toLowerCase() === cleanId ||
        opp.opportunityId.toLowerCase() === cleanId ||
        (opp.courseId && opp.courseId.toLowerCase() === cleanId)
    );

    if (!found) return null;

    let distanceKm = null;
    if (userCoords && userCoords.latitude && userCoords.longitude) {
      distanceKm = this.calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        found.latitude,
        found.longitude
      );
    }

    return {
      ...found,
      distanceKm,
      // Structured sections as requested in Specification #6
      course: {
        id: found.id,
        courseId: found.courseId,
        courseName: found.courseName,
        jobRole: found.jobRole,
        courseDescription: found.courseDescription,
        schemeDescription: found.schemeDescription,
        description: found.description,
        sector: found.sector,
        subSector: found.subSector,
        nsqfLevel: found.nsqfLevel,
        courseType: found.courseType,
        trainingType: found.trainingType,
        durationHours: found.durationHours,
        duration: found.duration,
        skillsAcquired: found.skillsAcquired
      },
      eligibility: {
        targetCategories: found.targetCategories,
        minimumAge: found.minimumAge,
        maximumAge: found.maximumAge,
        minimumEducation: found.minimumEducation,
        incomeLimit: found.incomeLimit,
        genderEligibility: found.genderEligibility,
        employmentType: found.employmentType
      },
      feesAndBenefits: {
        courseFee: found.courseFee,
        freeForSc: found.freeForSc,
        stipendAvailable: found.stipendAvailable,
        certificateProvided: found.certificateProvided,
        placementAvailable: found.placementAvailable
      },
      training: {
        mode: found.mode,
        trainingCenterId: found.trainingCenterId,
        centerName: found.centerName,
        centerType: found.centerType,
        providerId: found.providerId,
        providerName: found.providerName,
        providerType: found.providerType,
        providerWebsite: found.providerWebsite,
        state: found.state,
        stateCode: found.stateCode,
        district: found.district,
        districtCode: found.districtCode,
        block: found.block,
        gramPanchayat: found.gramPanchayat,
        village: found.village,
        pincode: found.pincode,
        latitude: found.latitude,
        longitude: found.longitude,
        phone: found.phone,
        email: found.email,
        centerWebsite: found.centerWebsite,
        address: found.address
      },
      availability: {
        batchId: found.batchId,
        batchStatus: found.batchStatus,
        batchStartDate: found.batchStartDate,
        batchEndDate: found.batchEndDate,
        classTiming: found.classTiming,
        daysPerWeek: found.daysPerWeek,
        seatsTotal: found.seatsTotal,
        seatsAvailable: found.seatsAvailable,
        registrationOpen: found.registrationOpen,
        registrationDeadline: found.registrationDeadline
      },
      source: {
        schemeId: found.schemeId,
        schemeName: found.schemeName,
        department: found.department,
        schemeDescription: found.schemeDescription,
        schemeOfficialUrl: found.schemeOfficialUrl,
        sourceName: found.sourceName,
        sourceUrl: found.sourceUrl,
        applicationUrl: found.applicationUrl,
        lastVerifiedDate: found.lastVerifiedDate,
        verificationStatus: found.verificationStatus
      }
    };
  }

  /**
   * Get featured opportunities near a user for the Home screen
   * Prioritizes nearest proximity: User District -> User State.
   * Does NOT show courses from other states.
   * Does NOT use profile recommendation scoring (pure physical proximity only).
   */
  getNearYou({ userLat, userLon, district, state, limit = 3 } = {}) {
    this.loadDataset();

    // 1. Try District level if district is present
    if (district && district.trim().length > 0) {
      const distResult = this.getOpportunities({
        userLat,
        userLon,
        district: district.trim(),
        limit,
        enableRecommendations: false
      });
      if (distResult.opportunities && distResult.opportunities.length > 0) {
        return distResult.opportunities;
      }
    }

    // 2. Fallback to State level if state is present
    if (state && state.trim().length > 0) {
      const stateResult = this.getOpportunities({
        userLat,
        userLon,
        state: state.trim(),
        limit,
        enableRecommendations: false
      });
      if (stateResult.opportunities && stateResult.opportunities.length > 0) {
        return stateResult.opportunities;
      }
    }

    // 3. Fallback if state/district not provided at all (e.g. unauthenticated guest)
    if (!state && !district) {
      const fallbackResult = this.getOpportunities({
        userLat,
        userLon,
        limit,
        enableRecommendations: false
      });
      return fallbackResult.opportunities;
    }

    // If user has a district/state but no courses exist in their state, do NOT show other states
    return [];
  }
}

module.exports = new TrainingService();
