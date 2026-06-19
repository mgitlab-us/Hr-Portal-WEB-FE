import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get('isAuthenticated');

  // 1. Protect Dashboard Routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      // Direct redirect for professional-grade security
      // No dashboard HTML will ever reach the client without this cookie
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Prevent Logged-in users from seeing the Login Page
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// Only run middleware on these paths for performance
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
