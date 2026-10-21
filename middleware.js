/**
 * Protects the admin area with HTTP Basic auth before any page or API code runs.
 * DPDP Act s.8(5), Rule 6(1)(b) access control. Pages and API routes re-check the
 * credentials and the role (defence in depth).
 */
import { NextResponse } from 'next/server';
import { verifyBasicAuth } from './src/lib/adminAuth';

export async function middleware(request) {
  const admin = await verifyBasicAuth(request.headers.get('authorization'));
  if (!admin) {
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
