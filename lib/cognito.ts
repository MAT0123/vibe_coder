import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider"
import crypto from "crypto"

const region = process.env.AWS_REGION || "us-east-1"

export const cognitoClient = new CognitoIdentityProviderClient({
  region,
})

export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || ""
export const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || ""
export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || ""
export const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN || ""
export const AWS_REGION = region

/**
 * Computes the SECRET_HASH required by Cognito when your App Client
 * has a Client Secret configured.
 * Formula: Base64(HMAC_SHA256(ClientSecret, Username + ClientId))
 */
export function computeSecretHash(username: string): string {
  if (!COGNITO_CLIENT_SECRET) return ""
  return crypto
    .createHmac("sha256", COGNITO_CLIENT_SECRET)
    .update(username + COGNITO_CLIENT_ID)
    .digest("base64")
}
