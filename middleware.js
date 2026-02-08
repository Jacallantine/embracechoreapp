import { NextResponse } from 'next/server';

/**
 * Lightweight JWT structure validation for Edge middleware.
 * Full signature verification happens in API route handlers via getCurrentUser().
 * This checks: valid JWT format (3 base64url parts) and not expired.
 */
function isTokenStructurallyValid(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode payload (base64url -> JSON)
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }

    // Must have userId
    if (!payload.userId) return false;

    return true;
  } catch {
    return false;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Public routes
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/setup'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If logged in and trying to access login, redirect to dashboard
    if (pathname === '/login' && token && isTokenStructurallyValid(token)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Validate token structure (not just existence)
  const validToken = token && isTokenStructurallyValid(token);

  // API routes need valid auth token
  if (pathname.startsWith('/api/')) {
    if (!validToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protected pages - redirect to login if no valid token
  if (!validToken) {
    // Clear invalid cookie if present
    if (token) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('token', '', { maxAge: 0, path: '/' });
      return response;
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
