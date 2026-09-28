import express from 'express';
import asrRoutes from './asrRoutes';
import agentRoutes from './agentRoutes';

const router = express.Router();

router.use('/asr', asrRoutes);
router.use('/agent', agentRoutes);
// Add other routes here

export default router;
