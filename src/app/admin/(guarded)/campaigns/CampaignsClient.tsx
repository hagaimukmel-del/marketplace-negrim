'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatIls } from '@/lib/vat'
import SyncButton from '../SyncButton'

interface Product {
  id: string
  name_he: string
  base_price_excl_vat: number
}

interface Campaign {
  id: string
  name: string
  kind: string
  headline_he: string | null
  is_active: boolean
  created_at: string | null
  products: { name_he: string } | null
}

const KIND_LABEL: Record<string, string> = {
  introduction: 'היכרות',
  discount: 'מבצע',
  restock: 'חידוש מלאי',
}

export default function CampaignsClient({
  products,
  campaigns,
}: {
  products: Product[]
  campaigns: Campaign[]
}) {
  const router = useRouter()
  const [productId, setProductId] = useState('')
  const [kind, setKind] = useState('introduction')
  const [headline, setHeadline] = useState('מי שלא מכיר עדיין את המוצר שלנו')
  const [body, setBody] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = products.find((p) => p.id === productId)

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selected ? `${KIND_LABEL[kind]} — ${selected.name_he}` : 'קמפיין',
          product_id: productId,
          kind,
          headline_he: headline,
          body_he: body,
          offer_price_excl_vat: kind === 'discount' ? offerPrice : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'היצירה נכשלה')
      setProductId('')
      setBody('')
      setOfferPrice('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'היצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-900">קמפיינים</h1>
        {/* The product list below comes from the catalogue, so the place to
            refresh it is next to where you pick from it. */}
        <SyncButton />
      </div>

      <section className="rounded-xl border border-stone-300 bg-white p-5">
        <h2 className="font-bold text-stone-900">קמפיין חדש</h2>
        <p className="mt-1 text-sm text-stone-600">
          קמפיין אחד פעיל בכל רגע. יצירת חדש מכבה את הקודם.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">מוצר</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-stone-300 px-2"
            >
              <option value="">בחר מוצר…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name_he} — {formatIls(Number(product.base_price_excl_vat))}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">סוג</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-stone-300 px-2"
            >
              <option value="introduction">היכרות — בלי הנחה</option>
              <option value="discount">מבצע — מחיר מיוחד</option>
              <option value="restock">חידוש מלאי</option>
            </select>
          </label>
        </div>

        {kind === 'introduction' && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
            הודעת היכרות הכניסה עד היום פי 5.4 מהודעת מבצע — ובמחיר מלא.
          </p>
        )}

        {kind === 'discount' && (
          <label className="mt-4 block">
            <span className="text-sm font-medium text-stone-700">
              מחיר מבצע ליחידה, ללא מע״מ
            </span>
            <input
              inputMode="decimal"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder={selected ? String(selected.base_price_excl_vat) : ''}
              className="mt-1 h-11 w-40 rounded-lg border border-stone-300 px-3 tabular-nums"
            />
            {selected && (
              <span className="ms-3 text-sm text-stone-500">
                מחירון: {formatIls(Number(selected.base_price_excl_vat))}
              </span>
            )}
          </label>
        )}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">כותרת</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-stone-300 px-3"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">טקסט</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 p-3"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={create}
            disabled={busy || !productId}
            className="h-11 rounded-lg bg-stone-900 px-5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'יוצר…' : 'צור והפעל'}
          </button>
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-300 bg-white">
        <h2 className="border-b border-stone-200 p-4 font-bold text-stone-900">היסטוריה</h2>
        {campaigns.length === 0 ? (
          <p className="p-6 text-sm text-stone-600">עוד לא נוצרו קמפיינים.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="p-3 text-start font-medium">מוצר</th>
                  <th className="p-3 text-start font-medium">סוג</th>
                  <th className="p-3 text-start font-medium">כותרת</th>
                  <th className="p-3 text-start font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-stone-100 last:border-b-0">
                    <td className="p-3 font-medium text-stone-900">
                      {campaign.products?.name_he ?? '—'}
                    </td>
                    <td className="p-3 text-stone-600">
                      {KIND_LABEL[campaign.kind] ?? campaign.kind}
                    </td>
                    <td className="p-3 text-stone-600">{campaign.headline_he ?? '—'}</td>
                    <td className="p-3">
                      {campaign.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          פעיל
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">הסתיים</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
