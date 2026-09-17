import AppFrame from '@/components/app/AppFrame'

export const dynamic = 'force-dynamic'

/**
 * The personal offer page, in the app's frame: the navigation to the catalogue,
 * the order and the orders is there from the first link a carpenter opens.
 */
export default function OfferLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>
}
