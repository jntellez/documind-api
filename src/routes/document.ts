import { Hono } from "hono";
import { Readability } from "@mozilla/readability";
import { jwt } from "hono/jwt";
import { JSDOM } from "jsdom";
import { z } from "zod";
import pg from "../db";
import { config } from "../config";

const ProcessUrlRequest = z.object({
  url: z.string().url(),
});

const SaveDocumentRequest = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  original_url: z.string().url(),
});

// Creamos una "sub-app" de Hono para estas rutas
const documentRoutes = new Hono();

documentRoutes.post("/process-url", async (c) => {
  try {
    // A. Validate body (ahora es c.req.json())
    const body = await c.req.json();
    const validatedData = ProcessUrlRequest.parse(body);
    const pageUrl = validatedData.url;

    // B. Fetch the HTML (sin cambios)
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();

    // C. Process with Readability (sin cambios)
    const doc = new JSDOM(html, { url: pageUrl });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to parse article (article was null)");
    }
    if (!article.content) {
      throw new Error("Failed to extract content (article.content was null)");
    }

    const cleanHtmlContent = article.content.replace(/\n\s*/g, "");

    // D. Return the response (ahora es c.json())
    const responseJson = {
      title: article.title || "Title not found",
      content: cleanHtmlContent,
      original_url: pageUrl,
    };
    return c.json(responseJson);
  } catch (error) {
    // E. Error handling (ahora es c.json(..., status))
    let errorMessage = "Unknown error";
    if (error instanceof Error) errorMessage = error.message;
    return c.json({ error: errorMessage, details: error }, 400);
  }
});

documentRoutes.get("/process-url", (c) => {
  return c.json(
    { message: "This endpoint requires the POST method" },
    405 // Status
  );
});

documentRoutes.post(
  "/save-document",
  jwt({ secret: config.jwtSecret }),
  async (c) => {
    try {
      // 3. Obtener el usuario del Token (Seguridad)
      const payload = c.get("jwtPayload");
      // Asumimos que tu token tiene el ID en la propiedad 'sub' o 'id'.
      // Convertimos a Number porque tu DB espera un INTEGER.
      const userId = Number(payload.sub || payload.id);

      if (!userId) {
        return c.json({ error: "Invalid user ID in token" }, 401);
      }

      // Validar el body (El usuario manda título y contenido, pero NO su ID)
      const body = await c.req.json();
      const validatedData = SaveDocumentRequest.parse(body);

      // Campos adicionales
      const createdAt = new Date();
      const updatedAt = new Date();
      const wordCount = validatedData.content
        .replace(/<[^>]*>/g, "")
        .split(/\s+/)
        .filter(Boolean).length;

      // 4. Insertar en la base de datos INCLUYENDO user_id
      const result = await pg`
        INSERT INTO documents (
            title, 
            content, 
            original_url, 
            word_count, 
            created_at, 
            updated_at, 
            user_id
        )
        VALUES (
          ${validatedData.title},
          ${validatedData.content},
          ${validatedData.original_url},
          ${wordCount},
          ${createdAt},
          ${updatedAt},
          ${userId}
        )
        RETURNING id, title, original_url, word_count, created_at, updated_at
      `;

      return c.json(
        {
          success: true,
          document: result[0],
        },
        201
      );
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) errorMessage = error.message;

      // Loguear el error en servidor ayuda mucho
      console.error("Error saving document:", error);

      return c.json({ error: errorMessage, details: error }, 400);
    }
  }
);

export default documentRoutes;
