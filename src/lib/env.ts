import "server-only";
import { z } from "zod";

// Seul endroit autorisé à lire process.env. Ajouter ici chaque nouvelle variable.
export const env = z
  .object({
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    // Optionnelle : sans clé, le SDK utilise le profil `ant auth login`. "" (copié de .env.example) = absente.
    ANTHROPIC_API_KEY: z.string().optional().transform((v) => v || undefined),
    ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
    // Ne jamais changer une fois des données chiffrées : elles deviendraient illisibles.
    ENCRYPTION_KEY: z
      .base64()
      .transform((v) => Buffer.from(v, "base64"))
      .refine((b) => b.length === 32, "ENCRYPTION_KEY doit faire 32 octets encodés en base64"),
  })
  .parse(process.env);
