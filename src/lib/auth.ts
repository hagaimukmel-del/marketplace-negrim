import { UserRole } from './types'

/**
 * Permission definitions per role
 */
export const PERMISSIONS: Record<UserRole, string[]> = {
  carpenter: [
    'view_catalog',
    'create_order',
    'view_own_orders',
    'cancel_own_order',
    'request_return',
    'view_own_returns',
    'leave_review',
  ],
  supplier: [
    'manage_products',
    'view_received_orders',
    'update_order_status',
    'view_returns',
    'update_return_status',
    'view_sales_analytics',
  ],
  admin: [
    '*', // All permissions
  ],
}

/**
 * Routes allowed per role
 */
export const ALLOWED_ROUTES: Record<UserRole, string[]> = {
  carpenter: [
    '/catalog',
    '/product',
    '/cart',
    '/checkout',
    '/dashboard/orders',
    '/dashboard/profile',
    '/dashboard/returns',
  ],
  supplier: [
    '/supplier/dashboard',
    '/supplier/products',
    '/supplier/orders',
    '/supplier/returns',
    '/supplier/analytics',
    '/supplier/profile',
  ],
  admin: [
    '/', // All routes
  ],
}

/**
 * Blocked routes per role
 */
export const BLOCKED_ROUTES: Record<UserRole, string[]> = {
  carpenter: [
    '/admin',
    '/supplier',
  ],
  supplier: [
    '/admin',
    '/cart',
    '/checkout',
    '/dashboard', // Carpenter dashboard
  ],
  admin: [],
}

/**
 * Check if user has permission for action
 */
export function hasPermission(
  userRole: UserRole | null,
  action: string
): boolean {
  if (!userRole) return false
  if (userRole === 'admin') return true // Admin has all permissions

  const permissions = PERMISSIONS[userRole] || []
  return permissions.includes(action)
}

/**
 * Check if user can access route
 */
export function canAccessRoute(userRole: UserRole | null, pathname: string): boolean {
  if (!userRole) return pathname === '/login' || pathname === '/register'

  // Admin can access everything
  if (userRole === 'admin') return true

  // Check if route is blocked for this role
  const blocked = BLOCKED_ROUTES[userRole] || []
  if (blocked.some((route) => pathname.startsWith(route))) {
    return false
  }

  // Check if route is allowed for this role
  const allowed = ALLOWED_ROUTES[userRole] || []
  return allowed.some((route) => pathname.startsWith(route)) || pathname === '/'
}

/**
 * Get role label
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    carpenter: '🪵 נגר (קונה)',
    supplier: '🏭 ספק (מוכר)',
    admin: '👨‍💼 מנהל',
  }
  return labels[role]
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    carpenter: 'קונה מוצרים ממספר ספקים',
    supplier: 'מוכר דבקים וחומרים',
    admin: 'מנהל המערכת',
  }
  return descriptions[role]
}

/**
 * Mock auth check (עד שנחבר לSupabase)
 */
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // TODO: Replace with actual Supabase auth
  const stored = typeof window !== 'undefined'
    ? localStorage.getItem('auth_user')
    : null

  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_user')
  }
}
