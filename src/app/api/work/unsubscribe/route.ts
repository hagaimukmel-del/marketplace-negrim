import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isUnsubscribeSignature } from '@/lib/work-notify'

function page(title: string, text: string, status = 200): Response {
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#fafaf9;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1c1917">
<main style="max-width:440px;margin:15vh auto;padding:24px;background:#fff;border:1px solid #e7e5e4;border-radius:12px;text-align:center">
<h1 style="margin:0;font-size:20px">${title}</h1><p style="margin:8px 0 0;color:#57534e">${text}</p>
<p style="margin:16px 0 0"><a href="/app/work/profile" style="color:#0E5E5E;font-weight:bold">לפרופיל ולהגדרות ההתראות</a></p>
</main></body></html>`
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

/**
 * The link at the bottom of every נגרים עובדים ביחד email: one click turns
 * the emails off, with no sign-in, because the signature proves the link came
 * from us for this carpentry. Turning them back on is in the profile.
 */
export async function GET(request: NextRequest) {
  const carpenterId = request.nextUrl.searchParams.get('c') ?? ''
  const signature = request.nextUrl.searchParams.get('t') ?? ''
  const secret = process.env.ADMIN_SECRET
  if (!/^[0-9a-f-]{36}$/i.test(carpenterId) || !secret || !isUnsubscribeSignature(carpenterId, signature, secret)) {
    return page('הקישור לא תקין', 'אפשר להפסיק את ההתראות מהפרופיל באתר.', 400)
  }

  const { error } = await getSupabaseAdmin()
    .from('work_profiles')
    .update({ notify_email: false, updated_at: new Date().toISOString() })
    .eq('carpenter_id', carpenterId)
  if (error) return page('משהו השתבש', 'לא הצלחנו לעדכן. נסו שוב, או כבו את ההתראות בפרופיל.', 500)
  return page('ההתראות הופסקו', 'לא נשלח לכם יותר מייל מנגרים עובדים ביחד. אפשר להפעיל אותן מחדש בפרופיל.')
}
