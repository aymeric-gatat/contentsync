import type { Platform } from "@/generated/prisma/enums";

// Partagé client / serveur / worker : pas de "server-only" ici.
export const PLATFORMS: Record<Platform, { label: string; maxLength: number | null }> = {
  LINKEDIN: { label: "LinkedIn", maxLength: 3000 },
  X: { label: "X", maxLength: 280 },
  BLOG: { label: "Blog", maxLength: null },
};

// shortcut: compte les caractères Unicode ; X pondère URLs (23) et CJK/emoji (2) — passer à twitter-text si besoin de précision.
export function charCount(content: string) {
  return [...content].length;
}

export function isOverLimit(platform: Platform, content: string) {
  const max = PLATFORMS[platform].maxLength;
  return max !== null && charCount(content) > max;
}
