import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { acceptedCurrentTerms } from '@/lib/terms'
import CarpenterNav from '@/components/CarpenterNav'
import TermsGate from '@/components/TermsGate'
import SiteFooter from '@/components/SiteFooter'

export const dynamic = 'force-dynamic'

/**
 * The header was missing here entirely.
 *
 * /join and the offer page sit outside the /carpenter tree, so neither carried
 * the nav — which meant the personal area and the way to sign out existed but
 * were unreachable from the two pages a carpenter sees first. Someone who had
 * just registered had to find their way to the catalogue before the site would
 * admit it knew who they were.
 */
export default async function OfferLayout({ children }: { children: React.ReactNode }) {
  const [carpenter, admin] = await Promise.all([getSessionCarpenter(), isAdmin()])
  const needsTerms = carpenter && !admin && !acceptedCurrentTerms(carpenter.terms_version)

  return (
    <>
      <CarpenterNav
        session={carpenter ? { name: carpenter.business_name, token: carpenter.token } : null}
      />
      <main className="w-full flex-1">{children}</main>
      <SiteFooter />
      {needsTerms && <TermsGate role="carpenter" />}
    </>
  )
}
