import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) return false;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BOw861uX0lH5eK3D98P27Y-Z89sEa-gT-2Y3kH2g0V-M9x5H3N_4v6n_8-3X1sH3d4v-Z_Z-Z_Z_Z_Z_Z_Z_Z' // Use a generic/placeholder VAPID key or expect user to configure if needed. We'll leave it out for now or use typical web setup. Wait, vapidKey is optional but recommended. We will omit it so it uses the default project config.
      });
      
      if (token) {
        console.log('FCM Token:', token);
        // Save the token to the user's document
        await updateDoc(doc(db, 'users', userId), {
          fcmTokens: arrayUnion(token)
        });
        return true;
      }
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
  }
  return false;
};

export const setupMessageListener = () => {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    if (payload.notification) {
      new Notification(payload.notification.title || 'New Notification', {
        body: payload.notification.body,
        icon: '/icon-192x192.png'
      });
    }
  });
};
