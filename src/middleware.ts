import { NextRequest, NextResponse } from 'next/server'
import { canAccessRoute } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for public routes
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return NextResponse.next()
  }

  // Get user from cookies/headers (mock for now)
  const userRole = request.cookies.get('user_role')?.value as UserRole | undefined

  // If not authenticated, redirect to login
  if (!userRole) {
    // Allow public catalog access
    if (pathname.startsWith('/catalog') || pathname.startsWith('/product')) {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check if user can access this route
  if (!canAccessRoute(userRole, pathname)) {
    // Redirect based on role
    const redirects: Record<UserRole, string> = {
      carpenter: '/dashboard/orders',
      supplier: '/supplier/dashboard',
      admin: '/admin/dashboard',
    }

    return NextResponse.redirect(
      new URL(redirects[userRole] || '/login', request.url)
    )
  }

  // Add user role to request headers (useful for API routes)
  const response = NextResponse.next()
  response.headers.set('x-user-role', userRole)

  return response
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
