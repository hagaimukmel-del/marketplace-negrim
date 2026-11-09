import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isMarketingUnsubscribeSignature } from '@/lib/promo-carpenters-rules'

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#fafaf9;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1c1917">
<main style="max-width:440px;margin:15vh auto;padding:24px;background:#fff;border:1px solid #e7e5e4;border-radius:12px;text-align:center">
<h1 style="margin:0;font-size:20px">${title}</h1>${body}
</main></body></html>`
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

const ACCOUNT_LINK = '<p style="margin:16px 0 0"><a href="/app/account" style="color:#0E5E5E;font-weight:bold">להגדרות החשבון</a></p>'

function verified(request: NextRequest): string | null {
  const carpenterId = request.nextUrl.searchParams.get('c') ?? ''
  const signature = request.nextUrl.searchParams.get('t') ?? ''
  const secret = process.env.ADMIN_SECRET
  if (!/^[0-9a-f-]{36}$/i.test(carpenterId) || !secret || !isMarketingUnsubscribeSignature(carpenterId, signature, secret)) return null
  return carpenterId
}

function invalid(): Response {
  return page('הקישור לא תקין', `<p style="margin:8px 0 0;color:#57534e">אפשר להפסיק את הדיוור בהגדרות החשבון באתר.</p>${ACCOUNT_LINK}`, 400)
}

/**
 * The "להסרה מרשימת התפוצה" link in every "מוצר השבוע" mail. Opening it shows
 * one button and does nothing else: mail scanners open links, and a refusal
 * must come from the carpentry. The button needs no sign-in, because the
 * signature proves the link came from us for this carpentry.
 */
export async function GET(request: NextRequest) {
  if (!verified(request)) return invalid()
  const action = `${request.nextUrl.pathname}${request.nextUrl.search}`
  return page(
    'הסרה מרשימת התפוצה',
    `<p style="margin:8px 0 0;color:#57534e">לא נשלח לכם יותר מייל על מבצעים ומוצר השבוע. מיילים על ההזמנות שלכם ימשיכו להגיע.</p>
<form method="post" action="${action.replace(/"/g, '&quot;')}" style="margin:16px 0 0">
<button type="submit" style="background:#1c1917;color:#fff;border:0;border-radius:10px;padding:12px 20px;font:bold 16px Arial,Helvetica,sans-serif;cursor:pointer">להסיר אותי</button>
</form>`
  )
}

export async function POST(request: NextRequest) {
  const carpenterId = verified(request)
  if (!carpenterId) return invalid()
  const { error } = await getSupabaseAdmin()
    .from('carpenters')
    .update({ marketing_consent: false, updated_at: new Date().toISOString() })
    .eq('id', carpenterId)
  if (error) return page('משהו השתבש', `<p style="margin:8px 0 0;color:#57534e">לא הצלחנו לעדכן. נסו שוב, או השיבו למייל עם המילה "הסר".</p>`, 500)
  return page('הוסרתם מרשימת התפוצה', `<p style="margin:8px 0 0;color:#57534e">לא נשלח לכם יותר מייל על מבצעים. אפשר להצטרף מחדש בהגדרות החשבון.</p>${ACCOUNT_LINK}`)
}
