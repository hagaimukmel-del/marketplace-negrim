'use client'

import { useState } from 'react'
import { Clock, Flag, Gift, MapPin, MessageCircle, Phone, X } from 'lucide-react'
import { formatIls } from '@/lib/vat'
import { regionName } from '@/lib/regions'
import {
  METZION_REPORT_REASONS,
  categoryLabel,
  conditionLabel,
  daysLeft,
  formatPhone,
  postedAgo,
  whatsappUrl,
  type MetzionCard,
} from '@/lib/metzion'

/**
 * One listing, opened.
 *
 * The phone is not in the page until "הצג טלפון" is tapped — then WhatsApp, with
 * a message already written, and a call button. Reporting sits at the bottom,
 * out of the way but always there.
 */
export default function ListingSheet({ card, onClose }: { card: MetzionCard; onClose: () => void }) {
  const [contact, setContact] = useState<{ name: string; phone: string } | null>(null)
  const [contactError, setContactError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [note, setNote] = useState('')
  const [reported, setReported] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const total = card.pricePerUnit != null ? card.pricePerUnit * card.quantity : null
  const left = daysLeft(card.expiresAt)

  const reveal = async () => {
    setLoading(true)
    setContactError(null)
    try {
      const response = await fetch(`/api/metzion/contact?id=${card.id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'לא הצלחנו להציג את הטלפון')
      setContact(data)
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'לא הצלחנו להציג את הטלפון')
    } finally {
      setLoading(false)
    }
  }

  const report = async () => {
    setReportError(null)
    try {
      const response = await fetch('/api/metzion/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: card.id, reason, note }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'הדיווח נכשל')
      setReported(true)
      setReporting(false)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'הדיווח נכשל')
    }
  }

  const message = `היי, ראיתי במציאון של שוק הנגרים את "${card.title}". עדיין רלוונטי?`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={card.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl">
        <div className="relative">
          <div className="flex snap-x snap-mandatory overflow-x-auto bg-navy" dir="ltr">
            {card.images.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`${card.title} — תמונה ${index + 1}`} className="aspect-[4/3] w-full shrink-0 snap-center object-contain" />
            ))}
          </div>
          {card.images.length > 1 && (
            <span className="tnum absolute bottom-2 start-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {card.images.length} תמונות · החליקו
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="absolute top-2 end-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="text-xs font-semibold text-brand-ink">
              {categoryLabel(card.category)} · {conditionLabel(card.condition)}
            </p>
            <h2 className="mt-1 text-xl font-bold leading-tight text-ink">{card.title}</h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {card.dealType === 'free' ? (
                <span className="flex items-center gap-1.5 text-lg font-bold text-brand-ink">
                  <Gift size={18} />
                  למסירה בחינם
                </span>
              ) : (
                <>
                  <span className="tnum text-2xl font-bold text-ink">{formatIls(card.pricePerUnit!)}</span>
                  <span className="text-sm text-muted">ל{card.unit}</span>
                </>
              )}
              <span className="tnum text-sm text-muted">
                כמות: {card.quantity.toLocaleString('he-IL')} {card.unit}
                {total != null && card.quantity > 1 && ` · סה״כ ${formatIls(total)}`}
              </span>
            </div>
          </div>

          {card.description && <p className="whitespace-pre-line text-ink">{card.description}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-faint" />
              {card.city} · {card.regions.map(regionName).join(' / ')}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-faint" />
              פורסם {postedAgo(card.createdAt)} · {left > 0 ? `עוד ${left} ימים` : 'פג היום'}
            </span>
          </div>

          {card.mine ? (
            <p className="rounded-[11px] bg-wood-soft p-3 text-sm text-muted">זו המודעה שלך. ניהול ועריכה — ב״המודעות שלי״.</p>
          ) : contact ? (
            <div className="rounded-xl bg-brand-soft p-3">
              <p className="text-sm text-attn">{contact.name}</p>
              <p dir="ltr" className="tnum text-end text-2xl font-bold text-ink">{formatPhone(contact.phone)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={whatsappUrl(contact.phone, message)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 items-center justify-center gap-2 rounded-[11px] bg-brand font-bold text-navy"
                >
                  <MessageCircle size={18} />
                  וואטסאפ
                </a>
                <a href={`tel:${contact.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white font-bold text-ink">
                  <Phone size={18} />
                  חיוג
                </a>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={reveal}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-brand font-bold text-navy disabled:opacity-60"
              >
                <Phone size={18} />
                {loading ? 'רגע…' : 'הצג טלפון'}
              </button>
              {contactError && <p className="mt-2 text-sm text-red-700">{contactError}</p>}
            </div>
          )}

          {!card.mine && (
            <div className="border-t border-hair pt-3">
              {reported ? (
                <p className="text-sm text-muted">תודה — הדיווח הועבר לבדיקה.</p>
              ) : reporting ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink">מה הבעיה במודעה?</p>
                  <div className="flex flex-wrap gap-2">
                    {METZION_REPORT_REASONS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setReason(item.key)}
                        aria-pressed={reason === item.key}
                        className={`h-9 rounded-full border px-3 text-sm ${
                          reason === item.key ? 'border-navy bg-navy text-white' : 'border-hair text-ink'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="metzion-report-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="פרטים (לא חובה)"
                    className="w-full rounded-[11px] border border-hair p-2 text-sm"
                  />
                  {reportError && <p className="text-sm text-red-700">{reportError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={report} disabled={!reason} className="h-10 rounded-[11px] bg-navy px-4 text-sm font-semibold text-white disabled:opacity-40">
                      שלח דיווח
                    </button>
                    <button type="button" onClick={() => setReporting(false)} className="h-10 rounded-[11px] px-3 text-sm text-muted">
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setReporting(true)} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
                  <Flag size={14} />
                  דווח על המודעה
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
