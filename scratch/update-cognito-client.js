const { CognitoIdentityProviderClient, UpdateUserPoolClientCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function main() {
  try {
    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      CallbackURLs: [
        "http://localhost:3000/api/auth/callback",
        "https://vibe-coder-three.vercel.app/api/auth/callback"
      ],
      SupportedIdentityProviders: ["COGNITO", "Google"],
      AllowedOAuthFlows: ["code"],
      AllowedOAuthScopes: ["email", "openid", "profile"],
      AllowedOAuthFlowsUserPoolClient: true
    };

    console.log("Updating UserPoolClient with params:", JSON.stringify(params, null, 2));
    
    const response = await client.send(new UpdateUserPoolClientCommand(params));
    console.log("Successfully updated UserPoolClient!");
    console.log(JSON.stringify(response.UserPoolClient, null, 2));
  } catch (err) {
    console.error("Error updating user pool client:", err);
  }
}
main();
