'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!email.trim()) {
      newErrors.email = 'מייל נדרש'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'מייל לא תקין'
    }

    if (!password.trim()) {
      newErrors.password = 'סיסמה נדרשת'
    } else if (password.length < 6) {
      newErrors.password = 'סיסמה חייבת להיות לפחות 6 תווים'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)

    // בעתיד: התחברות לSupabase
    alert('התחברת בהצלחה!')
    // window.location.href = '/catalog'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-block bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-2xl mb-4">
            <span className="text-4xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace Negrim</h1>
          <p className="text-gray-600 text-sm mt-2">שוק הנגרים • B2B Marketplace</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">התחברות</h2>
            <p className="text-gray-600 text-sm">כנס לחשבון שלך כדי להמשיך</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2.5">מייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none ${
                  errors.email
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
              />
              {errors.email && <p className="text-red-600 text-sm mt-1.5 font-medium">❌ {errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2.5">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none ${
                  errors.password
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
              />
              {errors.password && <p className="text-red-600 text-sm mt-1.5 font-medium">❌ {errors.password}</p>}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="remember" className="text-sm text-gray-700 font-medium">
                זכור אותי
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
            >
              {isLoading ? '⏳ כנסתי...' : '🔓 התחברות'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 font-medium">או</span>
            </div>
          </div>

          {/* Social Login */}
          <button className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-3">
            <span>🔐</span>
            התחברות דרך Google
          </button>

          {/* Footer Links */}
          <div className="space-y-3 text-sm text-center pt-2 border-t border-gray-200">
            <div>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                שכחת סיסמה?
              </a>
            </div>
            <div className="text-gray-600">
              אין לך חשבון?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-bold transition-colors">
                הרשם כאן
              </Link>
            </div>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 text-sm text-blue-900">
          <p className="font-bold mb-3 flex items-center gap-2">
            <span>🧪</span> נתוני דוגמה:
          </p>
          <div className="space-y-1 text-blue-800 text-xs font-mono">
            <p>📧 <span className="font-medium">dov@example.com</span></p>
            <p>🔑 <span className="font-medium">123456</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
