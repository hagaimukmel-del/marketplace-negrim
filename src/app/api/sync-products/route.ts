import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SHEET_ID = '1pSde0xYLViLEy9Nxp-qSGrBuqcZPd4o5dDlJntoSS6c'
const SHEET_NAME = 'דבקים' // השם של ה-tab

// פונקציה לקרוא מ-Google Sheets
async function getProductsFromSheet() {
  try {
    // משוך את הנתונים כ-CSV
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`

    const response = await fetch(url)
    const csv = await response.text()

    // פרס את ה-CSV
    const lines = csv.trim().split('\n')
    const headers = lines[0]
      .split(',')
      .map(h => h.trim().replace(/"/g, ''))

    console.log('Sheet headers:', headers)

    const products = []
    for (let i = 1; i < lines.length; i++) {
      // Split by comma but handle quoted values
      const line = lines[i]
      const values = []
      let current = ''
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/"/g, ''))
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim().replace(/"/g, ''))

      // Map based on actual Google Sheets columns:
      // 0: Name (EN), 1: Category (קטגוריה), 2: Name (HE), 3: Name (AR), 4: Package
      // 5: Description (HE), 6: Description (EN), 7: Description (AR)
      // 8: Specs (HE), 9: Specs (EN), 10: Specs (AR)
      // 11: Price, 12: Similar products, 13: Break2 price, 14: image_url

      const priceStr = values[11]?.trim().replace('₪', '').trim() || '0'
      const price = parseFloat(priceStr) || 0

      // Convert Google Drive URLs to direct export URLs
      let imageUrl = values[14]?.trim()
      if (imageUrl && imageUrl.includes('drive.google.com')) {
        const fileIdMatch = imageUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
        if (fileIdMatch) {
          imageUrl = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`
        }
      }

      const product: any = {
        name_he: values[2]?.trim() || values[0]?.trim() || 'ללא שם',
        name_en: values[0]?.trim() || values[2]?.trim() || 'No name',
        name_ar: values[3]?.trim() || undefined,
        base_price_excl_vat: price,
        description_he: values[5]?.trim() || undefined,
        is_active: true,
        image_url: imageUrl || undefined,
        stock_qty: 100,
      }

      if (product.name_he && product.base_price_excl_vat > 0) {
        products.push(product)
      }
    }

    console.log(`✅ Parsed ${products.length} products from Sheet`)
    return products
  } catch (error) {
    console.error('Error fetching from Sheet:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching products from Google Sheets...')

    const products = await getProductsFromSheet()
    console.log(`✅ Got ${products.length} products from Sheet`)

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products found in Sheet',
        products: []
      })
    }

    // הוסף ל-Supabase
    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `✅ Synced ${data?.length || 0} products from Google Sheets to Supabase`,
      products: data
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
