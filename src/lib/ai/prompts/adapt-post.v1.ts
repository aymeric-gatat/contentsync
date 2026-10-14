import { z } from "zod";
import { Platform } from "@/generated/prisma/enums";
import { PLATFORMS } from "@/lib/platforms";

// Version livrée : ne plus modifier. Pour changer le prompt ou le schéma, créer adapt-post.v2.ts.
export const id = "adapt-post";
export const version = 1;

const GUIDELINES: Record<Platform, string> = {
  LINKEDIN:
    "Ton professionnel mais humain. Accroche forte sur la première ligne, paragraphes courts, " +
    "3 à 5 hashtags pertinents en fin de post, pas de lien dans le corps si possible.",
  X: "Message percutant et autonome, 1 à 2 hashtags maximum, pas de thread.",
  BLOG:
    "Article structuré en Markdown : titre (#), introduction, sous-titres (##), conclusion. " +
    "Développe les idées du Post Maître sans inventer de faits.",
};

export const system =
  "Tu es un rédacteur social media expert. Tu adaptes un contenu source (le « Post Maître ») " +
  "à chaque réseau demandé en respectant son format, son ton et sa limite de caractères. " +
  "Rédige dans la langue du Post Maître. N'invente ni chiffres, ni citations, ni liens absents de la source. " +
  "Produis exactement une variante par plateforme demandée.";

export function buildUserMessage(input: { content: string; platforms: Platform[] }) {
  const targets = input.platforms
    .map((p) => {
      const max = PLATFORMS[p].maxLength;
      const limit = max === null ? "pas de limite" : `${max} caractères maximum, impératif`;
      return `- ${p} (${limit}) : ${GUIDELINES[p]}`;
    })
    .join("\n");
  return `Plateformes cibles :\n${targets}\n\n<post_maitre>\n${input.content}\n</post_maitre>`;
}

export const outputSchema = z.object({
  variants: z.array(z.object({ platform: z.enum(Platform), content: z.string() })),
});

/** Garde une variante par plateforme demandée ; null si le modèle en a oublié une. */
export function selectVariants(output: z.infer<typeof outputSchema>, platforms: Platform[]) {
  const variants = platforms.map((platform) => output.variants.find((v) => v.platform === platform));
  return variants.every((v) => v !== undefined) ? variants : null;
}
