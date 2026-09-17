import { redirect } from 'next/navigation'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { regionsForCity } from '@/lib/regions'
import { formatPhone } from '@/lib/metzion'
import ListingForm from '../ListingForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'מודעה חדשה — מציאון' }

/** A new listing, with who and where already filled in from registration. */
export default async function NewListingPage() {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) redirect('/app/metzion')

  return (
    <ListingForm
      initial={{
        title: '',
        description: '',
        category: '',
        condition: '',
        dealType: 'sale',
        quantity: '1',
        unit: 'יח׳',
        pricePerUnit: '',
        contactName: carpenter.contact_name || carpenter.business_name,
        contactPhone: carpenter.phone ? formatPhone(carpenter.phone) : '',
        city: carpenter.city ?? '',
        regions: regionsForCity(carpenter.city),
        images: [],
      }}
    />
  )
}
