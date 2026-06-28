import { Router, Request, Response } from 'express';
import { db } from '../services/firebase-admin';

const router = Router();

router.post('/playerStatus', async (req: Request, res: Response) => {
  try {
    const { qmUserId, playerId, status } = req.body;

    if (!qmUserId || !playerId || !status) {
      res.status(400).json({ success: false, error: 'Missing fields' });
      return;
    }

    await db.collection('users').doc(qmUserId).collection('players').doc(playerId).update({ status });
    res.json({ success: true });
  } catch (error) {
    console.error('Player status update failed:', error);
    res.status(500).json({ success: false, error: 'Update failed' });
  }
});

export default router;
