import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getPayPalToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secretKey = process.env.PAYPAL_SECRET_KEY
  const mode = process.env.PAYPAL_MODE || 'sandbox'

  const url =
    mode === 'production'
      ? 'https://api-m.paypal.com/v1/oauth2/token'
      : 'https://api-m.sandbox.paypal.com/v1/oauth2/token'

  const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Error getting PayPal token:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orderID, orderId } = await request.json()

    if (!orderID) {
      return NextResponse.json(
        { message: 'Missing orderID' },
        { status: 400 }
      )
    }

    const token = await getPayPalToken()
    const mode = process.env.PAYPAL_MODE || 'sandbox'

    const url =
      mode === 'production'
        ? `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`
        : `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('PayPal capture error:', error)
      return NextResponse.json(
        { message: error.message || 'Failed to capture payment' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Update order status to paid in database
    if (orderId) {
      const { error: dbError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_method: 'paypal',
          payment_id: data.id,
        })
        .eq('order_number', orderId)

      if (dbError) {
        console.error('Error updating order in database:', dbError)
        // Still return success to PayPal, but log the error
      } else {
        console.log(`✅ Order ${orderId} marked as paid`)
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error capturing PayPal order:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
