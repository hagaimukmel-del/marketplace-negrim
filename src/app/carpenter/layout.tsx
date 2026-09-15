import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { acceptedCurrentTerms } from '@/lib/terms'
import CarpenterNav from '@/components/CarpenterNav'
import TermsGate from '@/components/TermsGate'
import SiteFooter from '@/components/SiteFooter'

export const dynamic = 'force-dynamic'

/**
 * The nav needs the server's view of who this is, not the browser's.
 *
 * Those are two different answers now. localStorage remembers a token; the
 * signed cookie is what actually decides whether a price is rendered. A header
 * that reads the first one can cheerfully say "your page" to someone the server
 * treats as a stranger — and, worse, can offer no way out of a session it
 * cannot see.
 *
 * A signed-in carpenter who has not accepted the current terms is asked to
 * before the page can be used. The operator looking at the site is not: he is
 * not the carpenter, and must not accept on their behalf.
 */
export default async function CarpenterLayout({ children }: { children: React.ReactNode }) {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  const needsTerms = carpenter && !admin && !acceptedCurrentTerms(carpenter.terms_version)

  return (
    <>
      <CarpenterNav
        session={
          carpenter ? { name: carpenter.business_name, token: carpenter.token } : null
        }
      />
      {/* Same max width as the nav. They were 7xl and 3xl, so the header and
          the content it sits above did not line up. */}
      <main className="w-full flex-1 px-4 py-5">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
      <SiteFooter />
      {needsTerms && <TermsGate role="carpenter" />}
    </>
  )
}
