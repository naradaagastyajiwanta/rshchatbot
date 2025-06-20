import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  // Initialize Supabase client using environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kfrmnlscvejptimbehgb.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmcm1ubHNjdmVqcHRpbWJlaGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMzMyMjAsImV4cCI6MjA2NTgwOTIyMH0.s-3sW0OPAv28VRAiA_gCqeu8uxXP2yDeMyeDyfB7Q0I';
  
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const isPublicPath = path === '/login';
  
  // Get auth cookies from the request - check all possible cookie names
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const authToken = request.cookies.get('sb-auth-token')?.value;
  const supabaseAuthToken = request.cookies.get('supabase-auth-token')?.value;
  
  // Check if the user has any of the authentication cookies
  const hasAuthCookies = !!(refreshToken || accessToken || authToken || supabaseAuthToken);
  
  if (!hasAuthCookies && !isPublicPath) {
    // If user is not authenticated and trying to access a protected route, redirect to login
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (hasAuthCookies && isPublicPath) {
    // If user is authenticated and trying to access login page, redirect to dashboard
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Continue with the request for all other cases
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    // Match all paths except for:
    // - API routes (/api/*)
    // - Static files (/_next/*, /static/*)
    // - Favicon, etc.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
