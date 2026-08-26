'use client'

import { ReactNode } from 'react'
import AdminNavbar from '@/components/AdminNavbar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main>{children}</main>
    </div>
  )
}
