import { Request, Response } from 'express';
import { performTTS } from '../services/bhashini/ttsService';

export const processTTS = async (req: Request, res: Response) => {
  try {
    const { text, language, gender } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required for TTS' });
    }

    const result = await performTTS(text, language || 'hi', gender || 'female');
    res.json({
      success: result.success,
      audioContent: result.audioContent,
      format: result.format
    });
  } catch (error: any) {
    console.error('TTS Controller Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate speech',
      error: error.message
    });
  }
};
