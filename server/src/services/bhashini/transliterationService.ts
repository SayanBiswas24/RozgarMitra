export interface TransliterationResult {
  originalText: string;
  transliteratedText: string;
  sourceLanguage: string;
  targetScript: string;
}

// Common Indic transliteration map for Devanagari to Latin
const devanagariToLatin: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'क': 'k', 'ख': 'kh', 'ग': 'g',
  'घ': 'gh', 'ङ': 'ng', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th',
  'द': 'd', 'ध': 'dh', 'न': 'n', 'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh',
  'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh',
  'स': 's', 'ह': 'h', 'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', '्': '', 'ं': 'n', 'ः': 'h',
  '़': '', '।': '.'
};

export const performTransliteration = async (
  text: string,
  sourceLanguage: string = 'hi'
): Promise<TransliterationResult> => {
  if (!text) {
    return { originalText: '', transliteratedText: '', sourceLanguage, targetScript: 'Latn' };
  }

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (devanagariToLatin[char] !== undefined) {
      result += devanagariToLatin[char];
    } else {
      result += char;
    }
  }

  return {
    originalText: text,
    transliteratedText: result,
    sourceLanguage,
    targetScript: 'Latn'
  };
};
