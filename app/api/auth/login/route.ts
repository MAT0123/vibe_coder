import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID, computeSecretHash } from "@/lib/cognito"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { signSession } from "@/lib/authMiddleware"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const username = email.toLowerCase()

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: computeSecretHash(username)
      }
    })

    const response = await cognitoClient.send(command)
    const authResult = response.AuthenticationResult

    if (!authResult || !authResult.AccessToken) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // Ensure local user record exists
    let localUser = await db.findUserByEmail(username)
    if (!localUser) {
      localUser = await db.createUser(username, "COGNITO_EXTERNAL_AUTH")
    }

    const nextResponse = NextResponse.json({
      user: {
        id: localUser.id,
        email: localUser.email,
        tokenBalance: localUser.tokenBalance
      }
    })

    nextResponse.cookies.set({
      name: "token",
      value: authResult.AccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: authResult.ExpiresIn || 3600,
      path: "/"
    })

    nextResponse.cookies.set({
      name: "vibe_session",
      value: signSession(localUser.email),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/"
    })

    // Also store refresh token in a separate secure cookie
    if (authResult.RefreshToken) {
      nextResponse.cookies.set({
        name: "refresh_token",
        value: authResult.RefreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/"
      })
    }

    return nextResponse
  } catch (err: any) {
    console.error("Cognito login error:", err)
    return NextResponse.json({ error: err.message || "Invalid email or password" }, { status: 401 })
  }
}
