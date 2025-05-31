// User hook for accessing current user data

import { useAuth } from '../contexts/AuthContext';

export function useUser() {
  const { currentUser } = useAuth();
  
  return {
    data: {
      user: currentUser ? {
        id: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
      } : null
    },
    isLoading: false,
    error: null
  };
} 