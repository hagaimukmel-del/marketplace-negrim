'use client'

import { useState } from 'react'

/**
 * "Confirm your email": a carpentry whose address is not confirmed gets no
 * supplier answer by email, only under the bell. Shown where that matters
 * (before the first order, on the quote list), with a button that sends the
 * confirmation mail again.
 */
export default function ConfirmEmailNotice({ email, title, text }: { email: string | null; title: string; text: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const resend = async () => {
    setState('sending')
    try {
      const response = await fetch('/api/carpenter/login-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ self: true }) })
      setState(response.ok ? 'sent' : 'failed')
    } catch {
      setState('failed')
    }
  }
  return (
    <div role="status" className="rounded-2xl border border-brand-line bg-brand-soft p-3.5 text-[#5B3A07]">
      <b className="block">{title}</b>
      <p className="m-0 mt-1 text-sm">
        שלחנו מייל ל-<span dir="ltr">{email ?? 'הכתובת שלכם'}</span>. {text}
      </p>
      <button type="button" onClick={resend} disabled={state === 'sending' || state === 'sent'} className="mt-2 h-10 rounded-[10px] border-[1.5px] border-brand-line bg-white px-3 text-sm font-bold text-navy disabled:opacity-60">
        {state === 'sending' ? 'שולח…' : state === 'sent' ? 'נשלח, בדקו את המייל' : 'שלחו לי את המייל שוב'}
      </button>
      {state === 'failed' && <p className="m-0 mt-1 text-sm text-red-800">השליחה נכשלה. בדקו את המייל באזור האישי ונסו שוב.</p>}
    </div>
  )
}
