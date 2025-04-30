import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  async function signup(email, password, name) {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Ensure user is created before updating profile
      if (!userCredential.user) {
        throw new Error('User creation failed');
      }
      
      await updateProfile(userCredential.user, { displayName: name });
      console.log('User signed up successfully:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName
      });
      return userCredential.user;
    } catch (error) {
      console.error('Signup error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user) {
        throw new Error('Login failed - no user returned');
      }
      
      console.log('User logged in successfully:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName
      });
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
      throw error;
    }
  }

  async function logout() {
    try {
      setError(null);
      await signOut(auth);
      console.log('User logged out successfully');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
      throw error;
    }
  }

  useEffect(() => {
    console.log('Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous,
        emailVerified: user.emailVerified
      } : 'No user');
      
      setUser(user);
      setLoading(false);
      setAuthInitialized(true);
    }, (error) => {
      console.error('Auth state change error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
      setLoading(false);
      setAuthInitialized(true);
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    error,
    loading,
    authInitialized,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {(!loading || authInitialized) && children}
    </AuthContext.Provider>
  );
} 