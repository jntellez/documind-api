const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => new Response("Home"),
    "/api": () => Response.json({ success: true }),

    // Wildcard route for all routes that start with "/api/" and aren't otherwise matched
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at ${server.url}`);
