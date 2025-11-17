import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { z } from "zod";

const ProcessUrlRequest = z.object({
  url: z.string().url(),
});

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => new Response("Home"),
    "/api": () => Response.json({ success: true }),
    "/api/process-url": {
      POST: async (request) => {
        try {
          // A. Validate body
          const body = await request.json();
          const validatedData = ProcessUrlRequest.parse(body);
          const pageUrl = validatedData.url;

          // B. Fetch the HTML
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

          // C. Process with Readability
          const doc = new JSDOM(html, { url: pageUrl });
          const reader = new Readability(doc.window.document);
          const article = reader.parse();

          // 1. Check if the article was parsed
          if (!article) {
            throw new Error("Failed to parse article (article was null)");
          }

          // 2. Check if the content exists
          if (!article.content) {
            throw new Error(
              "Failed to extract content (article.content was null)"
            );
          }

          const cleanHtmlContent = article.content.replace(/\n\s*/g, "");

          // D. Return the response
          const responseJson = {
            title: article.title || "Title not found",
            content: cleanHtmlContent,
            original_url: pageUrl,
          };

          return Response.json(responseJson);
        } catch (error) {
          // E. Error handling
          let errorMessage = "Unknown error";
          if (error instanceof Error) errorMessage = error.message;
          return Response.json(
            { error: errorMessage, details: error },
            { status: 400 }
          );
        }
      },
      GET: () =>
        Response.json(
          { message: "This endpoint requires the POST method" },
          { status: 405 }
        ),
    },
    // Wildcard route for all routes that start with "/api/" and aren't otherwise matched
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at ${server.url}`);
