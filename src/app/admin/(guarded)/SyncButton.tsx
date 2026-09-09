'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

/**
 * Rebuilds the catalogue from the Google Sheet.
 *
 * The endpoint used to be reachable by anyone with the URL, and the way to run
 * it was to paste a curl command. Now that it needs the operator session, it
 * needs a button — which is where it belonged anyway: editing the sheet and
 * publishing the change is a routine job, not a terminal one.
 */
export default function SyncButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [overwritten, setOverwritten] = useState<{ sku: string; name_he: string }[]>([])

  const sync = async () => {
    setBusy(true)
    setResult(null)
    try {
      const response = await fetch('/api/sync-products')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'הסנכרון נכשל')
      }
      const parts = [`עודכנו ${data.synced} מוצרים`]
      if (data.retired) parts.push(`${data.retired} הוסרו`)
      if (!data.hasSkuColumn) parts.push('אין עמודת מק״ט בגיליון')
      else if (data.missingSku) parts.push(`${data.missingSku} בלי מק״ט`)
      setResult(parts.join(' · '))
      setOverwritten(data.overwritten ?? [])
      router.refresh()
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'הסנכרון נכשל')
      setOverwritten([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
      >
        <RefreshCw size={15} className={busy ? 'animate-spin' : undefined} />
        {busy ? 'מסנכרן…' : 'סנכרן מהגיליון'}
      </button>
        {result && <span className="text-sm text-stone-600">{result}</span>}
      </div>

      {overwritten.length > 0 && (
        <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            {overwritten.length} מוצרים נדרסו לפי מק״ט
          </p>
          <ul className="mt-1 space-y-0.5">
            {overwritten.map((row) => (
              <li key={row.sku} className="text-sm text-amber-900">
                <span className="font-mono text-xs">{row.sku}</span> — {row.name_he}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
