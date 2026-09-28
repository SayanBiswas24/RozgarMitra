import { Router } from 'express';
import { processASR } from '../controllers/asrController';
import { detectAudioLanguage } from '../services/bhashini/aldService';

const router = Router();

router.post('/', processASR);
router.post('/ald', async (req, res) => {
  try {
    const { audio, language } = req.body;
    const result = await detectAudioLanguage(audio || '', language);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
