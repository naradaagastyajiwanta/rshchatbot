import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  
  // Check for redirect_count to prevent infinite loops
  const redirectCount = parseInt(searchParams.get('redirect_count') || '0');
  if (redirectCount > 2) {
    console.log('Middleware: Detected redirect loop, allowing request to continue');
    return NextResponse.next();
  }
  
  // Public paths that don't require authentication
  const isPublicPath = path === '/login';
  
  // Get auth cookies from the request - check all possible cookie names
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const authToken = request.cookies.get('sb-auth-token')?.value;
  const supabaseAuthToken = request.cookies.get('supabase-auth-token')?.value;
  
  // Check if the user has any of the authentication cookies
  const hasAuthCookies = !!(refreshToken || accessToken || authToken || supabaseAuthToken);
  
  console.log(`Middleware: Path=${path}, HasAuth=${hasAuthCookies}, IsPublic=${isPublicPath}`);
  
  if (!hasAuthCookies && !isPublicPath) {
    // If user is not authenticated and trying to access a protected route, redirect to login
    console.log('Middleware: Redirecting to login');
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect_count', (redirectCount + 1).toString());
    return NextResponse.redirect(redirectUrl);
  }
  
  if (hasAuthCookies && isPublicPath) {
    // If user is authenticated and trying to access login page, redirect to dashboard
    console.log('Middleware: Redirecting to dashboard');
    const redirectUrl = new URL('/dashboard', request.url);
    redirectUrl.searchParams.set('redirect_count', (redirectCount + 1).toString());
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
