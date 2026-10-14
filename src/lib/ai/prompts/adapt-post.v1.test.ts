import { describe, expect, it } from "vitest";
import { charCount, isOverLimit } from "@/lib/platforms";
import { buildUserMessage, outputSchema, selectVariants } from "./adapt-post.v1";

describe("adapt-post v1", () => {
  it("garde une variante par plateforme demandée, dans l'ordre demandé", () => {
    const output = {
      variants: [
        { platform: "X" as const, content: "x1" },
        { platform: "LINKEDIN" as const, content: "li" },
        { platform: "X" as const, content: "x2" },
        { platform: "BLOG" as const, content: "non demandé" },
      ],
    };
    expect(selectVariants(output, ["LINKEDIN", "X"])).toEqual([
      { platform: "LINKEDIN", content: "li" },
      { platform: "X", content: "x1" },
    ]);
  });

  it("rejette une sortie qui oublie une plateforme", () => {
    expect(selectVariants({ variants: [{ platform: "X", content: "x" }] }, ["X", "BLOG"])).toBeNull();
  });

  it("refuse une plateforme inconnue dans la sortie du modèle", () => {
    expect(outputSchema.safeParse({ variants: [{ platform: "TIKTOK", content: "?" }] }).success).toBe(false);
  });

  it("donne les limites au modèle et isole le contenu source", () => {
    const msg = buildUserMessage({ content: "Bonjour", platforms: ["X", "BLOG"] });
    expect(msg).toContain("X (280 caractères maximum");
    expect(msg).toContain("BLOG (pas de limite)");
    expect(msg).toContain("<post_maitre>\nBonjour\n</post_maitre>");
  });
});

describe("limites de caractères", () => {
  it("compte un emoji comme un caractère et applique la limite X", () => {
    expect(charCount("👋é")).toBe(2);
    expect(isOverLimit("X", "a".repeat(280))).toBe(false);
    expect(isOverLimit("X", "a".repeat(281))).toBe(true);
    expect(isOverLimit("BLOG", "a".repeat(100_000))).toBe(false);
  });
});
