import ProductImage from './ProductImage'

/**
 * What a visitor who has not registered sees of a category: each product's
 * photo and name, nothing else (owner, 2026-11-11). No supplier, no price, no
 * link into the product page, which stays for registered viewers.
 *
 * Takes only these four fields on purpose: the page maps the full product to
 * them on the server, so nothing about offers can reach the browser from here.
 */
export interface PublicProduct {
  id: string
  name: string
  imageUrl: string | null
  icon: string | null
}

export default function PublicProductGrid({ products }: { products: PublicProduct[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id} className="overflow-hidden rounded-2xl border border-hair bg-white">
          <ProductImage src={product.imageUrl} icon={product.icon} size="aspect-square w-full" glyph={40} />
          <p className="m-0 line-clamp-2 px-3 py-2.5 text-[14.5px] font-semibold leading-snug text-ink">{product.name}</p>
        </li>
      ))}
    </ul>
  )
}
