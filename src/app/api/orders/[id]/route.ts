import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resolveCarpenter } from '@/lib/offer'
import type { OrderUpdate } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // An order id alone used to be enough to read someone's name, phone,
    // address and prices. The caller has to prove the order is theirs.
    const token = request.nextUrl.searchParams.get('token')
    const carpenter = token ? await resolveCarpenter(token) : null

    if (!carpenter) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('carpenter_id', carpenter.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order: data })
  } catch (err) {
    console.error('Order fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Update only allowed fields
    const updateData: OrderUpdate = {}
    if (typeof body.status === 'string') updateData.status = body.status
    if (typeof body.notes === 'string') updateData.notes = body.notes

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await getSupabaseAdmin()
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ order: data })
  } catch (err) {
    console.error('Order update error:', err)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
