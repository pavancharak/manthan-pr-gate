import jwt from "jsonwebtoken";
import axios from "axios";

function getPrivateKey() {
  return Buffer.from(process.env.GITHUB_PRIVATE_KEY_BASE64, "base64").toString("utf-8");
}

function generateJWT() {
  return jwt.sign(
    {
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 600,
      iss: process.env.GITHUB_APP_ID,
    },
    getPrivateKey(),
    { algorithm: "RS256" }
  );
}

export async function getInstallationToken(installationId) {
  const jwtToken = generateJWT();

  const res = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  return res.data.token;
}