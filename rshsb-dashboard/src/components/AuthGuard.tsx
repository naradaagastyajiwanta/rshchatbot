"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentSession } from '@/lib/authHelpers';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('AuthGuard: Checking session...');
        const session = await getCurrentSession();
        console.log('AuthGuard: Session check result:', !!session);
        
        if (!session) {
          // Redirect to login if no session exists
          console.log('AuthGuard: No session, redirecting to login');
          router.replace('/login');
          return;
        }
        
        // Session exists, allow access to protected content
        console.log('AuthGuard: Session valid, allowing access');
        setIsLoading(false);
      } catch (error) {
        console.error('AuthGuard: Auth check error:', error);
        router.replace('/login');
      }
    };

    // Initial auth check
    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthGuard: Auth state changed:', event, !!session);
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setIsLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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
