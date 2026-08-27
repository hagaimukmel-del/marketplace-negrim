import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { customer_name, customer_email, customer_phone, payment_method, total_amount, items_json } = body

    if (!customer_name || !customer_email || !customer_phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`

    // Insert order into Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          customer_name,
          customer_email,
          customer_phone,
          business_name: body.business_name || null,
          address: body.address || null,
          city: body.city || null,
          zip_code: body.zip_code || null,
          payment_method: payment_method || 'credit_card',
          total_amount,
          items_json,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create order' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        orderId: data.id,
        orderNumber: data.order_number,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Order creation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch orders
    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      orders: data,
      total: count,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Orders fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
