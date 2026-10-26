import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdminLookingAtSupplier } from '@/lib/admin-scope'
import { acceptedCurrentTerms } from '@/lib/terms'
import { unreadCount } from '@/lib/messages'
import { unreadNotificationCount } from '@/lib/notifications'
import { kickOutbox } from '@/lib/outbox'
import { kickReminders } from '@/lib/reminders'
import { emailProblemFor } from '@/lib/email-delivery'
import EmailProblemBanner from '@/components/EmailProblemBanner'
import SupplierNav from './SupplierNav'
import TermsGate from '@/components/TermsGate'

export const dynamic = 'force-dynamic'

/**
 * The header only appears for a signed-in supplier.
 *
 * /supplier/join has to stay reachable by someone who has no account at all —
 * that is the whole point of it — so this layout renders the bare page when
 * there is no session rather than pushing anyone to a login they cannot pass.
 *
 * A supplier who has not accepted the current terms is asked to first. The
 * operator opening a supplier's console to look is not asked, and a banner says
 * whose console it is, so it is never mistaken for his own. For a supplier who
 * runs his own account the banner says view-only: every write route refuses
 * the operator there (see lib/admin-scope.ts). The operator signed in through
 * his own supplier's link is that supplier, not the operator looking, so he
 * gets no banner and full edit.
 */
export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const [supplier, admin] = await Promise.all([getSessionSupplier(), isAdminLookingAtSupplier()])
  const needsTerms = supplier && !admin && !acceptedCurrentTerms(supplier.terms_version)
  const [unread, notifications, emailProblem] = supplier
    ? await Promise.all([
        unreadCount({ side: 'supplier', id: supplier.id }),
        unreadNotificationCount({ side: 'supplier', id: supplier.id }),
        emailProblemFor(supplier.email),
      ])
    : [0, 0, null]

  // Retries due in the email outbox go out while people use the site.
  kickOutbox()
  kickReminders()
  return (
    <>
      {supplier && admin && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-sm font-semibold text-amber-900">
          {supplier.source === 'self'
            ? `מצב אדמין — צפייה בלבד בממשק של ${supplier.company_name}. הספק מנהל את החשבון בעצמו, ושינויים לא יישמרו.`
            : `מצב אדמין — אתה מנהל את הממשק של ${supplier.company_name}. שינויים כאן נשמרים אצלו.`}
        </div>
      )}
      {supplier && <SupplierNav company={supplier.company_name} logo={supplier.logo_url} unread={unread} notifications={notifications} />}
      {emailProblem && <EmailProblemBanner problem={emailProblem} fixHref="/supplier?tab=business" />}
      <main className="w-full flex-1 px-4 py-5">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
      {needsTerms && <TermsGate role="supplier" />}
    </>
  )
}
