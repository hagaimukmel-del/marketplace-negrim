import crypto from 'crypto'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

const config = {
  login: { maxAttempts: 6, windowMs: 15 * 60 * 1000 }, // 6 attempts per 15 minutes
  loginCode: { maxAttempts: 20, windowMs: 15 * 60 * 1000 }, // 20 typed login codes per 15 minutes, per network
  join: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour, per phone
  joinIp: { maxAttempts: 30, windowMs: 60 * 60 * 1000 }, // 30 sign-ups per hour, per network: a launch event shares one Wi-Fi
  supplierQuestion: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 questions per hour, per carpenter
  promoEvent: { maxAttempts: 300, windowMs: 60 * 60 * 1000 }, // "מוצר השבוע" views and adds, per network
  quoteRequest: { maxAttempts: 20, windowMs: 60 * 60 * 1000 }, // 20 quote requests per hour, per carpenter (T-023)
  message: { maxAttempts: 60, windowMs: 60 * 60 * 1000 }, // 60 messages per hour, per carpentry or supplier (key 'msg:<id>')
  supplierLink: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 supplier sign-in links per 15 minutes, per network
  supplierJoin: { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 supplier applications per hour, per network
}

/** The limit itself, for the shared check in rate-limit-shared.ts. */
export function limitOf(limitType: keyof typeof config): RateLimitConfig {
  return config[limitType]
}

// In-memory store for rate limiting (will reset on server restart)
// For production, use Redis or a similar distributed cache
const attempts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limitType: keyof typeof config
): { allowed: boolean; remaining: number; resetTime: number } {
  const cfg = config[limitType]
  const now = Date.now()
  const record = attempts.get(identifier)

  if (!record || now > record.resetTime) {
    attempts.set(identifier, { count: 1, resetTime: now + cfg.windowMs })
    return { allowed: true, remaining: cfg.maxAttempts - 1, resetTime: now + cfg.windowMs }
  }

  if (record.count >= cfg.maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: cfg.maxAttempts - record.count, resetTime: record.resetTime }
}

export function getRateLimitHeaders(limitResult: {
  remaining: number
  resetTime: number
}): Record<string, string> {
  return {
    'X-RateLimit-Remaining': limitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(limitResult.resetTime).toISOString(),
  }
}

// Helper to get IP from request (works on Vercel)
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const vercelIP = request.headers.get('x-vercel-forwarded-for')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (vercelIP) {
    return vercelIP
  }

  return 'unknown'
}

// Helper to anonymize email for rate limiting (hash it)
export function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)
}
