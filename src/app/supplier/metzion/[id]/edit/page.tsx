import { notFound, redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import { formatPhone } from '@/lib/metzion'
import ListingForm from '@/app/app/metzion/ListingForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'עריכת מודעה — מציאון' }

/** Only the supplier who posted a listing can open it for editing. */
export default async function SupplierEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')

  const { id } = await params
  const { data: listing } = await getSupabaseAdmin()
    .from('metzion_listings')
    .select('*')
    .eq('id', id)
    .eq('supplier_id', supplier.id)
    .maybeSingle()

  if (!listing || listing.status === 'sold') notFound()

  return (
    <ListingForm
      side="supplier"
      initial={{
        id: listing.id,
        title: listing.title,
        description: listing.description ?? '',
        category: listing.category,
        condition: listing.condition,
        dealType: listing.deal_type === 'free' ? 'free' : 'sale',
        quantity: String(listing.quantity),
        unit: listing.unit,
        pricePerUnit: listing.price_per_unit == null ? '' : String(listing.price_per_unit),
        contactName: listing.contact_name,
        contactPhone: formatPhone(listing.contact_phone),
        city: listing.city,
        regions: listing.regions,
        images: listing.images,
      }}
    />
  )
}
