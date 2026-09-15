import { getSessionSupplier } from '@/lib/supplier-auth'
import SupplierNav from './SupplierNav'

export const dynamic = 'force-dynamic'

/**
 * The header only appears for a signed-in supplier.
 *
 * /supplier/join has to stay reachable by someone who has no account at all —
 * that is the whole point of it — so this layout renders the bare page when
 * there is no session rather than pushing anyone to a login they cannot pass.
 */
export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const supplier = await getSessionSupplier()

  return (
    <>
      {supplier && <SupplierNav company={supplier.company_name} logo={supplier.logo_url} />}
      <main className="w-full flex-1 px-4 py-5">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </>
  )
}
