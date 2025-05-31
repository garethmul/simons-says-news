// Authentication utilities

import { auth } from '../config/firebase';

export async function getAuthToken(): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      return null;
    }
    
    const token = await auth.currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
}

export function getCurrentUserEmail(): string | null {
  return auth.currentUser?.email || null;
} 