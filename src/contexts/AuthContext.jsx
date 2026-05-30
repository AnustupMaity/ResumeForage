import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Admin email(s) — only these can access the admin panel
const ADMIN_EMAILS = ['anustupmaity1974@gmail.com', 'anustupmaity2004@gmail.com'];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create or update user document in Firestore
  async function createUserDoc(user, additionalData = {}) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName || additionalData.displayName || '',
        email: user.email,
        createdAt: serverTimestamp(),
        subscription: {
          active: false,
          paidAt: null,
          expiresAt: null,
          transactionId: null
        },
        resume: getDefaultResume()
      });
    }
    
    return await getDoc(userRef);
  }

  function getDefaultResume() {
    return {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        github: ''
      },
      education: [],
      skills: {
        languages: '',
        frameworksMlDl: '',
        frameworksDev: '',
        toolkit: '',
        platforms: '',
        softSkills: '',
        interests: ''
      },
      projects: [],
      experience: [],
      achievements: [],
      certifications: [],
      customSections: []
    };
  }

  async function signup(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await createUserDoc(result.user, { displayName });
    return result;
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await createUserDoc(result.user);
    return result;
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserDoc(result.user);
    return result;
  }

  function logout() {
    return signOut(auth);
  }

  function isAdmin() {
    return currentUser && ADMIN_EMAILS.includes(currentUser.email);
  }

  function isSubscriptionActive() {
    if (isAdmin()) return true; // Admins always have active subscriptions
    if (!userData?.subscription) return false;
    if (!userData.subscription.active) return false;
    if (!userData.subscription.expiresAt) return false;
    const expiresAt = userData.subscription.expiresAt.toDate
      ? userData.subscription.expiresAt.toDate()
      : new Date(userData.subscription.expiresAt);
    return expiresAt > new Date();
  }

  async function refreshUserData() {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setUserData(userSnap.data());
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await createUserDoc(user);
          setUserData(userDoc.data());
        } catch (err) {
          console.error('Error loading user data:', err);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    isAdmin,
    isSubscriptionActive,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
