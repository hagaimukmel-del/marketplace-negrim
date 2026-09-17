'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '@/lib/cart-context'
import type { AppOrder } from '@/lib/app/orders'
import { suggestedOffer, type AppProduct } from '@/lib/app/products'

/**
 * Put a past order back into the order being built — every line, at today's
 * price, from the same supplier when it still sells the product — and open it.
 */
export function useReorder() {
  const cart = useCart()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const reorder = async (order: AppOrder) => {
    const ids = order.lines.map((line) => line.productId).filter(Boolean) as string[]
    if (!ids.length) return
    setBusy(true)
    try {
      const response = await fetch('/api/app/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const { products } = (await response.json()) as { products: AppProduct[] }
      for (const line of order.lines) {
        const product = products.find((p) => p.id === line.productId)
        if (!product) continue
        const offer = product.offers.find((o) => o.supplierId === order.supplier?.id && o.inStock) ?? suggestedOffer(product)
        if (!offer || offer.price == null) continue
        cart.addItem(
          {
            id: product.id,
            name_he: product.name,
            name_en: '',
            base_price_excl_vat: offer.price,
            supplier_id: offer.supplierId,
            supplier_name: offer.supplierName,
            unit: product.unit,
            pack_label: offer.packLabel,
            pack_qty: offer.packQty,
          },
          line.quantity
        )
      }
      router.push('/app/order')
    } finally {
      setBusy(false)
    }
  }

  return { reorder, busy }
}
