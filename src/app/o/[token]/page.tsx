import { notFound } from 'next/navigation'
import { loadOfferPage, logEvent, markSeen } from '@/lib/offer'
import OfferClient from './OfferClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await loadOfferPage(token)
  return {
    title: data?.campaign?.headline_he ?? 'ההזמנה שלך — שוק הנגרים',
    // A personal link should never end up in a search index.
    robots: { index: false, follow: false },
  }
}

export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // The token is the only credential. Resolving it happens here, on the server,
  // and the carpenter's own details never travel to the browser as an id the
  // client could change.
  const data = await loadOfferPage(token)
  if (!data) notFound()

  const { carpenter, campaign, featured, reorder, suggestions } = data

  await markSeen(carpenter)
  await logEvent('offer_opened', {
    carpenter_id: carpenter.id,
    campaign_id: campaign?.id ?? null,
    product_id: featured?.id ?? null,
  })

  return (
    <OfferClient
      token={token}
      carpenterName={carpenter.business_name}
      contactName={carpenter.contact_name}
      phone={carpenter.phone}
      email={carpenter.email}
      campaignId={campaign?.id ?? null}
      headline={campaign?.headline_he ?? null}
      body={campaign?.body_he ?? null}
      kind={campaign?.kind ?? null}
      featured={featured}
      reorder={reorder}
      suggestions={suggestions}
    />
  )
}
