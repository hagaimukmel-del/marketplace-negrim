import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DEMO_PRODUCTS = [
  {
    name_he: 'דבק PVA חזק',
    name_en: 'Strong PVA Adhesive',
    base_price_excl_vat: 85.00,
    stock_qty: 150,
    description_he: 'דבק PVA איכותי להדבקת עץ וחיפויים. מתאים ליישומים במינוס וברחבות.',
  },
  {
    name_he: 'דבק פוליוריתן D4',
    name_en: 'Polyurethane D4 Adhesive',
    base_price_excl_vat: 145.00,
    stock_qty: 80,
    description_he: 'דבק פוליוריתן עמיד למים ודירוג D4. מעולה למטבחים, פרקט וביצוע חוץ.',
  },
  {
    name_he: 'דבק אפוקסי תרמופלסטי',
    name_en: 'Epoxy Thermoplastic Adhesive',
    base_price_excl_vat: 195.00,
    stock_qty: 45,
    description_he: 'דבק אפוקסי לשימוש תעשייתי. מקנה קשיות וחוזק גבוה.',
  },
  {
    name_he: 'דבק קנט עצמי הדבקה',
    name_en: 'Self-Adhesive Edge Banding',
    base_price_excl_vat: 62.00,
    stock_qty: 200,
    description_he: 'קנט עם דבק קיים מראש. קל ומהיר להדבקה על קצוות עץ.',
  },
  {
    name_he: 'דבק ווניל למפרקים',
    name_en: 'Veneer Joint Adhesive',
    base_price_excl_vat: 110.00,
    stock_qty: 60,
    description_he: 'דבק ספציפי לווניל ומפרקים עדינים. ספיגה נמוכה ויבוש מהיר.',
  },
  {
    name_he: 'דבק הידרופוביות + אנטי-טרמיט',
    name_en: 'Hydrophobic + Anti-Termite Adhesive',
    base_price_excl_vat: 220.00,
    stock_qty: 35,
    description_he: 'דבק מתקדם בעל תכונות הידרופוביות ועמידות נגד חרקים. למשימות קשות.',
  },
  {
    name_he: 'דבק PUR (פוליאוריתן ראקטיבי)',
    name_en: 'PUR Reactive Polyurethane',
    base_price_excl_vat: 275.00,
    stock_qty: 25,
    description_he: 'דבק פוליאוריתן ראקטיבי ברמה גבוהה. קשיות מקסימאלית, עמיד לאור.',
  },
  {
    name_he: 'דבק פוליוריתן עם משאבה אוטומטית',
    name_en: 'Polyurethane with Auto-Pump System',
    base_price_excl_vat: 385.00,
    stock_qty: 12,
    description_he: 'מערכת דבק עם משאבה אוטומטית קנטולה. ייצור מהיר ודיוקי.',
  },
]

export async function POST(req: Request) {
  try {
    // Check if seeding already done
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })

    if (count && count > 0) {
      return NextResponse.json(
        {
          success: true,
          message: `📦 קטלוג כבר קיים עם ${count} מוצרים`,
          products_count: count,
        },
        { status: 200 }
      )
    }

    // 1. Use hardcoded demo supplier UUID (for dev/demo only)
    const DEMO_SUPPLIER_ID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'

    // 2. Insert products with demo supplier
    const productsToInsert = DEMO_PRODUCTS.map((p) => ({
      ...p,
      supplier_id: DEMO_SUPPLIER_ID,
      is_active: true,
    }))

    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select()

    if (insertError) throw insertError

    return NextResponse.json(
      {
        success: true,
        message: `✅ הכנסו ${insertedProducts?.length || 0} מוצרים`,
        products_count: insertedProducts?.length || 0,
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Seed error:', errorMsg)
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    )
  }
}
