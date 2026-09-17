import Link from 'next/link'
import { Recycle, Search } from 'lucide-react'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { isAdmin } from '@/lib/admin-auth'
import { loadCategoryTree, loadProducts } from '@/lib/app/catalog-server'
import ProductList from '@/components/app/ProductList'
import { SectionTitle } from '@/components/app/ui'
import { CategoryList } from '../HomeView'

export const dynamic = 'force-dynamic'

/**
 * The catalogue: every category the same size and clickable, in the tree's own
 * order — or, with ?q=, what matches a search across names, brands, part
 * numbers and suppliers.
 */
export default async function AppCatalog({ searchParams }: { searchParams: Promise<{ q?: string; focus?: string }> }) {
  const [{ q, focus }, carpenter, admin] = await Promise.all([searchParams, getSessionCarpenter(), isAdmin()])
  const showPrices = Boolean(carpenter) || admin
  const products = await loadProducts({ showPrices })
  const query = (q ?? '').trim()

  const search = (
    <form action="/app/catalog" className="relative md:hidden">
      <Search size={20} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        name="q"
        type="search"
        defaultValue={query}
        autoFocus={focus === 'search'}
        placeholder="מה אתה צריך? מוצר או ספק"
        aria-label="חיפוש"
        className="h-[50px] w-full rounded-xl border-[1.5px] border-hair bg-white ps-11 pe-3.5 text-base placeholder:text-faint"
      />
    </form>
  )

  if (query) {
    const needle = query.toLowerCase()
    const hits = products.filter((p) =>
      [p.name, p.brand, p.mpn, ...p.offers.map((o) => o.supplierName)].some((field) => field?.toLowerCase().includes(needle))
    )
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {search}
        <div>
          <h1 className="m-0 text-2xl font-extrabold md:text-[28px]">תוצאות עבור ״{query}״</h1>
          <div className="text-[14.5px] text-muted">
            <span className="tnum">{hits.length}</span> מוצרים · <Link href="/app/catalog" className="font-semibold text-brand-ink">לכל הקטגוריות</Link>
          </div>
        </div>
        {hits.length ? (
          <ProductList products={hits} showPrices={showPrices} />
        ) : (
          <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
            <b className="block text-ink">לא נמצא</b>
            נסה שם מוצר, מותג, מק״ט או שם ספק.
          </div>
        )}
      </div>
    )
  }

  const categories = await loadCategoryTree(products)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div>
        <h1 className="m-0 text-2xl font-extrabold md:text-[28px]">קטלוג</h1>
        <div className="text-[14.5px] text-muted">מחירים לפני מע״מ, ישירות מהספקים</div>
      </div>
      {search}
      <CategoryList categories={categories} />
      <section>
        <SectionTitle title="עוד" />
        <Link href="/carpenter/metzion" className="flex items-center gap-3 rounded-xl border border-[#E6D6C2] bg-wood-soft px-3.5 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white text-[#6B4E2E]">
            <Recycle size={22} />
          </span>
          <span>
            <b className="block text-[15px]">מציאון</b>
            <span className="text-[13.5px] text-[#6B4E2E]">עודפים ומכונות מנגרים לנגרים</span>
          </span>
        </Link>
      </section>
    </div>
  )
}
