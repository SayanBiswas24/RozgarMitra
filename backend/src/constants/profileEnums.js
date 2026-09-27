/**
 * Controlled Enums and Metadata for Profile / About You Workflow
 */

// 1. Controlled Education Options
const EDUCATION_ENUM = {
  NON_EDUCATED: 'NON_EDUCATED',
  CLASS_10: 'CLASS_10',
  CLASS_12: 'CLASS_12',
  DEGREE: 'DEGREE'
};

const EDUCATION_LIST = Object.values(EDUCATION_ENUM);

const EDUCATION_LABELS = {
  [EDUCATION_ENUM.NON_EDUCATED]: 'Non-Educated',
  [EDUCATION_ENUM.CLASS_10]: 'Class 10',
  [EDUCATION_ENUM.CLASS_12]: 'Class 12',
  [EDUCATION_ENUM.DEGREE]: 'Degree'
};

// Backward-compatible normalizer for legacy education strings
function normalizeEducation(val) {
  if (!val) return null;
  const upper = String(val).trim().toUpperCase();
  if (EDUCATION_LIST.includes(upper)) return upper;
  if (upper === '10TH' || upper === '10TH PASS' || upper === 'CLASS 10' || upper === 'MATRIC' || upper === 'MATRICULATION') return EDUCATION_ENUM.CLASS_10;
  if (upper === '12TH' || upper === '12TH PASS' || upper === 'CLASS 12' || upper === 'INTERMEDIATE' || upper === 'HIGHER SECONDARY') return EDUCATION_ENUM.CLASS_12;
  if (upper === 'DEGREE' || upper === 'GRADUATE' || upper === 'GRADUATION' || upper === 'POST GRADUATE' || upper === 'COLLEGE' || upper === 'BACHELOR') {
    return EDUCATION_ENUM.DEGREE;
  }
  if (upper === 'NON-EDUCATED' || upper === 'NON EDUCATED' || upper === 'ILLITERATE' || upper === 'NONE' || upper === 'BELOW 10' || upper === 'BELOW 10TH') {
    return EDUCATION_ENUM.NON_EDUCATED;
  }
  return null;
}

// 2. Controlled Occupation Options
const OCCUPATION_ENUM = {
  STUDENT: 'STUDENT',
  FARMER: 'FARMER',
  DAILY_WAGE_WORKER: 'DAILY_WAGE_WORKER',
  PRIVATE_EMPLOYEE: 'PRIVATE_EMPLOYEE',
  GOVERNMENT_EMPLOYEE: 'GOVERNMENT_EMPLOYEE',
  SELF_EMPLOYED: 'SELF_EMPLOYED',
  BUSINESS_OWNER: 'BUSINESS_OWNER',
  SKILLED_WORKER: 'SKILLED_WORKER',
  UNEMPLOYED: 'UNEMPLOYED',
  HOMEMAKER: 'HOMEMAKER',
  OTHER: 'OTHER'
};

const OCCUPATION_LIST = Object.values(OCCUPATION_ENUM);

const OCCUPATION_LABELS = {
  [OCCUPATION_ENUM.STUDENT]: 'Student',
  [OCCUPATION_ENUM.FARMER]: 'Farmer',
  [OCCUPATION_ENUM.DAILY_WAGE_WORKER]: 'Daily Wage Worker',
  [OCCUPATION_ENUM.PRIVATE_EMPLOYEE]: 'Private Employee',
  [OCCUPATION_ENUM.GOVERNMENT_EMPLOYEE]: 'Government Employee',
  [OCCUPATION_ENUM.SELF_EMPLOYED]: 'Self Employed',
  [OCCUPATION_ENUM.BUSINESS_OWNER]: 'Business Owner',
  [OCCUPATION_ENUM.SKILLED_WORKER]: 'Skilled Worker',
  [OCCUPATION_ENUM.UNEMPLOYED]: 'Unemployed',
  [OCCUPATION_ENUM.HOMEMAKER]: 'Homemaker',
  [OCCUPATION_ENUM.OTHER]: 'Other'
};

function normalizeOccupation(val) {
  if (!val) return null;
  const upper = String(val).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (OCCUPATION_LIST.includes(upper)) return upper;
  if (upper.includes('STUDENT')) return OCCUPATION_ENUM.STUDENT;
  if (upper.includes('FARM')) return OCCUPATION_ENUM.FARMER;
  if (upper.includes('DAILY') || upper.includes('WAGE') || upper.includes('LABOUR')) return OCCUPATION_ENUM.DAILY_WAGE_WORKER;
  if (upper.includes('GOVT') || upper.includes('GOVERNMENT')) return OCCUPATION_ENUM.GOVERNMENT_EMPLOYEE;
  if (upper.includes('PRIVATE') || upper.includes('EMPLOYEE')) return OCCUPATION_ENUM.PRIVATE_EMPLOYEE;
  if (upper.includes('SELF')) return OCCUPATION_ENUM.SELF_EMPLOYED;
  if (upper.includes('BUSINESS') || upper.includes('SHOP')) return OCCUPATION_ENUM.BUSINESS_OWNER;
  if (upper.includes('SKILLED') || upper.includes('TECHNICIAN') || upper.includes('MECHANIC') || upper.includes('CARPENTER') || upper.includes('ELECTRICIAN')) {
    return OCCUPATION_ENUM.SKILLED_WORKER;
  }
  if (upper.includes('UNEMPLOYED') || upper.includes('JOB_SEEKER')) return OCCUPATION_ENUM.UNEMPLOYED;
  if (upper.includes('HOME') || upper.includes('HOUSEWIFE')) return OCCUPATION_ENUM.HOMEMAKER;
  if (upper === 'OTHER') return OCCUPATION_ENUM.OTHER;
  return null;
}

// 3. Controlled Skills Options
const SKILL_ENUM = {
  BASIC_COMPUTER: 'BASIC_COMPUTER',
  MS_OFFICE: 'MS_OFFICE',
  COMMUNICATION: 'COMMUNICATION',
  BASIC_ENGLISH: 'BASIC_ENGLISH',
  DRIVING: 'DRIVING',
  ELECTRICAL_REPAIR: 'ELECTRICAL_REPAIR',
  PLUMBING: 'PLUMBING',
  CARPENTRY: 'CARPENTRY',
  MASONRY: 'MASONRY',
  TAILORING: 'TAILORING',
  STITCHING: 'STITCHING',
  MOBILE_REPAIR: 'MOBILE_REPAIR',
  HANDICRAFT: 'HANDICRAFT',
  AGRICULTURE: 'AGRICULTURE',
  SALES: 'SALES',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE',
  DIGITAL_MARKETING: 'DIGITAL_MARKETING',
  OTHER: 'OTHER'
};

const SKILL_LIST = Object.values(SKILL_ENUM);

const SKILL_LABELS = {
  [SKILL_ENUM.BASIC_COMPUTER]: 'Basic Computer',
  [SKILL_ENUM.MS_OFFICE]: 'MS Office',
  [SKILL_ENUM.COMMUNICATION]: 'Communication',
  [SKILL_ENUM.BASIC_ENGLISH]: 'Basic English',
  [SKILL_ENUM.DRIVING]: 'Driving',
  [SKILL_ENUM.ELECTRICAL_REPAIR]: 'Electrical Repair',
  [SKILL_ENUM.PLUMBING]: 'Plumbing',
  [SKILL_ENUM.CARPENTRY]: 'Carpentry',
  [SKILL_ENUM.MASONRY]: 'Masonry',
  [SKILL_ENUM.TAILORING]: 'Tailoring',
  [SKILL_ENUM.STITCHING]: 'Stitching',
  [SKILL_ENUM.MOBILE_REPAIR]: 'Mobile Repair',
  [SKILL_ENUM.HANDICRAFT]: 'Handicraft',
  [SKILL_ENUM.AGRICULTURE]: 'Agriculture',
  [SKILL_ENUM.SALES]: 'Sales',
  [SKILL_ENUM.CUSTOMER_SERVICE]: 'Customer Service',
  [SKILL_ENUM.DIGITAL_MARKETING]: 'Digital Marketing',
  [SKILL_ENUM.OTHER]: 'Other'
};

function normalizeSkill(val) {
  if (!val) return null;
  const upper = String(val).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (SKILL_LIST.includes(upper)) return upper;
  if (upper.includes('COMPUTER') || upper.includes('IT')) return SKILL_ENUM.BASIC_COMPUTER;
  if (upper.includes('OFFICE') || upper.includes('EXCEL') || upper.includes('WORD')) return SKILL_ENUM.MS_OFFICE;
  if (upper.includes('COMMUNICATION')) return SKILL_ENUM.COMMUNICATION;
  if (upper.includes('ENGLISH')) return SKILL_ENUM.BASIC_ENGLISH;
  if (upper.includes('DRIV')) return SKILL_ENUM.DRIVING;
  if (upper.includes('ELECTRIC') || upper.includes('WIRING')) return SKILL_ENUM.ELECTRICAL_REPAIR;
  if (upper.includes('PLUMB')) return SKILL_ENUM.PLUMBING;
  if (upper.includes('CARPENT')) return SKILL_ENUM.CARPENTRY;
  if (upper.includes('MASON')) return SKILL_ENUM.MASONRY;
  if (upper.includes('TAILOR')) return SKILL_ENUM.TAILORING;
  if (upper.includes('STITCH') || upper.includes('SEWING')) return SKILL_ENUM.STITCHING;
  if (upper.includes('MOBILE') || upper.includes('PHONE')) return SKILL_ENUM.MOBILE_REPAIR;
  if (upper.includes('CRAFT') || upper.includes('HANDICRAFT')) return SKILL_ENUM.HANDICRAFT;
  if (upper.includes('AGRI') || upper.includes('FARM')) return SKILL_ENUM.AGRICULTURE;
  if (upper.includes('SALES')) return SKILL_ENUM.SALES;
  if (upper.includes('CUSTOMER') || upper.includes('SERVICE')) return SKILL_ENUM.CUSTOMER_SERVICE;
  if (upper.includes('MARKETING') || upper.includes('DIGITAL')) return SKILL_ENUM.DIGITAL_MARKETING;
  return null; // Will go into other_skills if custom
}

// 4. Controlled Interests Options
const INTEREST_ENUM = {
  TECHNOLOGY: 'TECHNOLOGY',
  ELECTRICAL_WORK: 'ELECTRICAL_WORK',
  SOLAR_ENERGY: 'SOLAR_ENERGY',
  CONSTRUCTION: 'CONSTRUCTION',
  AGRICULTURE: 'AGRICULTURE',
  HEALTHCARE: 'HEALTHCARE',
  EDUCATION: 'EDUCATION',
  RETAIL: 'RETAIL',
  BUSINESS: 'BUSINESS',
  ENTREPRENEURSHIP: 'ENTREPRENEURSHIP',
  HANDICRAFTS: 'HANDICRAFTS',
  BEAUTY_WELLNESS: 'BEAUTY_WELLNESS',
  AUTOMOBILE: 'AUTOMOBILE',
  DIGITAL_SERVICES: 'DIGITAL_SERVICES',
  CREATIVE_WORK: 'CREATIVE_WORK',
  OTHER: 'OTHER'
};

const INTEREST_LIST = Object.values(INTEREST_ENUM);

const INTEREST_LABELS = {
  [INTEREST_ENUM.TECHNOLOGY]: 'Technology',
  [INTEREST_ENUM.ELECTRICAL_WORK]: 'Electrical Work',
  [INTEREST_ENUM.SOLAR_ENERGY]: 'Solar Energy',
  [INTEREST_ENUM.CONSTRUCTION]: 'Construction',
  [INTEREST_ENUM.AGRICULTURE]: 'Agriculture',
  [INTEREST_ENUM.HEALTHCARE]: 'Healthcare',
  [INTEREST_ENUM.EDUCATION]: 'Education',
  [INTEREST_ENUM.RETAIL]: 'Retail',
  [INTEREST_ENUM.BUSINESS]: 'Business',
  [INTEREST_ENUM.ENTREPRENEURSHIP]: 'Entrepreneurship',
  [INTEREST_ENUM.HANDICRAFTS]: 'Handicrafts',
  [INTEREST_ENUM.BEAUTY_WELLNESS]: 'Beauty & Wellness',
  [INTEREST_ENUM.AUTOMOBILE]: 'Automobile',
  [INTEREST_ENUM.DIGITAL_SERVICES]: 'Digital Services',
  [INTEREST_ENUM.CREATIVE_WORK]: 'Creative Work',
  [INTEREST_ENUM.OTHER]: 'Other'
};

function normalizeInterest(val) {
  if (!val) return null;
  const upper = String(val).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (INTEREST_LIST.includes(upper)) return upper;
  if (upper.includes('TECH') || upper.includes('GADGET')) return INTEREST_ENUM.TECHNOLOGY;
  if (upper.includes('ELECTRIC')) return INTEREST_ENUM.ELECTRICAL_WORK;
  if (upper.includes('SOLAR') || upper.includes('GREEN_ENERGY')) return INTEREST_ENUM.SOLAR_ENERGY;
  if (upper.includes('CONSTRUCT')) return INTEREST_ENUM.CONSTRUCTION;
  if (upper.includes('AGRI') || upper.includes('FARM')) return INTEREST_ENUM.AGRICULTURE;
  if (upper.includes('HEALTH') || upper.includes('MEDICAL') || upper.includes('NURSING')) return INTEREST_ENUM.HEALTHCARE;
  if (upper.includes('EDU') || upper.includes('TEACH')) return INTEREST_ENUM.EDUCATION;
  if (upper.includes('RETAIL') || upper.includes('SHOP')) return INTEREST_ENUM.RETAIL;
  if (upper.includes('ENTREPRENEUR')) return INTEREST_ENUM.ENTREPRENEURSHIP;
  if (upper.includes('BUSINESS')) return INTEREST_ENUM.BUSINESS;
  if (upper.includes('CRAFT')) return INTEREST_ENUM.HANDICRAFTS;
  if (upper.includes('BEAUTY') || upper.includes('WELLNESS')) return INTEREST_ENUM.BEAUTY_WELLNESS;
  if (upper.includes('AUTO') || upper.includes('VEHICLE')) return INTEREST_ENUM.AUTOMOBILE;
  if (upper.includes('DIGITAL')) return INTEREST_ENUM.DIGITAL_SERVICES;
  if (upper.includes('CREATIVE') || upper.includes('ART')) return INTEREST_ENUM.CREATIVE_WORK;
  return null; // Custom goes to other_interests
}

module.exports = {
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
};
