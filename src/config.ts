export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET!,
  dbUrl: process.env.DATABASE_URL!,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
};

// Validación simple (opcional pero recomendada)
if (!config.jwtSecret || !config.dbUrl) {
  throw new Error(
    "Faltan variables de entorno críticas (JWT_SECRET o DATABASE_URL)"
  );
}
