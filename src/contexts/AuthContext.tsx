import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { UserProfile, SkillTier } from '../types';
import * as firestoreService from '../services/firestore';
import { requestNotificationPermission, removeFcmToken } from '../services/notifications';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeProfile: (skillTier: SkillTier, country: string, role: 'PLAYER' | 'QUEUE_MASTER') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  profileLoading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  completeProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    setProfileLoading(true);
    const unsubscribe = firestoreService.subscribeToUserProfile(user.uid, (profileData) => {
      setUserProfile(profileData as UserProfile | null);
      setProfileLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error signing in with Email', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error signing up with Email', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await firestoreService.updateUserProfile(user.uid, updates);
    } catch (error) {
      console.error('Error updating user profile', error);
      throw error;
    }
  };

  const completeProfile = async (skillTier: SkillTier, country: string, role: 'PLAYER' | 'QUEUE_MASTER') => {
    if (!user) return;
    
    const getBaseRating = (tier: SkillTier) => {
      switch(tier) {
        case 'BEGINNER': return 1000;
        case 'LOW_INTERMEDIATE': return 1400;
        case 'INTERMEDIATE': return 1800;
        case 'ADVANCED': return 2200;
        default: return 1000;
      }
    };

    const initialProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Player',
      email: user.email || '',
      skillTier,
      country,
      role,
      profileCompleted: true,
      hasSeenWelcomeModal: false,
      ratingScore: getBaseRating(skillTier),
      joinedAt: Date.now(),
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0
      }
    };

    try {
      await firestoreService.saveUserProfile(user.uid, initialProfile);
      // Auto-prompt for notification permission after profile completion
      if ('Notification' in window && Notification.permission === 'default') {
        await requestNotificationPermission(user.uid);
      }
    } catch (error) {
      console.error('Error completing user profile', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await removeFcmToken(user.uid);
      }
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      profileLoading, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      logout,
      updateProfile,
      completeProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
