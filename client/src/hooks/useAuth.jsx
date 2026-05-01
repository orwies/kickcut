/**
 * Custom React hook to access authentication state globally.
 * Takes no arguments.
 * Uses the React useContext API to retrieve the nearest AuthContext.
 * Returns the authentication context object, or throws an error if used outside a provider.
 */

import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
