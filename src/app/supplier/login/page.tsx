'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SupplierLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/supplier-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'התחברות נכשלה')
      }

      // Save session to localStorage
      localStorage.setItem('supplier_session', JSON.stringify(data.supplier))
      localStorage.setItem('supplier_token', data.token)

      // Redirect to dashboard
      router.push('/supplier')
    } catch (error: any) {
      setError(error.message || 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-900 to-green-700 bg-clip-text text-transparent mb-2">
            🏢 ספק
          </h1>
          <p className="text-gray-600">התחברות לחשבון הספק</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/40 p-8 shadow-lg space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📧 מייל
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@example.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔑 סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-green-600 text-white font-bold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? '⏳ מחכה...' : '🚀 התחבר'}
            </button>
          </form>

          {/* Demo Login */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center mb-2">
              🧪 Demo (לבדיקה בלבד):
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail('supplier@example.com')
                setPassword('demo123')
              }}
              className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-sm"
            >
              מלא נתוני דמו
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>
            עדיין אין לך חשבון?{' '}
            <Link
              href="/supplier/register"
              className="text-amber-600 hover:underline font-semibold"
            >
              הרשם כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
