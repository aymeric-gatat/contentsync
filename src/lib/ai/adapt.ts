import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Platform } from "@/generated/prisma/enums";
import { adaptPost } from "@/lib/ai/prompts";
import { env } from "@/lib/env";

type AdaptResult =
  | { ok: true; variants: { platform: Platform; content: string }[]; promptVersion: string }
  | { ok: false; error: string };

/** `apiKey` : clé personnelle de l'utilisateur ; à défaut, celle du serveur. */
export async function adaptMasterPost(content: string, platforms: Platform[], apiKey?: string): Promise<AdaptResult> {
  const client = new Anthropic({ apiKey: apiKey ?? env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.beta.messages.parse({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 16000,
      // Si les classifieurs refusent la requête, l'API la rejoue sur le modèle de repli recommandé
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(adaptPost.outputSchema) },
      system: adaptPost.system,
      messages: [{ role: "user", content: adaptPost.buildUserMessage({ content, platforms }) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError)
      return { ok: false, error: "Clé API Anthropic invalide ou manquante : vérifiez-la dans Paramètres." };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "Trop de requêtes, réessayez dans un instant." };
    // Le reste (5xx, réseau, ou aucun identifiant configuré — le SDK lève alors une Error générique) : on garde la page en vie.
    console.error("Anthropic call failed", error instanceof Anthropic.APIError ? error.status : "", (error as Error).message);
    return { ok: false, error: "Le service IA est indisponible ou mal configuré, réessayez plus tard." };
  }

  if (response.stop_reason === "refusal") return { ok: false, error: "Le modèle a refusé de traiter ce contenu." };
  const variants = response.parsed_output && adaptPost.selectVariants(response.parsed_output, platforms);
  if (!variants) return { ok: false, error: "Réponse de l'IA incomplète, réessayez." };

  return { ok: true, variants, promptVersion: `${adaptPost.id}@v${adaptPost.version}` };
}

/** Appel gratuit (Models API) pour vérifier qu'une clé est valide avant de l'enregistrer. */
export async function verifyApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await new Anthropic({ apiKey, maxRetries: 0 }).models.retrieve(env.ANTHROPIC_MODEL);
    return { ok: true };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "Clé refusée par Anthropic." };
    if (error instanceof Anthropic.PermissionDeniedError || error instanceof Anthropic.NotFoundError)
      return { ok: false, error: `Cette clé n'a pas accès au modèle ${env.ANTHROPIC_MODEL}.` };
    console.error("Anthropic key check failed", error instanceof Anthropic.APIError ? error.status : "", (error as Error).message);
    return { ok: false, error: "Impossible de vérifier la clé pour l'instant, réessayez." };
  }
}
