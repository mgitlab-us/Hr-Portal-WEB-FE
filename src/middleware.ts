import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get('isAuthenticated');

  // 1. Protect dashboard and employee portal routes with the auth cookie.
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Keep the branding/product page consistent with the cookie-based session flow.
  // If a user is already authenticated, they should not stay on the marketing page.
  if ((pathname === '/product' || pathname === '/product/') && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Do NOT bounce /login back to /dashboard based on this cookie alone.
  // The cookie can outlive a failed refresh (or a manually cleared localStorage),
  // and redirecting on it traps the browser in /login <-> /dashboard reload loops.
  // The login page redirects genuinely authenticated users client-side instead.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portal/:path*', '/product'],
};
