import { ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_ID, computeSecretHash } from "@/lib/cognito"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 })
    }

    const username = email.toLowerCase()

    const command = new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      SecretHash: computeSecretHash(username),
      Username: username,
      ConfirmationCode: code
    })

    await cognitoClient.send(command)

    // Update local user record status to verified upon confirmation
    if (db.findUserByEmail(username)) {
      db.updateUserPasswordHash(username, "COGNITO_VERIFIED")
    } else {
      db.createUser(username, "COGNITO_VERIFIED")
    }

    return NextResponse.json({
      success: true,
      message: "Account verified successfully. You can now log in."
    })
  } catch (err: any) {
    console.error("Cognito verification error:", err)
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 400 })
  }
}
