import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const session = req.cookies.get('session');
  const isProtected =
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/practice') ||
    req.nextUrl.pathname.startsWith('/mock-tests') ||
    req.nextUrl.pathname.startsWith('/admin');

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/practice/:path*', '/mock-tests/:path*', '/admin/:path*'],
};