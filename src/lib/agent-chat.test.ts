import { describe, expect, it } from 'vitest'
import { cartQuantity, formatUnitPrice, parseQuantity } from './agent-quantity'
import { ORDER_HISTORY, PREVIOUS_PRODUCTS, pageFor } from './agent-shortcuts'
import { searchProducts } from './catalog-search'
import type { AppProduct } from './app/products'

describe('pageFor', () => {
  it('opens a page asked for by name or with a go-to phrase', () => {
    expect(pageFor('עגלה')).toBe('/app/order')
    expect(pageFor('העגלה שלי')).toBe('/app/order')
    expect(pageFor('קח אותי לעגלה')).toBe('/app/order')
    expect(pageFor('איפה המציאון?')).toBe('/app/metzion')
    expect(pageFor('פתח את הקטלוג')).toBe('/app/catalog')
    expect(pageFor('עבור לפרופיל')).toBe('/app/account')
    expect(pageFor('הזמנות')).toBe('/app/orders')
  })

  it('leaves a search with a page word in it to the search', () => {
    expect(pageFor('קטלוג דבקים')).toBeNull()
    expect(pageFor('גלגלי עגלה')).toBeNull()
    expect(pageFor('גלגל לעגלה')).toBeNull()
    expect(pageFor('הזמנות דבק')).toBeNull()
    expect(pageFor('דבק PUR')).toBeNull()
  })

  it('keeps the history shortcuts narrow', () => {
    expect(PREVIOUS_PRODUCTS.test('מה הזמנתי בפעם שעברה')).toBe(true)
    expect(ORDER_HISTORY.test('ההזמנות שלי')).toBe(true)
    expect(ORDER_HISTORY.test('הזמנה של דבק')).toBe(false)
  })
})

describe('parseQuantity', () => {
  it('reads a number followed by a unit', () => {
    expect(parseQuantity('דבק PUR 20 ק״ג')).toEqual({ amount: 20, unit: 'kg', text: '20 ק״ג' })
    expect(parseQuantity('20 ק"ג דבק')).toMatchObject({ amount: 20, unit: 'kg' })
    expect(parseQuantity('5קג לכה')).toMatchObject({ amount: 5, unit: 'kg' })
    expect(parseQuantity('מדלל 10 ליטר')).toMatchObject({ amount: 10, unit: 'liter' })
    expect(parseQuantity('צירים 20 יחידות')).toMatchObject({ amount: 20, unit: 'unit' })
    expect(parseQuantity('3 ארגזים ברגים')).toMatchObject({ amount: 3, unit: 'pack' })
    expect(parseQuantity('קנט 50 מטרים')).toMatchObject({ amount: 50, unit: 'meter' })
    expect(parseQuantity('לוח 12 מ״ר')).toMatchObject({ amount: 12, unit: 'sqm' })
  })

  it('leaves a bare number alone: it is usually a model number', () => {
    expect(parseQuantity('דבק PUR 501')).toBeNull()
    expect(parseQuantity('KS351')).toBeNull()
    expect(parseQuantity('דבק')).toBeNull()
  })

  it('does not read a unit out of a longer word', () => {
    expect(parseQuantity('2 פחית')).toBeNull()
  })
})

describe('cartQuantity', () => {
  const bucket = { baseUnit: 'kg', packQty: 5, minOrderQty: 1 }

  it('rounds up to whole packs', () => {
    expect(cartQuantity(parseQuantity('20 ק״ג'), bucket)).toEqual({ quantity: 20, ignored: false })
    expect(cartQuantity(parseQuantity('12 ק״ג'), bucket)).toEqual({ quantity: 15, ignored: false })
  })

  it('counts packs in the pack size', () => {
    expect(cartQuantity(parseQuantity('3 דליים'), bucket)).toEqual({ quantity: 15, ignored: false })
  })

  it('never goes below the supplier minimum', () => {
    expect(cartQuantity(parseQuantity('2 ק״ג'), { baseUnit: 'kg', packQty: 5, minOrderQty: 10 })).toEqual({ quantity: 10, ignored: false })
    expect(cartQuantity(null, { baseUnit: 'unit', packQty: 6, minOrderQty: 1 })).toEqual({ quantity: 6, ignored: false })
  })

  it('ignores a quantity in another unit rather than guess', () => {
    expect(cartQuantity(parseQuantity('20 ק״ג'), { baseUnit: 'unit', packQty: 6, minOrderQty: 1 })).toEqual({ quantity: 6, ignored: true })
  })
})

describe('formatUnitPrice', () => {
  it('rounds to agorot and never divides by the pack', () => {
    expect(formatUnitPrice(24, 'ק״ג')).toBe('₪24 לק״ג')
    expect(formatUnitPrice(12.3456, 'יח׳')).toBe('₪12.35 ליח׳')
  })
})

describe('search with a quantity', () => {
  const product = (id: string, name: string): AppProduct => ({
    id,
    name,
    brand: null,
    mpn: null,
    baseUnit: 'kg',
    unit: 'ק״ג',
    imageUrl: null,
    attributes: [],
    categoryId: null,
    icon: null,
    topId: null,
    subId: null,
    description: null,
    offers: [],
  })

  it('still finds the product when the message carries a quantity', () => {
    const { products, partial } = searchProducts([product('a', 'דבק PUR לקנטים'), product('b', 'לכה אקרילית')], 'דבק PUR 20 ק״ג')
    expect(partial).toBe(false)
    expect(products.map((p) => p.id)).toEqual(['a'])
  })
})
