'use client'

import { ReactNode } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminNavbar from '@/components/AdminNavbar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main>{children}</main>
      </div>
    </ProtectedRoute>
  )
}
