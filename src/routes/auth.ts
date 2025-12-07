import { Hono } from "hono";
import { AuthService } from "../services/auth.service";

const auth = new Hono();

auth.post("/login", async (c) => {
  try {
    const { code, provider, redirectUri, codeVerifier } = await c.req.json();

    if (!code || !provider) {
      return c.json({ error: "Faltan parámetros (code, provider)" }, 400);
    }

    const result = await AuthService.authenticate(
      provider,
      code,
      redirectUri,
      codeVerifier
    );

    return c.json(result);
  } catch (error) {
    console.error("Login Error:", error);
    // En producción, no devuelvas el mensaje de error exacto al cliente
    return c.json(
      { error: "Error durante la autenticación", details: String(error) },
      400
    );
  }
});

export default auth;
