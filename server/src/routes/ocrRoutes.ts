import { Router } from 'express';
import { processOCR } from '../controllers/ocrController';

const router = Router();

router.post('/', processOCR);

export default router;
