/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  registerWithEmail: (email: string, pass: string, firstName: string, lastName: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user profile from Firestore
  const syncUserProfile = async (firebaseUser: User): Promise<UserProfile> => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        return data;
      }

      // Profile does not exist yet (e.g. Google Sign-In or new account)
      const names = (firebaseUser.displayName || '').split(' ');
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        firstName: names[0] || 'Customer',
        lastName: names.slice(1).join(' ') || '',
        role: 'customer',
        createdAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, newProfile);
      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await syncUserProfile(currentUser);
        } catch (err: any) {
          setError(err.message || 'Failed to load user profile.');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const registerWithEmail = async (
    email: string,
    pass: string,
    firstName: string,
    lastName: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const userDocRef = doc(db, 'users', cred.user.uid);
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        firstName,
        lastName,
        role: 'customer',
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newProfile);
      setProfile(newProfile);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await syncUserProfile(cred.user);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await syncUserProfile(cred.user);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
