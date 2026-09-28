import { Request, Response } from 'express';
import { processUserMessage } from '../services/ai/aiAgentService';

export const processAgent = async (req: Request, res: Response) => {
  try {
    const { text, language, outputLanguage, conversationHistory } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const response = await processUserMessage(
      text.trim(),
      language || 'hi',
      outputLanguage || language || 'hi',
      conversationHistory || []
    );

    res.json({
      success: true,
      text: response.text,
      language: response.language,
      audioContent: response.audioContent
    });
  } catch (error: any) {
    console.error('Agent Controller Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process agent message',
      error: error.message
    });
  }
};
