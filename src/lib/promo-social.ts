import 'server-only'

import { getSupabaseAdmin } from './supabase-admin'
import { isTestName, sendEmail, siteUrl } from './email'
import { money } from './app/format'
import { loadCurrentPromo } from './promo'
import { currentWeek, weekLabel } from './promo-weeks'
import { isSocialHour, socialKey, socialPosts } from './promo-social-rules'
import { PROMO_REQUEST_EMAIL } from './emails/promo-request'
import { promoSocialHtml, promoSocialSubject } from './emails/promo-social'

/**
 * Sunday morning: this week's "מוצר השבוע" with ready-to-paste social posts,
 * to the owner (owner, 2026-11-09). Run by /api/cron/promo-social, or by the
 * operator from /admin/promotions with `force`.
 *
 * Any approved booking counts, the supplier's own or one the operator set.
 * The run is claimed in reminder_log under the booking's id before sending, so
 * the two Sunday crons (and any retry) mail it once.
 */

export type PromoSocialResult =
  | { sent: true; key: string }
  | { sent: false; reason: 'not-social-hour' | 'no-promo' | 'already-sent' | 'no-log' | 'send-failed'; key?: string }

function absolute(url: string | null): string | null {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  return url.startsWith('/') ? `${siteUrl()}${url}` : null
}

export async function runPromoSocial(now: Date = new Date(), { force = false } = {}): Promise<PromoSocialResult> {
  if (!force && !isSocialHour(now)) return { sent: false, reason: 'not-social-hour' }

  const promo = await loadCurrentPromo(now)
  if (!promo) return { sent: false, reason: 'no-promo' }

  const key = socialKey(promo.id)
  const supabase = getSupabaseAdmin()

  if (!force) {
    const { data, error } = await supabase
      .from('reminder_log')
      .upsert([{ key }], { onConflict: 'key', ignoreDuplicates: true })
      .select('key')
    if (error) {
      console.error('[promo-social] claim failed', error)
      return { sent: false, reason: 'no-log', key }
    }
    if (!data || data.length === 0) return { sent: false, reason: 'already-sent', key }
  }

  try {
    const [{ data: product }, { data: supplier }, { data: offer }] = await Promise.all([
      supabase.from('products').select('name_he, brand, image_url').eq('id', promo.productId).maybeSingle(),
      supabase.from('suppliers').select('company_name').eq('id', promo.supplierId).maybeSingle(),
      supabase
        .from('supplier_offers')
        .select('price_excl_vat')
        .eq('product_id', promo.productId)
        .eq('supplier_id', promo.supplierId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    ])
    if (!product || !supplier) throw new Error('product or supplier missing')

    const productUrl = `${siteUrl()}/app/product/${promo.productId}`
    const posts = socialPosts({
      productName: product.name_he,
      supplierName: supplier.company_name,
      brand: product.brand,
      priceText: promo.showPrice && offer ? money(Number(offer.price_excl_vat)) : null,
      url: productUrl,
    })
    const mail = {
      productName: product.name_he,
      supplierName: supplier.company_name,
      weekText: weekLabel(currentWeek(now)),
      imageUrl: absolute(product.image_url),
      productUrl,
      shortPost: posts.short,
      longPost: posts.long,
    }
    const result = await sendEmail({
      to: PROMO_REQUEST_EMAIL,
      subject: promoSocialSubject(mail),
      html: promoSocialHtml(mail),
      isTest: isTestName(supplier.company_name),
    })
    if (!result.sent) throw new Error(result.error ?? result.reason ?? 'not sent')
    return { sent: true, key }
  } catch (err) {
    console.error('[promo-social] failed', err)
    // Release the claim so the second Sunday run, or the operator's button, can try again.
    if (!force) await supabase.from('reminder_log').delete().eq('key', key)
    return { sent: false, reason: 'send-failed', key }
  }
}
