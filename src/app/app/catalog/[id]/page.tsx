import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Search } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { loadCategoryTree, loadProducts } from '@/lib/app/catalog-server'
import ProductList from '@/components/app/ProductList'
import CategoryGlyph from '@/components/app/CategoryGlyph'
import { BackLink } from '@/components/app/ui'

export const dynamic = 'force-dynamic'

/** One main category: its branches as chips, then its products. */
export default async function AppCategory({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ b?: string }>
}) {
  const [{ id }, { b }, carpenter, admin] = await Promise.all([params, searchParams, getSessionCarpenter(), isAdmin()])
  const showPrices = Boolean(carpenter) || admin
  const products = await loadProducts({ showPrices })
  const tree = await loadCategoryTree(products)
  const top = tree.find((node) => node.id === id)
  if (!top) notFound()

  const inTop = products.filter((p) => p.topId === top.id)
  const branches = top.children.filter((child) => child.count > 0)
  const branch = branches.find((child) => child.id === b) ?? null
  const shown = branch ? inTop.filter((p) => p.subId === branch.id) : inTop

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <BackLink href="/app/catalog" label="קטלוג" />
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-wood-soft text-navy">
          <CategoryGlyph icon={top.icon} size={22} />
        </span>
        <div>
          <h1 className="m-0 text-2xl font-extrabold leading-tight md:text-[28px]">{top.name}</h1>
          <div className="text-sm text-muted">{inTop.length ? <><span className="tnum">{inTop.length}</span> מוצרים · לפני מע״מ</> : 'בקרוב'}</div>
        </div>
      </div>

      {inTop.length === 0 ? (
        <>
          <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
            <b className="block text-ink">עוד אין מוצרים ב{top.name}</b>
            ספקים מצטרפים ומעלים מוצרים, והקטגוריה תתמלא בקרוב.
          </div>
          <div className="flex gap-2">
            <Link href="/app/catalog" className="inline-flex h-12 flex-1 items-center justify-center rounded-[11px] border-[1.5px] border-hair bg-white font-bold">
              חזרה לקטלוג
            </Link>
            <Link href="/app/catalog?focus=search" className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-hair bg-white font-bold">
              <Search size={18} /> חיפוש
            </Link>
          </div>
        </>
      ) : (
        <>
          {branches.length > 1 && (
            <nav className="sticky top-[60px] z-20 -mx-4 bg-warm/95 px-4 py-1.5 md:top-[73px] md:-mx-7 md:px-7" aria-label="תת-קטגוריות">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                <Chip href={`/app/catalog/${top.id}`} active={!branch}>הכול</Chip>
                {branches.map((child) => (
                  <Chip key={child.id} href={`/app/catalog/${top.id}?b=${child.id}`} active={branch?.id === child.id}>
                    {child.name}
                  </Chip>
                ))}
              </div>
            </nav>
          )}
          <ProductList products={shown} showPrices={showPrices} />
        </>
      )}
    </div>
  )
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold ${active ? 'border-navy bg-navy text-white' : 'border-hair bg-white text-ink'}`}
    >
      {children}
    </Link>
  )
}
