import { Request, Response } from 'express';
import { performTranslation } from '../services/bhashini/nmtService';
import { detectTextLanguage } from '../services/bhashini/tldService';
import { performTransliteration } from '../services/bhashini/transliterationService';

export const processTranslation = async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required for translation' });
    }

    const sLang = sourceLanguage || 'hi';
    const tLang = targetLanguage || 'en';

    const result = await performTranslation(text, sLang, tLang);
    const detected = detectTextLanguage(text);

    res.json({
      success: result.success,
      translatedText: result.translatedText,
      sourceLanguage: sLang,
      targetLanguage: tLang,
      detectedLanguage: detected.language
    });
  } catch (error: any) {
    console.error('Translation Controller Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Translation failed',
      error: error.message
    });
  }
};

export const processTransliteration = async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage } = req.body;
    const result = await performTransliteration(text || '', sourceLanguage || 'hi');
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Transliteration failed' });
  }
};

export const processTLD = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const result = detectTextLanguage(text || '');
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Language detection failed' });
  }
};
