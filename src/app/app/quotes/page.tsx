import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { loadCarpenterQuotes } from '@/lib/quotes-server'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import QuotesView from './QuotesView'

export const dynamic = 'force-dynamic'

/** The carpentry's quote requests and the suppliers' answers (T-023). */
export default async function AppQuotes() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return <SignedOutNotice what="הצעות המחיר" next="/app/quotes" />
  const { ready, quotes } = await loadCarpenterQuotes(carpenter.id)
  return <QuotesView ready={ready} quotes={quotes} />
}
