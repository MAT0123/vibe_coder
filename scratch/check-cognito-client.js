const { CognitoIdentityProviderClient, DescribeUserPoolClientCommand } = require("@aws-sdk/client-cognito-identity-provider");

// Load variables manually from .env if needed, or rely on env injection
const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function main() {
  try {
    const response = await client.send(new DescribeUserPoolClientCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID
    }));
    console.log("UserPoolClient settings:");
    console.log(JSON.stringify(response.UserPoolClient, null, 2));
  } catch (err) {
    console.error("Error describing user pool client:", err);
  }
}
main();
