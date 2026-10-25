'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'

/** "סמן הכל כנקרא": clears the bell without opening each line. */
export default function MarkAllRead({ apiPath }: { apiPath: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const run = async () => {
    setBusy(true)
    setError(false)
    try {
      const res = await fetch(apiPath, { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
    >
      <CheckCheck size={16} />
      {error ? 'לא הצליח, נסו שוב' : 'סמן הכל כנקרא'}
    </button>
  )
}
