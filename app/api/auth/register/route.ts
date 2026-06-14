import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID, computeSecretHash } from "@/lib/cognito"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const username = email.toLowerCase()

    const command = new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      SecretHash: computeSecretHash(username),
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: username }
      ]
    })

    const response = await cognitoClient.send(command)

    // Store unverified user record in local database immediately upon signup
    const existingUser = await db.findUserByEmail(username)
    if (!existingUser) {
      await db.createUser(username, "COGNITO_UNVERIFIED")
    }

    return NextResponse.json({
      success: true,
      userConfirmed: response.UserConfirmed,
      userSub: response.UserSub,
      message: "Registration initiated. Verification code sent to your email."
    })
  } catch (err: any) {
    console.error("Cognito registration error:", err)
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 400 })
  }
}
