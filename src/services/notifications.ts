import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { FcmNotificationPayload, NotificationType } from '../types';

// TODO: Replace with your VAPID key from Firebase Console > Project Settings > Cloud Messaging
// Generate a key pair in the "Web Push certificates" section
const VAPID_KEY = 'BE6csCKeJiGd3_np5LiUL9SMp0s78j_mOy1VBBD_ZaeXalGX8zH1bTIBFDSDZD9VV2y4bj0v6eQLbc_oTEkYKIk';

let unsubscribeFCM: (() => void) | null = null;

function waitForMessaging(): Promise<boolean> {
  return new Promise((resolve) => {
    if (messaging) return resolve(true);
    const check = setInterval(() => {
      if (messaging) {
        clearInterval(check);
        resolve(true);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(check);
      resolve(false);
    }, 5000);
  });
}

// Store FCM token on a player document in the QM's collection
export const requestPlayerNotificationPermission = async (qmUserId: string, playerId: string): Promise<boolean> => {
  const ready = await waitForMessaging();
  if (!ready || !messaging) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return false;

    await updateDoc(doc(db, 'users', qmUserId, 'players', playerId), {
      fcmTokens: arrayUnion(token)
    });
    return true;
  } catch (error) {
    console.error('FCM token registration failed:', error);
    return false;
  }
};

export const removePlayerFcmToken = async (qmUserId: string, playerId: string): Promise<void> => {
  if (!messaging) return;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await deleteToken(messaging);
      await updateDoc(doc(db, 'users', qmUserId, 'players', playerId), {
        fcmTokens: arrayRemove(token)
      });
    }
  } catch (error) {
    console.error('FCM token removal failed:', error);
  }
};

// Store FCM token on the QM's profile for their own notifications
export const requestNotificationPermission = async (userId: string): Promise<boolean> => {
  const ready = await waitForMessaging();
  if (!ready || !messaging) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return false;

    await updateDoc(doc(db, 'profiles', userId), {
      fcmTokens: arrayUnion(token)
    });
    return true;
  } catch (error) {
    console.error('FCM token registration failed:', error);
    return false;
  }
};

export const removeFcmToken = async (userId: string): Promise<void> => {
  if (!messaging) return;
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await deleteToken(messaging);
      await updateDoc(doc(db, 'profiles', userId), {
        fcmTokens: arrayRemove(token)
      });
    }
  } catch (error) {
    console.error('FCM token removal failed:', error);
  }
};

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface SendNotificationInput {
  playerIds: string[];
  qmUserId: string;
  title: string;
  body: string;
  type?: 'NEXT_UP' | 'COURT_READY';
  courtId?: string;
  matchId?: string;
}

export const sendMatchNotification = async (input: SendNotificationInput): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/api/sendMatchNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      console.error('sendMatchNotification failed:', res.status, await res.text());
    }
  } catch (error) {
    console.error('sendMatchNotification error:', error);
  }
};

export const setupMessageListener = (onToast: (payload: FcmNotificationPayload) => void): (() => void) => {
  const init = async () => {
    const ready = await waitForMessaging();
    if (!ready || !messaging) return;

    if (unsubscribeFCM) {
      unsubscribeFCM();
    }

    unsubscribeFCM = onMessage(messaging, (payload) => {
      const data = payload.data as Record<string, string> | undefined;
      const notification = payload.notification;

      const fcmPayload: FcmNotificationPayload = {
        title: data?.title || notification?.title || 'RallyUp Update',
        body: data?.body || notification?.body || '',
        icon: data?.icon || notification?.icon || '/icon-192x192.png',
        click_action: data?.click_action || '/',
        type: (data?.type as NotificationType) || undefined,
        courtId: data?.courtId || undefined,
        matchId: data?.matchId || undefined,
      };

      onToast(fcmPayload);
    });
  };

  init();

  return () => {
    if (unsubscribeFCM) {
      unsubscribeFCM();
      unsubscribeFCM = null;
    }
  };
};
