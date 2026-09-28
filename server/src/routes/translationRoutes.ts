import { Router } from 'express';
import {
  processTranslation,
  processTransliteration,
  processTLD
} from '../controllers/translationController';

const router = Router();

router.post('/', processTranslation);
router.post('/transliterate', processTransliteration);
router.post('/tld', processTLD);

export default router;
