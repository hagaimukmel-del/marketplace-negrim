import { getSessionCarpenter } from '@/lib/carpenter-auth'
import CarpenterNav from '@/components/CarpenterNav'

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
  const carpenter = await getSessionCarpenter()

  return (
    <>
      <CarpenterNav
        session={carpenter ? { name: carpenter.business_name, token: carpenter.token } : null}
      />
      <main className="w-full flex-1">{children}</main>
    </>
  )
}
