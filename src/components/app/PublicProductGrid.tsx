import ProductImage from './ProductImage'
import SupplierLogo from './SupplierLogo'
import { suggestedOffer, type AppProduct } from '@/lib/app/products'

/**
 * What a visitor who has not registered sees of a product, in a category or a
 * search: its photo, its name, and the supplier who sells it (owner,
 * 2026-11-12: supplier names and logos are public, prices are not). No price,
 * brand, part number or link into the product page, which stays for
 * registered viewers.
 *
 * Takes only these fields on purpose: toPublicProduct maps the full product
 * on the server, so nothing about prices or terms can reach the browser.
 */
export interface PublicProduct {
  id: string
  name: string
  imageUrl: string | null
  icon: string | null
  supplierName: string | null
  supplierLogo: string | null
}

/** The visitor's view of one product: the suggested supplier, never its offer. */
export function toPublicProduct(product: AppProduct): PublicProduct {
  const offer = suggestedOffer(product)
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    icon: product.icon,
    supplierName: offer?.supplierName ?? null,
    supplierLogo: offer?.supplierLogo ?? null,
  }
}

export default function PublicProductGrid({ products }: { products: PublicProduct[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id} className="overflow-hidden rounded-2xl border border-hair bg-white">
          <ProductImage src={product.imageUrl} icon={product.icon} size="aspect-square w-full" glyph={40} />
          <div className="px-3 py-2.5">
            <p className="m-0 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink">{product.name}</p>
            {product.supplierName && (
              <p className="m-0 mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
                <SupplierLogo url={product.supplierLogo} size={18} />
                <span className="truncate">{product.supplierName}</span>
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
