import { config } from "../config";

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export const verifyGoogleCode = async (code: string, redirectUri?: string) => {
  // 1. Preparar parámetros
  const params = {
    code,
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: redirectUri || "",
    grant_type: "authorization_code",
  };

  // 2. Solicitar Token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    throw new Error(
      `Google Auth Failed: ${
        tokens.error_description || tokens.error || "No access token"
      }`
    );
  }

  // 3. Obtener Datos de Usuario
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const userData = await userRes.json();

  return {
    providerId: userData.id,
    email: userData.email,
    name: userData.name,
    avatarUrl: userData.picture,
  } as const;
};
