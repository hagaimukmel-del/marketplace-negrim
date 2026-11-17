import { redirect } from 'next/navigation'
import { after } from 'next/server'
import type { Metadata } from 'next'
import { canUseApp } from '@/lib/app/access'
import AppFrame from '@/components/app/AppFrame'
import { getCarpenterId, touchCarpenterSeen } from '@/lib/carpenter-auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'נגרים B2B — מרכז הרכש',
}

/**
 * The purchasing app. APP_LIVE decides whether anyone but the operator may use it.
 * Each visit by a registered carpentry updates its last visit (at most hourly).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await canUseApp())) redirect('/join')
  // A registered carpentry's last visit, after the page is sent (PR 4).
  const carpenterId = await getCarpenterId()
  if (carpenterId) after(() => touchCarpenterSeen(carpenterId).catch(() => undefined))
  return <AppFrame>{children}</AppFrame>
}
