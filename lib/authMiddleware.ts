import { GetUserCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient } from "./cognito"
import { NextRequest } from "next/server"
import { db } from "./db"

export async function getAuthenticatedUser(req: NextRequest) {
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

    let localUser = db.findUserByEmail(email)
    if (!localUser) {
      localUser = db.createUser(email, "COGNITO_EXTERNAL_AUTH")
    }

    return localUser
  } catch (err) {
    console.error("Cognito auth middleware validation failed:", err)
    return null
  }
}
