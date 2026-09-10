import 'server-only'

/**
 * Sending mail, with two safety valves.
 *
 * Nothing is configured yet - there is no domain, so there is no sending
 * address - and the site still has to work. So a missing provider key is a
 * normal state, not an error: the message is logged in full and the caller is
 * told it was not sent. An order must never fail because a notification could
 * not go out.
 *
 * The second valve matters more while this is being built. EMAIL_TEST_RECIPIENT
 * redirects every message to one inbox, with a banner naming who it was really
 * addressed to. Real supplier addresses sit in the production database; without
 * this, one test run mails an actual company.
 */

export interface SendResult {
  sent: boolean
  reason?: 'no-provider' | 'failed'
  redirectedTo?: string
  error?: string
}

/** The address a link in an email has to point at. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  // The production hostname, not the per-deployment one: a link in an email
  // outlives the deployment that sent it.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (production) return `https://${production}`

  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`

  return 'http://localhost:3000'
}

/**
 * Resend's shared sender works with no domain and no DNS, but only delivers to
 * the address that owns the Resend account. That is exactly enough to test the
 * whole path before a domain exists.
 */
const FALLBACK_FROM = 'שוק הנגרים <onboarding@resend.dev>'

function banner(realRecipient: string): string {
  return `
    <div dir="rtl" style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:16px;font:14px/1.5 Arial,sans-serif;color:#78350f">
      <strong>בדיקה.</strong> המייל הזה היה אמור להישלח אל <strong>${realRecipient}</strong>.
    </div>`
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const testRecipient = process.env.EMAIL_TEST_RECIPIENT

  const recipient = testRecipient || to
  const body = testRecipient && testRecipient !== to ? banner(to) + html : html

  if (!apiKey) {
    // Deliberately loud in the log and silent to the user: this is the state the
    // project is in until a domain and a provider key exist.
    console.info(
      `[email] not sent (no RESEND_API_KEY). to=${recipient} subject=${subject}` +
        (testRecipient && testRecipient !== to ? ` (really for ${to})` : '')
    )
    return { sent: false, reason: 'no-provider' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || FALLBACK_FROM,
        to: [recipient],
        subject,
        html: body,
        // A supplier hitting reply should reach a person, not a void.
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('[email] send failed', response.status, detail)
      return { sent: false, reason: 'failed', error: detail.slice(0, 300) }
    }

    return {
      sent: true,
      ...(testRecipient && testRecipient !== to ? { redirectedTo: testRecipient } : {}),
    }
  } catch (err) {
    console.error('[email] send threw', err)
    return { sent: false, reason: 'failed', error: err instanceof Error ? err.message : 'unknown' }
  }
}
