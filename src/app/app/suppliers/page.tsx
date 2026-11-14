import { Store } from 'lucide-react'
import { loadCatalogViewer } from '@/lib/app/catalog-access'
import { loadProducts } from '@/lib/app/catalog-server'
import { loadPublicSuppliers } from '@/lib/app/suppliers-public'
import SupplierCard from '@/components/app/SupplierCard'
import { PageHeader } from '@/components/app/ui'
import { loadSupplierContacts } from '@/lib/supplier-contact-server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'ספקים — נגרים B2B' }

/**
 * Every supplier that sells on the site today, open to anyone (owner,
 * 2026-11-12). No count in the heading: the list speaks for itself while the
 * number of suppliers is still small (vision document, section 9). A
 * registered carpentry also gets a WhatsApp button on each card whose supplier
 * entered a mobile in its console.
 */
export default async function SuppliersPage() {
  const viewer = await loadCatalogViewer()
  const products = await loadProducts({ showPrices: false, city: viewer.carpenter?.city })
  const suppliers = await loadPublicSuppliers(products)
  // WhatsApp on each card for a registered carpentry only (owner, 2026-11-14);
  // a visitor's page never carries a number.
  const contacts = viewer.showPrices && suppliers.length ? await loadSupplierContacts(suppliers.map((s) => s.id)) : null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PageHeader icon={Store} title="ספקים" subtitle="מי מוכר כאן, מה הוא מוכר ולאן הוא מספק" />
      {suppliers.length ? (
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {suppliers.map((supplier) => (
            <li key={supplier.id}>
              <SupplierCard supplier={supplier} whatsapp={contacts?.get(supplier.id)?.whatsapp} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-muted">אין כרגע ספקים להצגה.</p>
      )}
    </div>
  )
}
