import { loadEnvConfig } from "@next/env";
import { defineConfig, env } from "prisma/config";

// Mêmes fichiers .env que Next.js (.env, .env.local, …)
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
