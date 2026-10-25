import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { deliveryUpdateOf, verifyResendSignature } from './resend-webhook'

const key = Buffer.from('a test signing key, 32 bytes!!!!')
const secret = `whsec_${key.toString('base64')}`
const now = 1_790_000_000

function sign(id: string, timestamp: number, body: string): string {
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`
}

describe('verifyResendSignature', () => {
  const body = '{"type":"email.delivered"}'

  it('accepts a correctly signed, fresh report', () => {
    expect(verifyResendSignature(secret, { id: 'msg_1', timestamp: String(now), signature: sign('msg_1', now, body) }, body, now)).toBe(true)
  })

  it('accepts when one of several signatures matches', () => {
    const signature = `v1,AAAA ${sign('msg_1', now, body)}`
    expect(verifyResendSignature(secret, { id: 'msg_1', timestamp: String(now), signature }, body, now)).toBe(true)
  })

  it('refuses a changed body, a wrong secret, a stale timestamp or no secret', () => {
    const headers = { id: 'msg_1', timestamp: String(now), signature: sign('msg_1', now, body) }
    expect(verifyResendSignature(secret, headers, `${body} `, now)).toBe(false)
    expect(verifyResendSignature(`whsec_${Buffer.from('another key').toString('base64')}`, headers, body, now)).toBe(false)
    expect(verifyResendSignature(secret, headers, body, now + 600)).toBe(false)
    expect(verifyResendSignature(undefined, headers, body, now)).toBe(false)
    expect(verifyResendSignature(secret, { ...headers, signature: null }, body, now)).toBe(false)
  })
})

describe('deliveryUpdateOf', () => {
  it('marks a delivered mail', () => {
    expect(deliveryUpdateOf({ type: 'email.delivered', data: { email_id: 'e1', to: ['a@x.com'] } })).toMatchObject({
      providerId: 'e1',
      status: 'delivered',
      suppress: [],
    })
  })

  it('suppresses the address on a permanent bounce, not on a soft one', () => {
    const hard = deliveryUpdateOf({ type: 'email.bounced', data: { email_id: 'e1', to: ['A@X.com'], bounce: { type: 'Permanent', message: 'no such user' } } })
    expect(hard).toMatchObject({ status: 'bounced', detail: 'no such user', suppress: [{ email: 'a@x.com', reason: 'bounced' }] })
    const soft = deliveryUpdateOf({ type: 'email.bounced', data: { email_id: 'e1', to: ['a@x.com'], bounce: { type: 'Transient' } } })
    expect(soft).toMatchObject({ status: 'bounced', suppress: [] })
  })

  it('stops mailing someone who marked it as spam', () => {
    expect(deliveryUpdateOf({ type: 'email.complained', data: { email_id: 'e1', to: 'a@x.com' } })?.suppress).toEqual([
      { email: 'a@x.com', reason: 'complained' },
    ])
  })

  it('ignores reports that change nothing, and reports without an id', () => {
    expect(deliveryUpdateOf({ type: 'email.opened', data: { email_id: 'e1' } })).toBeNull()
    expect(deliveryUpdateOf({ type: 'email.delivery_delayed', data: { email_id: 'e1' } })).toBeNull()
    expect(deliveryUpdateOf({ type: 'email.delivered', data: {} })).toBeNull()
  })
})
