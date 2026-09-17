import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { acceptedCurrentTerms } from '@/lib/terms'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import { attentionOf } from '@/lib/app/orders'
import TermsGate from '@/components/TermsGate'
import AppShell from './AppShell'

function nowMs(): number {
  return Date.now()
}

/**
 * The app's frame with what it needs from the server: who is signed in, how
 * many orders want them, and whether the current terms still need accepting.
 * Shared by /app, the registration page and the personal offer page, so a
 * carpenter moves between them without the site changing under them.
 */
export default async function AppFrame({ children }: { children: React.ReactNode }) {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  const orders = carpenter ? await loadCarpenterOrders(carpenter.id) : []
  const now = nowMs()
  const attention = orders.filter((order) => attentionOf(order, now)).length
  const needsTerms = carpenter && !admin && !acceptedCurrentTerms(carpenter.terms_version)

  return (
    <AppShell attention={attention} signedIn={Boolean(carpenter)} initial={(carpenter?.business_name ?? 'נ').trim().charAt(0)}>
      {children}
      {needsTerms && <TermsGate role="carpenter" />}
    </AppShell>
  )
}
