import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Resend's delivery reports (communication plan, step 2), kept apart from the
 * route so the signature check and the mapping can be tested.
 *
 * Resend signs webhooks the Svix way: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${body}` with the base64 part of the
 * `whsec_…` secret, sent as space-separated `v1,<base64>` entries in
 * `svix-signature`. A report older or newer than five minutes is refused so a
 * captured one cannot be replayed.
 */

const TOLERANCE_SECONDS = 5 * 60

export function verifyResendSignature(
  secret: string | undefined,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false
  const timestamp = Number(headers.timestamp)
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64')
  const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${body}`).digest()
  return headers.signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',')
    if (version !== 'v1' || !value) return false
    const given = Buffer.from(value, 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

export interface DeliveryUpdate {
  providerId: string
  status: 'delivered' | 'bounced' | 'failed'
  detail: string | null
  /** Addresses never to mail again, with why. */
  suppress: { email: string; reason: 'bounced' | 'complained' }[]
}

interface ResendEvent {
  type?: unknown
  data?: {
    email_id?: unknown
    to?: unknown
    bounce?: { type?: unknown; message?: unknown } | null
    failed?: { reason?: unknown } | null
  } | null
}

function recipients(to: unknown): string[] {
  const list = Array.isArray(to) ? to : typeof to === 'string' ? [to] : []
  return list.filter((value): value is string => typeof value === 'string').map((value) => value.trim().toLowerCase())
}

/**
 * What a report means for the outbox row. Null for reports that change
 * nothing (sent, opened, delayed: Resend keeps trying a delayed one itself).
 */
export function deliveryUpdateOf(event: ResendEvent): DeliveryUpdate | null {
  const providerId = typeof event.data?.email_id === 'string' ? event.data.email_id : null
  if (!providerId) return null
  const to = recipients(event.data?.to)

  switch (event.type) {
    case 'email.delivered':
      return { providerId, status: 'delivered', detail: null, suppress: [] }
    case 'email.bounced': {
      const bounce = event.data?.bounce
      // A soft bounce (a full mailbox) may clear; only a permanent one stops future mail.
      const permanent = bounce?.type !== 'Transient'
      const detail = typeof bounce?.message === 'string' ? bounce.message.slice(0, 300) : null
      return {
        providerId,
        status: 'bounced',
        detail,
        suppress: permanent ? to.map((email) => ({ email, reason: 'bounced' as const })) : [],
      }
    }
    case 'email.complained':
      // It arrived; the person marked it as spam. Keep the row delivered, stop mailing them.
      return { providerId, status: 'delivered', detail: 'סומן כספאם', suppress: to.map((email) => ({ email, reason: 'complained' as const })) }
    case 'email.failed': {
      const reason = event.data?.failed?.reason
      return { providerId, status: 'failed', detail: typeof reason === 'string' ? reason.slice(0, 300) : null, suppress: [] }
    }
    default:
      return null
  }
}
