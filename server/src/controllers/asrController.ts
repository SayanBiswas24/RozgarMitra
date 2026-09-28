import { Request, Response } from 'express';
import { performASR } from '../services/bhashini/asrService';
import { detectAudioLanguage } from '../services/bhashini/aldService';

export const processASR = async (req: Request, res: Response) => {
  try {
    const { audio, language } = req.body;

    if (!audio || typeof audio !== 'string' || audio.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Valid audio payload is required (base64 WAV, min ~100 chars)'
      });
    }

    const lang = language || 'hi';
    const asrResult = await performASR(audio, lang);

    if (!asrResult.success || !asrResult.text) {
      return res.json({
        success: false,
        text: '',
        language: lang,
        message: 'Speech was not recognized. Please speak clearly and try again.'
      });
    }

    const aldResult = await detectAudioLanguage(audio, lang);

    res.json({
      success: true,
      text: asrResult.text,
      language: asrResult.language,
      detectedLanguage: aldResult.language,
      confidence: aldResult.confidence
    });
  } catch (error: any) {
    console.error('ASR Controller Error:', error.message);
    res.status(500).json({
      success: false,
      text: '',
      message: 'Speech recognition failed. Please try again.'
    });
  }
};
