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
  tags: z.array(z.string()).optional().default([]),
});

const UpdateDocumentRequest = z.object({
  title: z.string().min(1, "Title cannot be empty").optional(),
  content: z.string().min(1, "Content cannot be empty").optional(),
  tags: z.array(z.string()).optional(),
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
    405, // Status
  );
});

documentRoutes.post(
  "/save-document",
  jwt({ secret: config.jwtSecret }),
  async (c) => {
    try {
      // 3. Obtener el usuario del Token (Seguridad)
      const payload = c.get("jwtPayload");
      const userId = Number(payload.sub || payload.id);

      if (!userId) {
        return c.json({ error: "Invalid user ID in token" }, 401);
      }

      // Validar el body
      const body = await c.req.json();
      const validatedData = SaveDocumentRequest.parse(body);

      // Campos adicionales
      const createdAt = new Date();
      const updatedAt = new Date();
      const wordCount = validatedData.content
        .replace(/<[^>]*>/g, "")
        .split(/\s+/)
        .filter(Boolean).length;

      const tagsPgFormat = `{${validatedData.tags.map((tag) => `"${tag.replace(/"/g, '\\"')}"`).join(",")}}`;

      // 4. Insertar en la base de datos
      const result = await pg`
        INSERT INTO documents (
            title, 
            content, 
            original_url, 
            word_count, 
            created_at, 
            updated_at, 
            user_id,
            tags
        )
        VALUES (
          ${validatedData.title},
          ${validatedData.content},
          ${validatedData.original_url},
          ${wordCount},
          ${createdAt},
          ${updatedAt},
          ${userId},
          ${tagsPgFormat}
        )
        RETURNING id, title, content, original_url, word_count, created_at, updated_at, tags
      `;

      return c.json(
        {
          success: true,
          document: result[0],
        },
        201,
      );
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) errorMessage = error.message;

      console.error("Error saving document:", error);

      return c.json({ error: errorMessage, details: error }, 400);
    }
  },
);

documentRoutes.get(
  "/documents",
  jwt({ secret: config.jwtSecret }),
  async (c) => {
    try {
      // Obtener el usuario del token
      const payload = c.get("jwtPayload");
      const userId = Number(payload.sub || payload.id);

      if (!userId) {
        return c.json({ error: "Invalid user ID in token" }, 401);
      }

      // Obtener documentos del usuario
      const documents = await pg`
        SELECT 
          id, 
          title, 
          original_url, 
          word_count, 
          created_at, 
          updated_at,
          tags
        FROM documents
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      return c.json({
        success: true,
        documents: documents,
        count: documents.length,
      });
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) errorMessage = error.message;

      console.error("Error fetching documents:", error);
      return c.json({ error: errorMessage }, 400);
    }
  },
);

documentRoutes.get(
  "/documents/:id",
  jwt({ secret: config.jwtSecret }),
  async (c) => {
    try {
      const payload = c.get("jwtPayload");
      const userId = Number(payload.sub || payload.id);

      if (!userId) {
        return c.json({ error: "Invalid user ID in token" }, 401);
      }

      const documentId = Number(c.req.param("id"));

      if (!documentId || isNaN(documentId)) {
        return c.json({ error: "Invalid document ID" }, 400);
      }

      const documents = await pg`
        SELECT 
          id, 
          title, 
          content,
          original_url, 
          word_count, 
          created_at, 
          updated_at,
          tags
        FROM documents
        WHERE id = ${documentId} AND user_id = ${userId}
      `;

      if (documents.length === 0) {
        return c.json({ error: "Document not found" }, 404);
      }

      return c.json({
        success: true,
        document: documents[0],
      });
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) errorMessage = error.message;

      console.error("Error fetching document:", error);
      return c.json({ error: errorMessage }, 400);
    }
  },
);

documentRoutes.patch(
  "/documents/:id",
  jwt({ secret: config.jwtSecret }),
  async (c) => {
    try {
      // 1. Validar usuario
      const payload = c.get("jwtPayload");
      const userId = Number(payload.sub || payload.id);

      if (!userId) {
        return c.json({ error: "Invalid user ID in token" }, 401);
      }

      const documentId = Number(c.req.param("id"));
      if (!documentId || isNaN(documentId)) {
        return c.json({ error: "Invalid document ID" }, 400);
      }

      // 2. Validar body
      const body = await c.req.json();
      const validatedData = UpdateDocumentRequest.parse(body);

      // Si no se envió nada para actualizar
      if (Object.keys(validatedData).length === 0) {
        return c.json({ error: "No fields provided to update" }, 400);
      }

      // 3. Obtener el documento actual para asegurar que existe y le pertenece al usuario
      const existingDocs = await pg`
        SELECT * FROM documents
        WHERE id = ${documentId} AND user_id = ${userId}
      `;

      if (existingDocs.length === 0) {
        return c.json({ error: "Document not found or unauthorized" }, 404);
      }

      const currentDoc = existingDocs[0];

      // 4. Preparar los nuevos valores
      const newTitle = validatedData.title ?? currentDoc.title;
      const newContent = validatedData.content ?? currentDoc.content;

      // PROTECCIÓN: Asegurar que newTags siempre sea un arreglo
      const newTags = validatedData.tags ?? currentDoc.tags ?? [];
      const updatedAt = new Date();

      // SOLUCIÓN: Formatear explícitamente el array de JS para PostgreSQL
      const tagsPgFormat = `{${newTags.map((tag: string) => `"${tag.replace(/"/g, '\\"')}"`).join(",")}}`;

      // 5. Recalcular el word_count solo si el contenido fue actualizado
      let newWordCount = currentDoc.word_count;
      if (validatedData.content) {
        newWordCount = validatedData.content
          .replace(/<[^>]*>/g, "")
          .split(/\s+/)
          .filter(Boolean).length;
      }

      // 6. Actualizar en la base de datos
      const result = await pg`
        UPDATE documents
        SET 
          title = ${newTitle},
          content = ${newContent},
          tags = ${tagsPgFormat},
          word_count = ${newWordCount},
          updated_at = ${updatedAt}
        WHERE id = ${documentId} AND user_id = ${userId}
        RETURNING id, title, content, original_url, word_count, created_at, updated_at, tags
      `;

      return c.json({
        success: true,
        document: result[0],
      });
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) errorMessage = error.message;

      console.error("Error updating document:", error);
      return c.json({ error: errorMessage, details: error }, 400);
    }
  },
);

documentRoutes.delete(
  "/documents/:id",
  jwt({ secret: config.jwtSecret }),
  async (c) => {
    try {
      const payload = c.get("jwtPayload");
      const userId = Number(payload.sub || payload.id);

      if (!userId) {
        return c.json({ error: "Invalid user ID in token" }, 401);
      }

      const documentId = Number(c.req.param("id"));

      if (!documentId || isNaN(documentId)) {
        return c.json({ error: "Invalid document ID" }, 400);
      }

      const result = await pg`
        DELETE FROM documents
        WHERE id = ${documentId} AND user_id = ${userId}
        RETURNING id
      `;

      if (result.length === 0) {
        return c.json({ error: "Document not found or unauthorized" }, 404);
      }

      return c.json({
        success: true,
        message: "Document deleted successfully",
        deletedId: result[0].id,
      });
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) errorMessage = error.message;

      console.error("Error deleting document:", error);
      return c.json({ error: errorMessage }, 400);
    }
  },
);

export default documentRoutes;
