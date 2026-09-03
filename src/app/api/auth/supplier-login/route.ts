import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Demo suppliers (in production, query from database)
const DEMO_SUPPLIERS = [
  {
    id: '1',
    email: 'supplier@example.com',
    password: 'demo123',
    company_name: 'איתמיר בע״מ',
    contact_name: 'דב כהן',
    phone: '050-123-4567',
  },
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'מייל וסיסמה חובה' },
        { status: 400 }
      )
    }

    // Demo authentication (in production, use proper auth)
    const supplier = DEMO_SUPPLIERS.find(
      (s) => s.email === email && s.password === password
    )

    if (!supplier) {
      return NextResponse.json(
        { message: 'מייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Create session token (in production, use proper JWT)
    const token = Buffer.from(`${supplier.id}:${Date.now()}`).toString('base64')

    // Return supplier data without password
    const { password: _, ...supplierData } = supplier

    return NextResponse.json({
      supplier: supplierData,
      token,
      message: 'התחברות הצליחה',
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: error.message || 'שגיאה בהתחברות' },
      { status: 500 }
    )
  }
}
