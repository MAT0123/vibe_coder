import { NextRequest, NextResponse } from "next/server"
import { COGNITO_CLIENT_ID, COGNITO_DOMAIN } from "@/lib/cognito"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const REDIRECT_URI = `${APP_URL}/api/auth/callback`

export async function GET(_req: NextRequest) {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
    return NextResponse.json(
      { error: "Cognito domain or client ID not configured" },
      { status: 500 }
    )
  }

  const authUrl = new URL(`https://${COGNITO_DOMAIN}/oauth2/authorize`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", COGNITO_CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI)
  authUrl.searchParams.set("scope", "email openid profile")
  authUrl.searchParams.set("identity_provider", "Google") // Force Google IdP

  return NextResponse.redirect(authUrl.toString())
}
