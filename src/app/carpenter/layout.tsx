import { getSessionCarpenter } from '@/lib/carpenter-auth'
import CarpenterNav from '@/components/CarpenterNav'

export const dynamic = 'force-dynamic'

/**
 * The nav needs the server's view of who this is, not the browser's.
 *
 * Those are two different answers now. localStorage remembers a token; the
 * signed cookie is what actually decides whether a price is rendered. A header
 * that reads the first one can cheerfully say "your page" to someone the server
 * treats as a stranger — and, worse, can offer no way out of a session it
 * cannot see.
 */
export default async function CarpenterLayout({ children }: { children: React.ReactNode }) {
  const carpenter = await getSessionCarpenter()

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
    </>
  )
}
