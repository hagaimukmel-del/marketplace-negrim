import { describe, expect, it } from 'vitest'

process.env.GOOGLE_CLIENT_ID = 'client-123.apps.googleusercontent.com'
const { verifiedEmail } = await import('./google-auth')

const token = (claims: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
const good = {
  iss: 'https://accounts.google.com',
  aud: 'client-123.apps.googleusercontent.com',
  exp: Math.floor(Date.now() / 1000) + 600,
  email: 'Shop@Example.com',
  email_verified: true,
}

describe('verifiedEmail', () => {
  it('reads a verified email, lower-cased', () => {
    expect(verifiedEmail(token(good))).toBe('shop@example.com')
  })

  it.each([
    ['another issuer', { iss: 'https://evil.example' }],
    ['another client', { aud: 'someone-else' }],
    ['an expired token', { exp: 1 }],
    ['an unverified email', { email_verified: false }],
    ['no email', { email: undefined }],
  ])('refuses %s', (_label, change) => {
    expect(verifiedEmail(token({ ...good, ...change }))).toBeNull()
  })

  it('refuses garbage', () => {
    expect(verifiedEmail('not-a-token')).toBeNull()
    expect(verifiedEmail('a.!!!.c')).toBeNull()
  })
})
