import sql from "../db";
import { sign } from "hono/jwt";
import { config } from "../config";
import { verifyGoogleCode } from "../lib/google";
import { verifyGithubCode } from "../lib/github";

type Provider = "google" | "github";

export const AuthService = {
  async authenticate(
    provider: Provider,
    code: string,
    redirectUri?: string,
    codeVerifier?: string
  ) {
    let userInfo;

    if (provider === "google") {
      userInfo = await verifyGoogleCode(code, redirectUri);
    } else if (provider === "github") {
      userInfo = await verifyGithubCode(code, redirectUri, codeVerifier);
    } else {
      throw new Error("Proveedor no soportado");
    }

    // 2. Guardar o Actualizar en Base de Datos (Upsert)
    // Asumimos que la tabla 'users' ya existe en tu DB
    const [user] = await sql`
      INSERT INTO users (email, name, avatar_url, provider, provider_id)
      VALUES (
        ${userInfo.email}, 
        ${userInfo.name}, 
        ${userInfo.avatarUrl}, 
        ${provider}, 
        ${userInfo.providerId}
      )
      ON CONFLICT (email) DO UPDATE 
      SET 
        name = EXCLUDED.name, 
        avatar_url = EXCLUDED.avatar_url,
        provider = EXCLUDED.provider, -- Opcional: actualiza el método de login
        provider_id = EXCLUDED.provider_id
      RETURNING id, email, name, avatar_url
    `;

    // 3. Generar JWT de sesión para tu app
    // Expira en 28 días
    const payload = {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 28,
    };

    const token = await sign(payload, config.jwtSecret);

    return { user, token };
  },
};
