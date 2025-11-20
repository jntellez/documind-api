import { Hono } from "hono";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { z } from "zod";

const ProcessUrlRequest = z.object({
  url: z.string().url(),
});

// Creamos una "sub-app" de Hono para estas rutas
export const documentRoutes = new Hono();

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
      originalUrl: pageUrl,
    };
    return c.json(responseJson);
  } catch (error) {
    // E. Error handling (ahora es c.json(..., status))
    let errorMessage = "Unknown error";
    if (error instanceof Error) errorMessage = error.message;
    return c.json(
      { error: errorMessage, details: error },
      400 // Hono usa un argumento separado para el status
    );
  }
});

documentRoutes.get("/process-url", (c) => {
  return c.json(
    { message: "This endpoint requires the POST method" },
    405 // Status
  );
});
