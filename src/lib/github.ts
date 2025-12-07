import { config } from "../config";

export const verifyGithubCode = async (
  code: string,
  redirectUri?: string,
  codeVerifier?: string
) => {
  const params: any = {
    client_id: config.github.clientId,
    client_secret: config.github.clientSecret,
    code,
    redirect_uri: redirectUri,
  };

  if (codeVerifier) {
    params.code_verifier = codeVerifier;
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    throw new Error(`GitHub Error: ${tokens.error_description}`);
  }

  if (!tokens.access_token)
    throw new Error("GitHub Auth Failed: No access token");

  // 2. Obtener Datos de Usuario
  // GitHub requiere User-Agent
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "User-Agent": "Documind-App",
    },
  });

  const userData = await userRes.json();

  // Hack: Si el email es privado, GitHub devuelve null. Deberías llamar a /user/emails
  // Por simplicidad, usamos un fallback aquí.
  const email = userData.email || `${userData.login}@no-email.github`;

  return {
    providerId: userData.id.toString(),
    email: email,
    name: userData.name || userData.login,
    avatarUrl: userData.avatar_url,
  } as const;
};
