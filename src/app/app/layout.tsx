import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { canUseApp } from '@/lib/app/access'
import AppFrame from '@/components/app/AppFrame'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'נגרים B2B — מרכז הרכש',
}

/** The purchasing app. APP_LIVE decides whether anyone but the operator may use it. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await canUseApp())) redirect('/join')
  return <AppFrame>{children}</AppFrame>
}
