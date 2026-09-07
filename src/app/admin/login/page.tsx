'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'התחברות נכשלה')
      router.replace('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'התחברות נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-stone-300 bg-white p-6"
      >
        <h1 className="text-lg font-bold text-stone-900">שוק הנגרים · ניהול</h1>
        <p className="mt-1 text-sm text-stone-600">הזן סיסמת מפעיל</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          aria-label="סיסמה"
          className="mt-4 h-12 w-full rounded-lg border border-stone-300 px-3"
        />

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 h-12 w-full rounded-lg bg-stone-900 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'בודק…' : 'כניסה'}
        </button>
      </form>
    </main>
  )
}
