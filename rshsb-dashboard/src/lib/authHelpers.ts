import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// Get current session
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}

// Sign out the current user
export async function signOut(): Promise<void> {
  console.log('Signing out user...');
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
  
  console.log('User signed out successfully');
  // Hapus cookie secara manual untuk memastikan
  document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
