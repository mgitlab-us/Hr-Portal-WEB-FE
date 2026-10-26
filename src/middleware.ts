import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protect dashboard routes with the coarse client-side cookie gate.
  if (pathname.startsWith('/dashboard')) {
    const isAuthenticated = request.cookies.get('isAuthenticated');
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Do NOT bounce /login back to /dashboard based on this cookie alone.
  // The cookie can outlive a failed refresh (or a manually cleared localStorage),
  // and redirecting on it traps the browser in /login <-> /dashboard reload loops.
  // The login page redirects genuinely authenticated users client-side instead.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
