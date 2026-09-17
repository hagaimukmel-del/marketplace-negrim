import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { acceptedCurrentTerms } from '@/lib/terms'
import { canUseApp } from '@/lib/app/access'
import { loadCarpenterOrders } from '@/lib/app/orders-server'
import { attentionOf } from '@/lib/app/orders'
import AppShell from '@/components/app/AppShell'
import TermsGate from '@/components/TermsGate'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'נגרימ — מרכז הרכש',
}

function nowMs(): number {
  return Date.now()
}

/**
 * The purchasing app. Until launch only the operator reaches it; everyone else
 * is sent to the screens they have today.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await canUseApp())) redirect('/join')

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
