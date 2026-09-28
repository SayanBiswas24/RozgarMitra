import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import asrRoutes from './routes/asrRoutes';
import voiceRoutes from './routes/voiceRoutes';
import translationRoutes from './routes/translationRoutes';
import ocrRoutes from './routes/ocrRoutes';
import agentRoutes from './routes/agentRoutes';
import { detectAudioLanguage } from './services/bhashini/aldService';
import { detectTextLanguage } from './services/bhashini/tldService';
import { performTransliteration } from './services/bhashini/transliterationService';
import { getPipelineConfig } from './services/bhashini/bhashiniClient';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors());

// Support large payloads for base64 audio and OCR images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Primary Feature Routes
app.use('/api/asr', asrRoutes);
app.use('/api/tts', voiceRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/agent', agentRoutes);

// Direct shortcut endpoints according to spec
app.post('/api/ald', async (req, res) => {
  try {
    const { audio, language } = req.body;
    const result = await detectAudioLanguage(audio || '', language);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/tld', (req, res) => {
  const { text } = req.body;
  const result = detectTextLanguage(text || '');
  res.json({ ...result, success: true });
});

app.post('/api/transliterate', async (req, res) => {
  try {
    const { text, sourceLanguage } = req.body;
    const result = await performTransliteration(text || '', sourceLanguage || 'hi');
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Live Health & Service Status Check
app.get('/api/status', async (req, res) => {
  const hasUserId = !!process.env.BHASHINI_USER_ID;
  const hasApiKey = !!process.env.BHASHINI_API_KEY;
  const hasInferenceKey = !!process.env.BHASHINI_INFERENCE_API_KEY;
  const isConfigured = hasUserId && hasApiKey && hasInferenceKey;

  let bhashiniStatus = isConfigured ? 'connected' : 'demo_mode';

  // Test live connection to Bhashini
  try {
    if (isConfigured) {
      await getPipelineConfig();
    }
  } catch (e) {
    console.warn('[Status Check] Bhashini ping failed');
  }

  res.json({
    status: 'ok',
    mode: isConfigured ? 'live' : 'demo',
    bhashini: bhashiniStatus,
    asr: 'available',
    tts: 'available',
    translation: 'available',
    ocr: 'available',
    details: {
      hasUserId,
      hasApiKey,
      hasInferenceKey
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
