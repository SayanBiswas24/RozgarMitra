import { Request, Response } from 'express';
import { performOCR } from '../services/bhashini/ocrService';
import { performTranslation } from '../services/bhashini/nmtService';

export const processOCR = async (req: Request, res: Response) => {
  try {
    const { image, language, targetLanguage } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Image base64 payload is required' });
    }

    const ocrResult = await performOCR(image, language || 'hi');

    let translatedText = '';
    if (targetLanguage && targetLanguage !== ocrResult.languageCode) {
      const transResult = await performTranslation(ocrResult.text, ocrResult.languageCode, targetLanguage);
      translatedText = transResult.translatedText;
    }

    res.json({
      success: ocrResult.success,
      text: ocrResult.text,
      detectedLanguage: ocrResult.detectedLanguage,
      languageCode: ocrResult.languageCode,
      translatedText
    });
  } catch (error: any) {
    console.error('OCR Controller Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process OCR',
      error: error.message
    });
  }
};
