import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail 
} from 'firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// List of authorized email addresses
const AUTHORIZED_EMAILS = [
  // Add authorized email addresses here
  // Example: 'admin@eden.co.uk',
];

export const AuthProvider = ({ children, authorizedEmails = AUTHORIZED_EMAILS }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Sign in function
  const login = async (email, password) => {
    // Check if email is authorized
    if (authorizedEmails.length > 0 && !authorizedEmails.includes(email)) {
      throw new Error('Unauthorized email address. Please contact the administrator.');
    }
    
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Register function
  const register = async (email, password) => {
    // Check if email is authorized
    if (authorizedEmails.length > 0 && !authorizedEmails.includes(email)) {
      throw new Error('Unauthorized email address. Please contact the administrator.');
    }
    
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Sign out function
  const logout = () => {
    return signOut(auth);
  };

  // Password reset function
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Check if user is authorized
  const checkAuthorization = (user) => {
    if (!user) {
      setIsAuthorized(false);
      return false;
    }

    // If no authorized emails are specified, allow all authenticated users
    if (authorizedEmails.length === 0) {
      setIsAuthorized(true);
      return true;
    }

    // Check if user's email is in the authorized list
    const authorized = authorizedEmails.includes(user.email);
    setIsAuthorized(authorized);
    return authorized;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      checkAuthorization(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [authorizedEmails]);

  const value = {
    currentUser,
    isAuthorized,
    login,
    register,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 