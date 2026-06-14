import { GetUserCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, COGNITO_CLIENT_SECRET } from "./cognito"
import { NextRequest } from "next/server"
import { db } from "./db"
import crypto from "crypto"

const SESSION_SECRET = COGNITO_CLIENT_SECRET || "vibe-coder-fallback-secret-key-198273"

export function signSession(email: string): string {
  const payload = JSON.stringify({ email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url")
  return `${Buffer.from(payload).toString("base64url")}.${signature}`
}

export function verifySession(token: string): string | null {
  try {
    const [payloadB64, signature] = token.split(".")
    if (!payloadB64 || !signature) return null
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8")
    const payload = JSON.parse(payloadStr)
    if (payload.exp < Date.now()) return null
    
    // verify signature
    const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadStr).digest("base64url")
    if (signature !== expectedSignature) return null
    
    return payload.email
  } catch {
    return null
  }
}

export async function getAuthenticatedUser(req: NextRequest) {
  // 1. Try our local signed session cookie first (super fast, no external network calls)
  const sessionCookie = req.cookies.get("vibe_session")
  if (sessionCookie) {
    const email = verifySession(sessionCookie.value)
    if (email) {
      const localUser = await db.findUserByEmail(email)
      if (localUser) return localUser
    }
  }

  // 2. Fall back to standard Cognito AccessToken via GetUserCommand for backward compatibility
  const tokenCookie = req.cookies.get("token")
  if (!tokenCookie) return null

  try {
    const command = new GetUserCommand({
      AccessToken: tokenCookie.value
    })

    const cognitoUser = await cognitoClient.send(command)
    
    const emailAttribute = cognitoUser.UserAttributes?.find(attr => attr.Name === "email")
    const email = emailAttribute?.Value

    if (!email) return null

    let localUser = await db.findUserByEmail(email)
    if (!localUser) {
      localUser = await db.createUser(email, "COGNITO_EXTERNAL_AUTH")
    }

    return localUser
  } catch (err) {
    console.error("Cognito auth middleware validation failed:", err)
    return null
  }
}
