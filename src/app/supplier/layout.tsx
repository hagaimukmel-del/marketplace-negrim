import { getSessionSupplier } from '@/lib/supplier-auth'
import { isAdmin } from '@/lib/admin-auth'
import { acceptedCurrentTerms } from '@/lib/terms'
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
 * whose console it is, so it is never mistaken for his own.
 */
export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const [supplier, admin] = await Promise.all([getSessionSupplier(), isAdmin()])
  const needsTerms = supplier && !admin && !acceptedCurrentTerms(supplier.terms_version)

  return (
    <>
      {supplier && admin && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">
          מצב אדמין — אתה צופה בממשק של {supplier.company_name}. שינויים כאן נשמרים אצלו.
        </div>
      )}
      {supplier && <SupplierNav company={supplier.company_name} logo={supplier.logo_url} />}
      <main className="w-full flex-1 px-4 py-5">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
      {needsTerms && <TermsGate role="supplier" />}
    </>
  )
}
