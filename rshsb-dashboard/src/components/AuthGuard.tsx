"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const redirectedRef = useRef(false);
  const sessionCheckedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects and checks
    if (redirectedRef.current || sessionCheckedRef.current) return;
    
    // Check if we're already on the login page to prevent loops
    if (window.location.pathname === '/login') {
      setIsLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        sessionCheckedRef.current = true;
        
        // Get session from Supabase directly
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('AuthGuard: Session check result:', !!session);
        
        if (!session && !redirectedRef.current) {
          console.log('AuthGuard: No session found, redirecting to login');
          redirectedRef.current = true;
          
          // Use a simple redirect to avoid loops
          window.location.href = '/login';
          return;
        }
        
        // If we have a session, stop loading
        if (session) {
          console.log('AuthGuard: Valid session found');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AuthGuard: Error checking session:', error);
        
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          window.location.href = '/login';
        }
      }
    };
    
    // Only check session once
    checkSession();
    
    // Minimal auth state listener that won't cause loops
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthGuard: Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' && !redirectedRef.current) {
        redirectedRef.current = true;
        window.location.href = '/login';
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setIsLoading(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#e6c0cf] border-t-[#8e003b] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Render children once authenticated
  return <>{children}</>;
}
