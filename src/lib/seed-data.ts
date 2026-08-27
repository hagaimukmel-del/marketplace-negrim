'use server'

import { createClient } from '@supabase/supabase-js'

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

const DEMO_SUPPLIER_ID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'

export async function ensureSeededData() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check if data already exists
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })

    if (count && count > 0) {
      console.log(`✅ Seed data already exists (${count} products)`)
      return true
    }

    // Try to insert using a raw SQL call - but this won't work with anon key due to RLS
    // Instead, we'll log that manual seeding is needed
    console.warn('⚠️ Products table is empty. RLS prevents automatic seeding.')
    console.warn('📝 Manual seeding required via Supabase SQL Editor.')
    console.warn('🔗 Visit: https://supabase.com/dashboard/project/ihburmhtcfhwlairyfyf/sql/new')
    console.warn('SQL to run:')
    console.warn(`
-- Disable RLS temporarily
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Insert supplier
INSERT INTO public.suppliers (id, profile_id, business_name, location, is_active)
VALUES ('${DEMO_SUPPLIER_ID}', '00000000-0000-0000-0000-000000000000', 'איתמיר בע״מ', 'תל אביב', true)
ON CONFLICT (id) DO NOTHING;

-- Insert products
${DEMO_PRODUCTS.map(
  (p, i) => `
INSERT INTO public.products (supplier_id, name_he, name_en, base_price_excl_vat, stock_qty, description_he, is_active)
VALUES ('${DEMO_SUPPLIER_ID}', '${p.name_he}', '${p.name_en}', ${p.base_price_excl_vat}, ${p.stock_qty}, '${p.description_he}', true);`
).join('\n')}

-- Re-enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    `)

    return false
  } catch (error) {
    console.error('Seed check error:', error)
    return false
  }
}
