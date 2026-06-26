import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyABu2ykOLJz0i42GiIyksgnaEERoqmDdS4",
  authDomain: "rallyupph.firebaseapp.com",
  projectId: "rallyupph",
  storageBucket: "rallyupph.firebasestorage.app",
  messagingSenderId: "66620157767",
  appId: "1:66620157767:web:0a40c00bf47b960041e662",
  measurementId: "G-0X1V2HDDNP"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
