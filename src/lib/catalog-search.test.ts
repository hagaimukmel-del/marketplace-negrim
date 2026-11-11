import { describe, expect, it } from 'vitest'
import { searchProducts } from './catalog-search'
import type { AppProduct } from './app/products'

const product = (id: string, name: string, extra: Partial<AppProduct> = {}): AppProduct => ({
  id,
  name,
  brand: null,
  mpn: null,
  baseUnit: 'unit',
  unit: 'יח׳',
  imageUrl: null,
  attributes: [],
  categoryId: null,
  icon: null,
  topId: null,
  subId: null,
  description: null,
  createdAt: null,
  popularRank: null,
  offers: [],
  ...extra,
})

describe('searchProducts: category and description', () => {
  const products = [
    product('glue', 'Titebond III', { categoryName: 'דבקים דבקי עץ' }),
    product('cleaner', 'Q1924', { description: 'חומר לניקוי שאריות דבק מקנטים' }),
    product('other', 'סרגל מתכת'),
  ]

  it('finds a product by the name of its category', () => {
    expect(searchProducts(products, 'דבקי עץ').products.map((p) => p.id)).toEqual(['glue'])
  })

  it('finds a product by a word in its description', () => {
    expect(searchProducts(products, 'שאריות').products.map((p) => p.id)).toEqual(['cleaner'])
  })

  it('ranks a name match above a description match', () => {
    const named = product('named', 'מנקה קנטים')
    const ids = searchProducts([products[1], named], 'קנטים').products.map((p) => p.id)
    expect(ids[0]).toBe('named')
  })
})
