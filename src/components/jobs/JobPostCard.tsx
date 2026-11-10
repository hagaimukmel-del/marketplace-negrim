'use client'

import { useState } from 'react'
import { CalendarDays, Clock, Coins, Hammer, MapPin, MessageCircle, Phone, Store } from 'lucide-react'
import { formatPhone, telUrl, whatsappUrl } from '@/lib/phone'
import { daysLabel, jobRegionName, jobScopeName, postedAgo, type JobCard } from '@/lib/jobs'

/**
 * One ad, as it sits on the board and in the form's preview.
 *
 * The phone is not in the page until "הצג טלפון" is tapped; then a call button,
 * and WhatsApp when it is a mobile number. `preview` shows the buttons without
 * making them do anything.
 */
export default function JobPostCard({ card, preview = false, now }: { card: JobCard; preview?: boolean; now?: number }) {
  const [contact, setContact] = useState<{ phone: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reveal = async () => {
    if (preview || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/jobs/contact?id=${encodeURIComponent(card.id)}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'לא הצלחנו להציג את הטלפון')
      setContact({ phone: data.phone })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו להציג את הטלפון')
    } finally {
      setBusy(false)
    }
  }

  const supplier = card.side === 'supplier'
  const scope = jobScopeName(card.scope)
  const days = daysLabel(card)
  const message = `שלום, ראיתי את המודעה "${card.role}" בדרושים של נגרים B2B`

  return (
    <article className="rounded-2xl border border-hair bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[13px] font-extrabold ${supplier ? 'bg-brand-soft text-brand-ink' : 'bg-navy-soft text-navy'}`}>
          {supplier ? 'ספק' : 'נגרייה'}
        </span>
        <span className="text-[12.5px] text-muted">
          {card.mine && <b className="me-2 text-navy">שלכם</b>}
          {preview ? 'עכשיו' : postedAgo(card.createdAt, now)}
        </span>
      </div>

      <h3 className="mt-2 text-[19px] font-extrabold leading-snug text-ink">{card.role || 'תפקיד'}</h3>
      <p className="mt-0.5 flex items-center gap-1.5 text-[14.5px] font-bold text-ink">
        {supplier ? <Store size={15} className="text-muted" /> : <Hammer size={15} className="text-muted" />}
        {card.businessName || 'שם העסק'}
      </p>

      <ul className="m-0 mt-2.5 grid list-none gap-1.5 p-0 text-[14.5px] text-ink">
        <li className="flex items-center gap-2">
          <MapPin size={16} className="shrink-0 text-faint" />
          {[card.region && jobRegionName(card.region), card.location].filter(Boolean).join(' · ')}
        </li>
        {days && (
          <li className="tnum flex items-center gap-2">
            <CalendarDays size={16} className="shrink-0 text-faint" />
            {days}
          </li>
        )}
        {scope && (
          <li className="flex items-center gap-2">
            <Clock size={16} className="shrink-0 text-faint" />
            {scope}
          </li>
        )}
        {card.salary && (
          <li className="tnum flex items-center gap-2 font-extrabold">
            <Coins size={16} className="shrink-0 text-faint" />
            {card.salary}
          </li>
        )}
      </ul>

      {card.description && <p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-relaxed text-stone-700">{card.description}</p>}

      {!card.mine && (
        <div className="mt-3 border-t border-hair pt-3">
          {contact ? (
            <div className="grid gap-2">
              <p dir="ltr" className="tnum text-end text-xl font-extrabold text-ink">{formatPhone(contact.phone)}</p>
              <div className={`grid gap-2 ${whatsappUrl(contact.phone) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {whatsappUrl(contact.phone) && (
                  <a
                    href={whatsappUrl(contact.phone, message) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center justify-center gap-1.5 rounded-[11px] bg-brand font-bold text-navy hover:bg-brand-hover"
                  >
                    <MessageCircle size={17} />
                    וואטסאפ
                  </a>
                )}
                <a
                  href={telUrl(contact.phone) ?? `tel:${contact.phone}`}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-hair bg-white font-bold text-ink"
                >
                  <Phone size={17} />
                  התקשרות
                </a>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={reveal}
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[11px] bg-brand font-bold text-navy hover:bg-brand-hover disabled:opacity-60"
            >
              <Phone size={17} />
              {busy ? 'רגע…' : 'הצג טלפון'}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      )}
    </article>
  )
}
