import Link from 'next/link'
import { LayoutGrid, Recycle, Search } from 'lucide-react'
import { loadCatalogViewer } from '@/lib/app/catalog-access'
import CatalogLocked from '@/components/app/CatalogLocked'
import { loadCategoryTree, loadProducts } from '@/lib/app/catalog-server'
import ProductList from '@/components/app/ProductList'
import { PageHeader, SectionTitle } from '@/components/app/ui'
import { CategoryList } from '../HomeView'
import { searchProducts } from '@/lib/catalog-search'
import AskAgentButton from '@/components/chat/AskAgentButton'
import { regionsForCity } from '@/lib/regions'

export const dynamic = 'force-dynamic'

/**
 * The catalogue: every category the same size and clickable, in the tree's own
 * order — or, with ?q=, what matches a search across names, brands, part
 * numbers and suppliers. The agent chat runs the same search (lib/catalog-search).
 *
 * A visitor who has not registered sees the categories only: no search, and
 * the category pages behind them ask to register (lib/app/catalog-access).
 */
export default async function AppCatalog({ searchParams }: { searchParams: Promise<{ q?: string; focus?: string }> }) {
  const [{ q, focus }, viewer] = await Promise.all([searchParams, loadCatalogViewer()])
  const { carpenter, showPrices, mayBrowse } = viewer
  const query = (q ?? '').trim()

  if (!mayBrowse && query) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <PageHeader icon={Search} title="חיפוש" />
        <CatalogLocked />
      </div>
    )
  }

  // Read on the server even for a visitor, but only the category counts leave it.
  const products = await loadProducts({ showPrices, city: carpenter?.city, popularity: mayBrowse })

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
    const { products: hits, partial } = searchProducts(products, query)
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <PageHeader
          icon={Search}
          title={<>תוצאות עבור ״{query}״</>}
          subtitle={
            <>
              <span className="tnum">{hits.length}</span> מוצרים{partial ? ' שמתאימים לחלק מהמילים' : ''} ·{' '}
              <Link href="/app/catalog" className="font-semibold text-brand-ink">לכל הקטגוריות</Link>
            </>
          }
        />
        {search}
        {carpenter && <AskAgentButton query={query} />}
        {hits.length ? (
          <ProductList products={hits} showPrices={showPrices} myRegions={regionsForCity(carpenter?.city)} />
        ) : (
          <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
            <b className="block text-ink">לא נמצא</b>
            נסה שם מוצר, מותג, מק״ט או שם ספק, או תאר לסוכן מה אתה צריך.
          </div>
        )}
      </div>
    )
  }

  const categories = await loadCategoryTree(products)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader icon={LayoutGrid} title="קטלוג" subtitle="מחירים לפני מע״מ, ישירות מהספקים" />
      {mayBrowse ? search : <SignUpStrip />}
      <CategoryList categories={categories} />
      <section>
        <SectionTitle title="עוד" />
        <Link href="/app/metzion" className="flex items-center gap-3 rounded-xl border border-[#E6D6C2] bg-wood-soft px-3.5 py-3">
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

/** Above the categories for a visitor: why the categories do not open yet. */
function SignUpStrip() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-wood-soft px-3.5 py-3">
      <span className="text-[14.5px] text-ink">
        <b>המוצרים, הספקים והמחירים פתוחים לנגריות רשומות.</b> ההרשמה חינם.
      </span>
      <Link href="/join" className="inline-flex h-10 items-center rounded-[10px] bg-brand px-4 text-sm font-bold text-navy">
        הרשמה חינם / כניסה
      </Link>
    </div>
  )
}
