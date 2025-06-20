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
  await supabase.auth.signOut();
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
