import Link from 'next/link'
import { LayoutGrid, Recycle, Search, Store } from 'lucide-react'
import { loadCatalogViewer } from '@/lib/app/catalog-access'
import PublicProductGrid, { toPublicProduct } from '@/components/app/PublicProductGrid'
import { loadCategoryTree, loadProducts } from '@/lib/app/catalog-server'
import ProductList from '@/components/app/ProductList'
import { PageHeader, SectionTitle } from '@/components/app/ui'
import { CategoryList } from '../HomeView'
import { searchProducts } from '@/lib/catalog-search'
import AskAgentButton from '@/components/chat/AskAgentButton'
import { regionsForCity } from '@/lib/regions'
import { loadPublicSuppliers, type PublicSupplier } from '@/lib/app/suppliers-public'
import SupplierCard from '@/components/app/SupplierCard'
import { loadSupplierContacts } from '@/lib/supplier-contact-server'

export const dynamic = 'force-dynamic'

/**
 * The catalogue: every category the same size and clickable, in the tree's own
 * order — or, with ?q=, what matches a search across names, brands, part
 * numbers and suppliers. The agent chat runs the same search (lib/catalog-search).
 *
 * A visitor who has not registered may search too (owner, 2026-11-12): the
 * results, like the categories, show each product's photo, name and supplier,
 * with no price and no way into the product page (lib/app/catalog-access).
 */
export default async function AppCatalog({ searchParams }: { searchParams: Promise<{ q?: string; focus?: string }> }) {
  const [{ q, focus }, viewer] = await Promise.all([searchParams, loadCatalogViewer()])
  const { carpenter, showPrices, mayBrowse } = viewer
  const query = (q ?? '').trim()

  // Read on the server even for a visitor; only toPublicProduct's fields leave it.
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
    const suppliers = matchingSuppliers(await loadPublicSuppliers(products), query)
    // WhatsApp on each card for a registered carpentry only, as on the supplier page.
    const contacts = showPrices && suppliers.length ? await loadSupplierContacts(suppliers.map((s) => s.id)) : null
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
        {!mayBrowse && <SignUpStrip />}
        {suppliers.length > 0 && (
          <section>
            <SectionTitle title="ספקים" href="/app/suppliers" action="כל הספקים" />
            <div className="grid gap-2.5 md:grid-cols-2">
              {suppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} whatsapp={contacts?.get(supplier.id)?.whatsapp} />
              ))}
            </div>
          </section>
        )}
        {hits.length ? (
          mayBrowse ? (
            <ProductList products={hits} showPrices={showPrices} myRegions={regionsForCity(carpenter?.city)} />
          ) : (
            <PublicProductGrid products={hits.map(toPublicProduct)} />
          )
        ) : (
          <div className="rounded-xl border-[1.5px] border-dashed border-[#D9CFC1] p-3.5 text-sm text-muted">
            <b className="block text-ink">לא נמצא</b>
            {mayBrowse ? 'נסה שם מוצר, מותג, מק״ט או שם ספק, או תאר לעוזר הרכש מה אתה צריך.' : 'נסה שם מוצר, מותג, מק״ט או שם ספק.'}
          </div>
        )}
      </div>
    )
  }

  const categories = await loadCategoryTree(products)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader icon={LayoutGrid} title="קטלוג" subtitle="מחירים לפני מע״מ, ישירות מהספקים" />
      {search}
      {!mayBrowse && <SignUpStrip />}
      <CategoryList categories={categories} />
      <section>
        <SectionTitle title="עוד" />
        <Link href="/app/suppliers" className="mb-2.5 flex items-center gap-3 rounded-xl border border-hair bg-white px-3.5 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-navy-soft text-navy">
            <Store size={22} />
          </span>
          <span>
            <b className="block text-[15px]">ספקים</b>
            <span className="text-[13.5px] text-muted">מי מוכר כאן ומה הוא מוכר</span>
          </span>
        </Link>
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

/** Above the categories for a visitor: what registering opens. */
function SignUpStrip() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-wood-soft px-3.5 py-3">
      <span className="text-[14.5px] text-ink">
        <b>המחירים, עמוד המוצר וההזמנה פתוחים לנגריות רשומות.</b> ההרשמה חינם.
      </span>
      <Link href="/join" className="inline-flex h-10 items-center rounded-[10px] bg-brand px-4 text-sm font-bold text-navy">
        הרשמה חינם / כניסה
      </Link>
    </div>
  )
}

/** Suppliers whose name holds one of the searched words (two letters or more), at most three. */
function matchingSuppliers(suppliers: PublicSupplier[], query: string): PublicSupplier[] {
  const words = query.toLowerCase().split(/\s+/).filter((word) => word.length >= 2)
  if (!words.length) return []
  return suppliers.filter((supplier) => words.some((word) => supplier.name.toLowerCase().includes(word))).slice(0, 3)
}
