'use client'

import type { ReactNode } from 'react'
import { telUrl, whatsappUrl } from '@/lib/phone'

/**
 * The one WhatsApp or call button to a supplier (communication plan, step 4).
 *
 * WhatsApp is click-to-chat: it opens the carpenter's own WhatsApp on the
 * supplier's number with a prepared message. Only a mobile number gets one;
 * for a landline, or no number, nothing renders and the call button stays.
 *
 * With an order, the press is reported (sendBeacon, never blocking the link)
 * so the order's history shows that the carpenter reached out off the site.
 */
export default function ContactLink({
  channel,
  phone,
  text,
  orderId,
  className,
  ariaLabel,
  children,
}: {
  channel: 'whatsapp' | 'phone'
  phone: string | null | undefined
  text?: string
  orderId?: string
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const href = channel === 'whatsapp' ? whatsappUrl(phone, text) : telUrl(phone)
  if (!href) return null

  const report = () => {
    if (!orderId) return
    try {
      const payload = new Blob([JSON.stringify({ channel })], { type: 'application/json' })
      navigator.sendBeacon(`/api/app/orders/${orderId}/contact`, payload)
    } catch {
      // Reporting is a nicety; the call or chat goes ahead either way.
    }
  }

  return (
    <a
      href={href}
      onClick={report}
      aria-label={ariaLabel}
      className={className}
      {...(channel === 'whatsapp' ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {children}
    </a>
  )
}
