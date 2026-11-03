import { redirect } from 'next/navigation'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { regionsForCity } from '@/lib/regions'
import { formatPhone } from '@/lib/metzion'
import ListingForm from '@/app/app/metzion/ListingForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'מודעה חדשה — מציאון' }

/** A supplier's new listing, with who and where filled in from the business details. */
export default async function SupplierNewListingPage() {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')

  return (
    <ListingForm
      side="supplier"
      initial={{
        title: '',
        description: '',
        category: '',
        condition: '',
        dealType: 'sale',
        quantity: '1',
        unit: 'יח׳',
        pricePerUnit: '',
        contactName: supplier.contact_name || supplier.company_name,
        contactPhone: supplier.phone ? formatPhone(supplier.phone) : '',
        city: supplier.city ?? '',
        regions: regionsForCity(supplier.city),
        images: [],
      }}
    />
  )
}
