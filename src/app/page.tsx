'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (userRole === 'carpenter') {
        router.push('/carpenter')
      } else if (userRole === 'supplier') {
        router.push('/supplier')
      } else if (userRole === 'admin') {
        router.push('/admin/dashboard')
      }
    }
  }, [user, userRole, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace Negrim</h1>
        <p className="text-gray-600 mt-2">טוען...</p>
      </div>
    </div>
  )
}
