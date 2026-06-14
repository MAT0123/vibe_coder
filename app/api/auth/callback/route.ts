import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { COGNITO_DOMAIN, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET, AWS_REGION, COGNITO_USER_POOL_ID } from "@/lib/cognito"
import { signSession } from "@/lib/authMiddleware"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const REDIRECT_URI = `${APP_URL}/api/auth/callback`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Handle OAuth errors from Cognito / Google
  if (error) {
    console.error("OAuth error:", error, errorDescription)
    const redirectUrl = new URL("/login", APP_URL)
    redirectUrl.searchParams.set("error", errorDescription || error)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code) {
    const redirectUrl = new URL("/login", APP_URL)
    redirectUrl.searchParams.set("error", "No authorization code received")
    return NextResponse.redirect(redirectUrl)
  }

  try {
    // Exchange the authorization code for tokens via Cognito's hosted UI token endpoint
    const tokenEndpoint = `https://${COGNITO_DOMAIN}/oauth2/token`

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: COGNITO_CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
    })

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    }

    // If client secret is configured, use HTTP Basic auth
    if (COGNITO_CLIENT_SECRET) {
      const credentials = Buffer.from(`${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`).toString("base64")
      headers["Authorization"] = `Basic ${credentials}`
    }

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers,
      body: body.toString(),
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error("Token exchange failed:", errText)
      throw new Error(`Token exchange failed: ${errText}`)
    }

    const tokens = await tokenResponse.json()
    const { access_token, id_token, refresh_token, expires_in } = tokens

    if (!access_token) {
      throw new Error("No access token in response")
    }
    if (!id_token) {
      throw new Error("No ID token in response")
    }

    // Decode the ID token to extract user email (JWT – no verification needed server-side here,
    // Cognito already verified it; we verify it on every API call via authMiddleware)
    const payloadB64 = id_token.split(".")[1]
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"))
    const email: string = payload.email || payload.username || payload["cognito:username"] || ""

    let userEmailForSession = email
    if (email) {
      let localUser = db.findUserByEmail(email)
      if (!localUser) {
        localUser = db.createUser(email, "GOOGLE_OAUTH")
      }
      userEmailForSession = localUser.email
    }

    // Set cookies and redirect to the app
    const redirectUrl = new URL("/", APP_URL)
    const nextResponse = NextResponse.redirect(redirectUrl)

    nextResponse.cookies.set({
      name: "token",
      value: access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expires_in || 3600,
      path: "/",
    })

    if (userEmailForSession) {
      nextResponse.cookies.set({
        name: "vibe_session",
        value: signSession(userEmailForSession),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      })
    }

    if (refresh_token) {
      nextResponse.cookies.set({
        name: "refresh_token",
        value: refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      })
    }

    return nextResponse
  } catch (err: any) {
    console.error("OAuth callback error:", err)
    const redirectUrl = new URL("/login", APP_URL)
    redirectUrl.searchParams.set("error", err.message || "Authentication failed")
    return NextResponse.redirect(redirectUrl)
  }
}
