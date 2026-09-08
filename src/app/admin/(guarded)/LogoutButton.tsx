'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    setBusy(true)
    // DELETE clears the session cookie server-side; it is httpOnly, so the
    // browser cannot drop it on its own.
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="ms-auto flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">{busy ? 'יוצא…' : 'יציאה'}</span>
    </button>
  )
}
