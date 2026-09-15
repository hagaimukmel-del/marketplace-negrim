import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getSessionSupplier } from '@/lib/supplier-auth'
import SupplierApp from './SupplierApp'
import {
  isTab,
  type CatalogPick,
  type CategoryOption,
  type ProductItem,
  type SupplierOrder,
  type Tab,
} from './types'

export const dynamic = 'force-dynamic'

interface RawOffer {
  id: string
  product_id: string
  supplier_sku: string | null
  price_excl_vat: number
  stock_qty: number
  pack_label: string | null
  pack_qty: number | null
  min_order_qty: number
  is_active: boolean
  products: {
    name_he: string
    name_en: string | null
    description_he: string | null
    category_id: string | null
    brand: string | null
    mpn: string | null
    base_unit: string
    image_url: string | null
    created_by_supplier_id: string | null
    categories: { name_he: string } | null
  } | null
}

interface RawLine {
  id: string
  order_id: string
  product_name_he: string
  quantity: number
  unit_price_excl_vat: number
  line_total_excl_vat: number
  orders: {
    id: string
    order_number: string
    status: string | null
    created_at: string | null
    business_name: string | null
    customer_name: string | null
    customer_phone: string | null
    address: string | null
    city: string | null
    notes: string | null
    payment_method: string | null
    confirmed_subtotal_excl_vat: number | null
    supplier_note: string | null
  } | null
}

/**
 * The supplier's own workspace.
 *
 * Everything is read on the server and scoped to the session's supplier: the
 * orders sent to them with only their own lines, the products they sell, and
 * their business details and terms. The tabs are one client app on top of that,
 * so moving between them is instant and nothing refetches until something is
 * saved.
 *
 * It opens on incoming orders when one is waiting — that is the thing a
 * supplier opens the site for — and on products otherwise.
 */
export default async function SupplierHome({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supplier = await getSessionSupplier()
  if (!supplier) redirect('/supplier/join')

  const { tab } = await searchParams
  const supabase = getSupabaseAdmin()

  const [{ data: offers }, { data: lines }, { data: categories }, { data: catalogRows }] = await Promise.all([
    supabase
      .from('supplier_offers')
      .select(
        'id, product_id, supplier_sku, price_excl_vat, stock_qty, pack_label, pack_qty, min_order_qty, is_active, ' +
          'products(name_he, name_en, description_he, category_id, brand, mpn, base_unit, image_url, created_by_supplier_id, categories(name_he))'
      )
      .eq('supplier_id', supplier.id)
      .limit(1000),
    supabase
      .from('order_items')
      .select(
        'id, order_id, product_name_he, quantity, unit_price_excl_vat, line_total_excl_vat, ' +
          'orders(id, order_number, status, created_at, business_name, customer_name, customer_phone, address, city, notes, payment_method, confirmed_subtotal_excl_vat, supplier_note)'
      )
      .eq('supplier_id', supplier.id)
      .limit(1000),
    supabase
      .from('categories')
      .select('id, name_he, parent_category_id')
      .order('sort_order')
      .order('name_he'),
    // What already exists, so a supplier can say "I sell this too" instead of
    // typing a duplicate. What it is — never what anyone else charges for it.
    supabase
      .from('products')
      .select('id, name_he, name_en, description_he, category_id, brand, mpn, base_unit, image_url, categories(name_he)')
      .eq('is_active', true)
      .order('name_he')
      .limit(3000),
  ])

  const myLines = (lines ?? []) as unknown as RawLine[]

  // An order that also holds another supplier's lines is confirmed centrally.
  // Knowing that needs every line of those orders, not only this supplier's.
  const orderIds = [...new Set(myLines.map((line) => line.order_id))]
  const { data: everyLine } = orderIds.length
    ? await supabase.from('order_items').select('order_id, supplier_id').in('order_id', orderIds)
    : { data: [] as { order_id: string; supplier_id: string | null }[] }

  const suppliersByOrder = new Map<string, Set<string | null>>()
  for (const line of everyLine ?? []) {
    const set = suppliersByOrder.get(line.order_id) ?? new Set<string | null>()
    set.add(line.supplier_id)
    suppliersByOrder.set(line.order_id, set)
  }

  const products: ProductItem[] = ((offers ?? []) as unknown as RawOffer[])
    .filter((offer) => offer.products)
    .map((offer) => {
      const product = offer.products!
      return {
        offerId: offer.id,
        productId: offer.product_id,
        name: product.name_he,
        nameEn: product.name_en,
        description: product.description_he,
        categoryId: product.category_id,
        categoryName: product.categories?.name_he ?? null,
        brand: product.brand,
        mpn: product.mpn,
        baseUnit: product.base_unit,
        imageUrl: product.image_url,
        price: Number(offer.price_excl_vat),
        stock: offer.stock_qty,
        sku: offer.supplier_sku,
        packLabel: offer.pack_label,
        packQty: offer.pack_qty == null ? null : Number(offer.pack_qty),
        minOrderQty: Number(offer.min_order_qty),
        isActive: offer.is_active,
        canEditProduct: product.created_by_supplier_id === supplier.id,
      }
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.name.localeCompare(b.name, 'he')
    })

  const byOrder = new Map<string, SupplierOrder>()
  for (const line of myLines) {
    if (!line.orders) continue
    const order = line.orders
    const entry = {
      id: line.id,
      name: line.product_name_he,
      quantity: line.quantity,
      unitPrice: Number(line.unit_price_excl_vat),
      lineTotal: Number(line.line_total_excl_vat),
    }
    const existing = byOrder.get(order.id)
    if (existing) {
      existing.lines.push(entry)
      existing.total += entry.lineTotal
      continue
    }
    byOrder.set(order.id, {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status ?? 'pending',
      createdAt: order.created_at ?? new Date(0).toISOString(),
      buyer: order.business_name || order.customer_name || 'נגרייה',
      contactName: order.business_name ? order.customer_name : null,
      phone: order.customer_phone,
      address: [order.address, order.city].filter(Boolean).join(', ') || null,
      notes: order.notes,
      paymentTerms: order.payment_method,
      lines: [entry],
      total: entry.lineTotal,
      confirmedTotal:
        order.confirmed_subtotal_excl_vat == null ? null : Number(order.confirmed_subtotal_excl_vat),
      supplierNote: order.supplier_note,
      split: (suppliersByOrder.get(order.id)?.size ?? 1) > 1,
    })
  }

  const orders = [...byOrder.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const alreadySold = new Set(products.map((product) => product.productId))
  const catalog: CatalogPick[] = (
    (catalogRows ?? []) as unknown as {
      id: string
      name_he: string
      name_en: string | null
      description_he: string | null
      category_id: string | null
      brand: string | null
      mpn: string | null
      base_unit: string
      image_url: string | null
      categories: { name_he: string } | null
    }[]
  )
    .filter((row) => !alreadySold.has(row.id))
    .map((row) => ({
      productId: row.id,
      name: row.name_he,
      nameEn: row.name_en,
      description: row.description_he,
      categoryId: row.category_id,
      categoryName: row.categories?.name_he ?? null,
      brand: row.brand,
      mpn: row.mpn,
      baseUnit: row.base_unit,
      imageUrl: row.image_url,
    }))

  const waiting = orders.filter((order) => order.status === 'pending').length
  const initialTab: Tab = isTab(tab) ? tab : waiting > 0 ? 'orders' : 'products'

  return (
    <SupplierApp
      initialTab={initialTab}
      profile={{
        id: supplier.id,
        company_name: supplier.company_name,
        business_id: supplier.business_id,
        contact_name: supplier.contact_name,
        phone: supplier.phone,
        email: supplier.email,
        city: supplier.city,
        address: supplier.address,
        pickup_address: supplier.pickup_address,
        sells_note: supplier.sells_note,
        logo_url: supplier.logo_url,
        min_order_value_excl_vat:
          supplier.min_order_value_excl_vat == null ? null : Number(supplier.min_order_value_excl_vat),
        default_lead_time_days: supplier.default_lead_time_days,
        payment_terms: supplier.payment_terms ?? [],
      }}
      products={products}
      orders={orders}
      categories={(categories ?? []) as CategoryOption[]}
      catalog={catalog}
    />
  )
}
