import { FileText } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { loadCarpenterQuotes } from '@/lib/quotes-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import SignedOutNotice from '@/components/app/SignedOutNotice'
import { PageHeader } from '@/components/app/ui'
import QuotesView from './QuotesView'

export const dynamic = 'force-dynamic'

/** The carpentry's quote requests and the suppliers' answers (T-023). */
export default async function AppQuotes() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter)
    return (
      <>
        <PageHeader icon={FileText} title="הצעות מחיר" />
        <SignedOutNotice what="הצעות המחיר" next="/app/quotes" />
      </>
    )
  const [{ ready, quotes }, { data: contact }] = await Promise.all([
    loadCarpenterQuotes(carpenter.id),
    getSupabaseAdmin().from('carpenters').select('email, email_verified_at').eq('id', carpenter.id).maybeSingle(),
  ])
  // An unconfirmed address gets the suppliers' answers under the bell only.
  const unconfirmedEmail = contact && !contact.email_verified_at ? contact.email : undefined
  return <QuotesView ready={ready} quotes={quotes} unconfirmedEmail={unconfirmedEmail} />
}
