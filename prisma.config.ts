import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuration Prisma 7 (remplace la clé "prisma" de package.json).
 * L'URL de connexion n'est plus dans schema.prisma : elle est fournie ici
 * pour les migrations, et via le driver adapter dans src/lib/db.ts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
