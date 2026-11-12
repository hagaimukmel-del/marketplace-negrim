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
 * From a product or supplier page (`track`), it is counted for the supplier.
 */
export default function ContactLink({
  channel,
  phone,
  text,
  orderId,
  track,
  className,
  ariaLabel,
  children,
}: {
  channel: 'whatsapp' | 'phone'
  phone: string | null | undefined
  text?: string
  orderId?: string
  track?: { supplierId: string; source: 'product' | 'supplier'; productId?: string }
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const href = channel === 'whatsapp' ? whatsappUrl(phone, text) : telUrl(phone)
  if (!href) return null

  const report = () => {
    const url = orderId ? `/api/app/orders/${orderId}/contact` : track ? `/api/app/suppliers/${track.supplierId}/contact` : null
    if (!url) return
    try {
      const body = track && !orderId ? { channel, source: track.source, productId: track.productId } : { channel }
      navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: 'application/json' }))
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
