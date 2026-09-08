import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/lib/types'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for public routes
  const publicRoutes = ['/', '/login', '/register', '/catalog', '/product']
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Skip middleware for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next()
  }

  // /admin guards itself in a Server Component, which cannot be bypassed from
  // the browser. There is nothing useful for middleware to add here.

  // For other protected routes: redirect to login if not authenticated
  // (we'll check localStorage on client side)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
