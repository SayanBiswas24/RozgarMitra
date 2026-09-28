export interface TLDResult {
  language: string;
  code: string;
  confidence: number;
}

export const detectTextLanguage = (text: string): TLDResult => {
  if (!text) {
    return { language: 'English', code: 'en', confidence: 0.5 };
  }

  // Unicode Script Range detection for Indian Languages
  const scripts = [
    { range: /[\u0900-\u097F]/, code: 'hi', name: 'Hindi' },
    { range: /[\u0980-\u09FF]/, code: 'bn', name: 'Bengali' },
    { range: /[\u0A00-\u0A7F]/, code: 'pa', name: 'Punjabi' },
    { range: /[\u0A80-\u0AFF]/, code: 'gu', name: 'Gujarati' },
    { range: /[\u0B00-\u0B7F]/, code: 'or', name: 'Odia' },
    { range: /[\u0B80-\u0BFF]/, code: 'ta', name: 'Tamil' },
    { range: /[\u0C00-\u0C7F]/, code: 'te', name: 'Telugu' },
    { range: /[\u0C80-\u0CFF]/, code: 'kn', name: 'Kannada' },
    { range: /[\u0D00-\u0D7F]/, code: 'ml', name: 'Malayalam' },
    { range: /[a-zA-Z]/, code: 'en', name: 'English' }
  ];

  for (const s of scripts) {
    if (s.range.test(text)) {
      return { language: s.name, code: s.code, confidence: 0.96 };
    }
  }

  return { language: 'English', code: 'en', confidence: 0.7 };
};
