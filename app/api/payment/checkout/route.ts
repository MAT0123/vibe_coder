import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/authMiddleware"

let stripe: any = null
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require("stripe")
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  } catch (err) {
    console.warn("Stripe package is installed but could not be initialized:", err)
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { tier } = body

    if (!tier) {
      return NextResponse.json({ error: "Billing tier is required" }, { status: 400 })
    }

    let amount = 0
    let tokensToCredit = 0

    if (tier === "basic") {
      amount = 5.00
      tokensToCredit = 100000
    } else if (tier === "pro") {
      amount = 10.00
      tokensToCredit = 250000
    } else if (tier === "mega") {
      amount = 20.00
      tokensToCredit = 600000
    } else {
      return NextResponse.json({ error: "Invalid billing tier selected" }, { status: 400 })
    }

    if (stripe) {
      try {
        const protocol = req.headers.get("x-forwarded-proto") || "http"
        const host = req.headers.get("host")
        const origin = `${protocol}://${host}`

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Vibe Coder - ${tier.toUpperCase()} Token Pack`,
                  description: `Credit ${tokensToCredit.toLocaleString()} tokens to ${user.email}`,
                },
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${origin}/?payment=success&tokens=${tokensToCredit}`,
          cancel_url: `${origin}/?payment=cancelled`,
          client_reference_id: user.id,
          metadata: {
            userId: user.id,
            tokensToCredit: String(tokensToCredit),
            amount: String(amount),
          },
        })

        return NextResponse.json({ url: session.url, mode: "stripe" })
      } catch (stripeErr: any) {
        console.error("Stripe Checkout Error:", stripeErr)
      }
    }

    // Fallback Mock Transaction: Record and increment via custom JSON database
    console.log(`💳 Running Mock Payment: Crediting ${tokensToCredit} tokens to ${user.email} for $${amount}`)
    
    const payment = await db.createPayment(user.id, amount, tokensToCredit)
    const updatedUser = await db.findUserById(user.id)

    return NextResponse.json({ 
      success: true, 
      mode: "mock", 
      tokensCredited: tokensToCredit,
      tokenBalance: updatedUser ? updatedUser.tokenBalance : user.tokenBalance + tokensToCredit
    })
  } catch (err: any) {
    console.error("Checkout process error:", err)
    return NextResponse.json({ error: err.message || "Failed to process checkout" }, { status: 500 })
  }
}
