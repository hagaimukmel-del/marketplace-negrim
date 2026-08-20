'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, hasPermission, canAccessRoute } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: ('carpenter' | 'supplier' | 'admin')[]
  requiredPermission?: string
  fallback?: ReactNode
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Check role
      if (requiredRole && !requiredRole.includes(currentUser.role)) {
        setHasAccess(false)
        return
      }

      // Check permission
      if (requiredPermission && !hasPermission(currentUser.role, requiredPermission)) {
        setHasAccess(false)
        return
      }

      // Check route access
      if (!canAccessRoute(currentUser.role, window.location.pathname)) {
        setHasAccess(false)
        return
      }

      setHasAccess(true)
      setIsLoading(false)
    }

    checkAccess()
  }, [router, requiredRole, requiredPermission])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">בדוק הרשאות...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">גישה נחסמת</h1>
            <p className="text-gray-600 mb-6">
              אין לך הרשאות לגשת לעמוד זה
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              חזור לעמוד הבית
            </button>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
