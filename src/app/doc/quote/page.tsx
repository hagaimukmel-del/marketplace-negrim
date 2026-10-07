import type { Metadata } from 'next'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { buyerOf } from '@/lib/app/doc-buyer'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import QuoteView from './QuoteView'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'הצעת מחיר · שוק הנגרים', robots: { index: false } }

/**
 * A price quote from the cart: one document per supplier, at today's prices.
 * The lines live in the browser; who the quote is for is read here.
 */
export default async function QuoteDocument() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="הצעת המחיר" />
  const { data } = await getSupabaseAdmin().from('carpenters').select('address, city').eq('id', carpenter.id).maybeSingle()
  const address = [data?.address, data?.city ?? carpenter.city].filter(Boolean).join(', ') || null
  return <QuoteView buyer={buyerOf(carpenter, address)} />
}
