import Link from 'next/link'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { Building2, FileText, MapPin, MessageSquare, Truck } from 'lucide-react'
import { loadCatalogViewer } from '@/lib/app/catalog-access'
import { loadProducts } from '@/lib/app/catalog-server'
import { loadPublicSupplier, loadSupplierCatalogs, loadSupplierHead, productsOf, recordSupplierView } from '@/lib/app/suppliers-public'
import { regionName, regionsForCity } from '@/lib/regions'
import { money, termsText } from '@/lib/app/format'
import ProductList from '@/components/app/ProductList'
import PublicProductGrid, { toPublicProduct } from '@/components/app/PublicProductGrid'
import SupplierLogo from '@/components/app/SupplierLogo'
import SupplierContactButtons from '@/components/app/SupplierContactButtons'
import { loadSupplierContacts } from '@/lib/supplier-contact-server'
import { BackLink, SectionTitle } from '@/components/app/ui'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }
type PageProps = Params & { searchParams: Promise<{ contact?: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const head = await loadSupplierHead(id)
  if (!head) return { title: 'ספק — נגרים B2B' }
  return {
    title: `${head.name} — ספק בנגרים B2B`,
    description: head.about ?? `${head.name}: מוצרים לנגריות, ישירות מהספק.`,
  }
}

/**
 * A supplier's own page (product review 2026-11-12): who it is, what it sells,
 * where it delivers and its catalogues, open to anyone. Its terms (payment,
 * minimum order, lead time) and its prices are for registered carpentries.
 * Each opening is counted for the supplier, never the operator's or the
 * supplier's own, nor a link prefetch. WhatsApp and a call to the supplier are
 * the main action, for registered carpentries; a visitor's button leads to
 * registration and back (owner, 2026-11-12).
 */
export default async function SupplierPage({ params, searchParams }: PageProps) {
  const [{ id }, { contact: back }, viewer] = await Promise.all([params, searchParams, loadCatalogViewer()])
  const { carpenter, admin, showPrices, mayBrowse } = viewer
  const products = await loadProducts({ showPrices, city: carpenter?.city })
  const found = await loadPublicSupplier(id, products)
  if (!found) notFound()
  const { supplier, terms } = found

  if (!admin && !viewer.supplier && !(await headers()).has('next-router-prefetch')) {
    after(() => recordSupplierView(supplier.id).catch(() => undefined))
  }

  const [catalogs, reachable] = await Promise.all([loadSupplierCatalogs(supplier.id), loadSupplierContacts([supplier.id])])
  const contact = showPrices ? reachable.get(supplier.id) ?? null : null
  const joinHref = !mayBrowse && reachable.has(supplier.id) ? `/join?next=${encodeURIComponent(`/app/suppliers/${supplier.id}?contact=1`)}` : null
  const theirs = productsOf(supplier.id, products)
  const askHref = showPrices
    ? `/app/messages/new?supplier=${supplier.id}`
    : `/join?next=${encodeURIComponent(`/app/suppliers/${supplier.id}`)}`

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <BackLink href="/app/suppliers" label="ספקים" />

      <section className="flex flex-col gap-4 rounded-2xl border border-hair bg-white p-4 md:flex-row md:items-start md:p-5">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-hair bg-white text-muted">
          {supplier.logoUrl ? <SupplierLogo url={supplier.logoUrl} size={76} /> : <Building2 size={34} />}
        </span>
        <div className="grid min-w-0 flex-1 gap-2">
          <h1 className="m-0 text-2xl font-extrabold leading-tight text-navy md:text-[28px]">{supplier.name}</h1>
          {supplier.city && (
            <span className="inline-flex items-center gap-1.5 text-[14.5px] text-muted">
              <MapPin size={15} /> {supplier.city}
            </span>
          )}
          {supplier.about && <p className="m-0 whitespace-pre-line text-[15.5px] leading-relaxed text-ink">{supplier.about}</p>}
          {supplier.regions.length > 0 && (
            <p className="m-0 flex flex-wrap items-center gap-1.5 text-[14px] text-muted">
              <Truck size={15} className="shrink-0" /> מספק ל:
              {supplier.regions.map((region) => (
                <span key={region} className="rounded-full bg-warm px-2.5 py-0.5 text-[13px] font-semibold text-ink">
                  {regionName(region)}
                </span>
              ))}
            </p>
          )}
          {showPrices ? (
            <p className="m-0 flex flex-wrap gap-x-3.5 gap-y-0.5 text-[13.5px] text-muted">
              <span>תשלום: {termsText(terms.paymentTerms)}</span>
              {terms.minOrder ? <span>מינימום הזמנה <span className="tnum">{money(terms.minOrder)}</span></span> : null}
              {terms.leadDays != null ? <span>אספקה עד {terms.leadDays} ימי עסקים</span> : null}
              {terms.freeDeliveryFrom ? <span>משלוח חינם מ־<span className="tnum">{money(terms.freeDeliveryFrom)}</span></span> : null}
            </p>
          ) : (
            <p className="m-0 text-[14px] text-muted">
              מחירים ותנאי הספק מוצגים לנגריות רשומות.{' '}
              <Link href="/join" className="font-bold text-brand-ink">הרשמה חינם / כניסה</Link>
            </p>
          )}
          <div className="mt-1 grid gap-2">
            <SupplierContactButtons supplierId={supplier.id} contact={contact} joinHref={joinHref} source="supplier" justJoined={Boolean(carpenter) && back === '1'} />
            <Link href={askHref} className="inline-flex h-11 w-fit items-center gap-2 rounded-[11px] border-[1.5px] border-hair bg-white px-4 text-[15px] font-bold text-navy">
              <MessageSquare size={17} aria-hidden />
              {contact || joinHref ? 'או שאלה בהודעה באתר' : 'שאלה לספק'}
            </Link>
          </div>
        </div>
      </section>

      {catalogs.length > 0 && (
        <section>
          <SectionTitle title="קטלוגים" />
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {catalogs.map((doc) => (
              <li key={doc.id}>
                <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-xl border border-hair bg-white px-3.5 py-3 text-[15px] font-semibold text-ink hover:border-wood">
                  <FileText size={18} className="shrink-0 text-navy" />
                  <span className="truncate">{doc.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle title={<>המוצרים של {supplier.name}</>} />
        {mayBrowse ? (
          <ProductList products={theirs} showPrices={showPrices} myRegions={regionsForCity(carpenter?.city)} />
        ) : (
          <PublicProductGrid products={theirs.map(toPublicProduct)} />
        )}
      </section>
    </div>
  )
}
