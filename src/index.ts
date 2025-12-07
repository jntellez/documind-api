import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import documentRoutes from "./routes/document";
import authRoutes from "./routes/auth";
import { config } from "./config";

const app = new Hono();

// Middlewares globales
app.use("*", logger());
app.use("*", cors());

// Rutas estáticas
app.get("/", (c) => c.text("Documind API is running 🚀"));
app.get("/api", (c) => c.json({ success: true }));

// Monta tus rutas modulares
app.route("/api", documentRoutes);
app.route("/auth", authRoutes);

// Wildcard/Fallback para rutas no encontradas
app.get("/api/*", (c) => c.json({ message: "Not found" }, 404));
app.notFound((c) => c.json({ message: "Not Found" }, 404));

// Conecta Hono a Bun.serve
const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`Server run in ${server.url}`);
