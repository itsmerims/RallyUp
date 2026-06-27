import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';
import { db, messaging } from '../services/firebase-admin';

const router = Router();

export interface SendNotificationBody {
  playerIds: string[];
  qmUserId: string;
  title: string;
  body: string;
  type?: 'NEXT_UP' | 'COURT_READY';
  courtId?: string;
  matchId?: string;
}

interface SendNotificationResponse {
  success: boolean;
  sentCount: number;
  totalTokens: number;
  error?: string;
}

router.post('/sendMatchNotification', async (req: Request, res: Response<SendNotificationResponse>) => {
  try {
    const { playerIds, qmUserId, title, body, type, courtId, matchId } = req.body as SendNotificationBody;

    if (!playerIds?.length || !title || !body) {
      res.status(400).json({
        success: false,
        sentCount: 0,
        totalTokens: 0,
        error: 'Missing required fields: playerIds, title, body',
      });
      return;
    }

    // Collect FCM tokens directly from player documents in the QM's collection
    const tokens: string[] = [];

    if (qmUserId) {
      const playerSnapshots = await Promise.allSettled(
        playerIds.map((pid) => db.collection('users').doc(qmUserId).collection('players').doc(pid).get())
      );

      for (const result of playerSnapshots) {
        if (result.status === 'fulfilled' && result.value.exists) {
          const playerData = result.value.data();
          const fcmTokens: string[] = playerData?.fcmTokens || [];
          for (const token of fcmTokens) {
            if (!tokens.includes(token)) {
              tokens.push(token);
            }
          }
        }
      }
    }

    if (tokens.length === 0) {
      res.status(200).json({
        success: true,
        sentCount: 0,
        totalTokens: 0,
        error: 'No FCM tokens found for the specified players.',
      });
      return;
    }

    const payload: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
        icon: '/icon-192x192.png',
        click_action: '/',
        type: type || '',
        courtId: courtId || '',
        matchId: matchId || '',
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          requireInteraction: true,
        },
        fcmOptions: {
          link: '/',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(payload);

    res.status(200).json({
      success: true,
      sentCount: response.successCount,
      totalTokens: tokens.length,
    });
  } catch (error) {
    console.error('sendMatchNotification error:', error);
    res.status(500).json({
      success: false,
      sentCount: 0,
      totalTokens: 0,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
