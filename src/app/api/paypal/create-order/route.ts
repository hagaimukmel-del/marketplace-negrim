import { NextRequest, NextResponse } from 'next/server'

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
    const { amount, orderId, currency = 'ILS' } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: 'Invalid amount' },
        { status: 400 }
      )
    }

    const token = await getPayPalToken()
    const mode = process.env.PAYPAL_MODE || 'sandbox'

    const url =
      mode === 'production'
        ? 'https://api-m.paypal.com/v2/checkout/orders'
        : 'https://api-m.sandbox.paypal.com/v2/checkout/orders'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            description: `Order #${orderId}`,
            custom_id: orderId,
          },
        ],
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-success?orderId=${orderId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/carpenter/payment?orderId=${orderId}`,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('PayPal error:', error)
      return NextResponse.json(
        { message: error.message || 'Failed to create order' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating PayPal order:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
