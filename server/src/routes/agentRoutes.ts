import { Router } from 'express';
import { processAgent } from '../controllers/agentController';

const router = Router();

router.post('/', processAgent);

export default router;
