import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { acceptedCurrentTerms } from '@/lib/terms'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import { attentionOf } from '@/lib/app/orders'
import { unreadCount } from '@/lib/messages'
import { unreadNotificationCount } from '@/lib/notifications'
import { kickOutbox } from '@/lib/outbox'
import { carpenterEmailProblem } from '@/lib/email-delivery'
import EmailProblemBanner from '@/components/EmailProblemBanner'
import { answeredQuoteCount } from '@/lib/quotes-server'
import TermsGate from '@/components/TermsGate'
import { workBoardOpen } from '@/lib/work-server'
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
  const [orders, unread, quotes, notifications, emailProblem] = carpenter
    ? await Promise.all([
        loadCarpenterOrders(carpenter.id),
        unreadCount({ side: 'carpenter', id: carpenter.id }),
        answeredQuoteCount(carpenter.id),
        unreadNotificationCount({ side: 'carpenter', id: carpenter.id }),
        carpenterEmailProblem(carpenter.id),
      ])
    : [[], 0, 0, 0, null]
  // Retries due in the email outbox go out while people use the site.
  kickOutbox()
  const now = nowMs()
  const attention = orders.filter((order) => attentionOf(order, now)).length
  const needsTerms = carpenter && !admin && !acceptedCurrentTerms(carpenter.terms_version)

  return (
    <AppShell attention={attention} unread={unread} notifications={notifications} quotes={quotes} signedIn={Boolean(carpenter)} workOpen={workBoardOpen()} initial={(carpenter?.business_name ?? 'נ').trim().charAt(0)}>
      {emailProblem && <EmailProblemBanner problem={emailProblem} fixHref="/app/account" />}
      {children}
      {needsTerms && <TermsGate role="carpenter" />}
    </AppShell>
  )
}
