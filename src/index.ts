import { Hono } from "hono";
import { documentRoutes } from "./routes/document";

const app = new Hono();

// Rutas estáticas
app.get("/", (c) => c.text("Home"));
app.get("/api", (c) => c.json({ success: true }));

// --- Monta tus rutas modulares ---
app.route("/api", documentRoutes);

// Wildcard/Fallback para rutas no encontradas
app.get("/api/*", (c) => c.json({ message: "Not found" }, 404));
app.notFound((c) => c.json({ message: "Not Found" }, 404));

// Conecta Hono a Bun.serve
const server = Bun.serve({
  port: 3000,
  fetch: app.fetch,
});

console.log(`Server run in ${server.url}`);
