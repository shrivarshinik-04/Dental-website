/**
 * Admin area: ask the browser for credentials before any admin page or API runs.
 * Access control: SPDI Rules 2011, Rule 8 (now); DPDP Rules 2025, Rule 6(1)(b) (from about
 * May 2027).
 *
 * Credentials are verified, role-checked and brute-force throttled in Node by
 * src/lib/adminGuard.js, which every admin page and API route calls. Edge middleware cannot
 * see the client IP when self-hosted, so it cannot throttle; checking the password here
 * would give attackers an unthrottled path.
 */
import { NextResponse } from 'next/server';

export function middleware(request) {
  if (!request.headers.get('authorization')?.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Clinic admin", charset="UTF-8"' }
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*']
};
