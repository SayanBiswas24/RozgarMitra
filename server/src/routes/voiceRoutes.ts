import { Router } from 'express';
import { processTTS } from '../controllers/ttsController';

const router = Router();

router.post('/', processTTS);

export default router;
