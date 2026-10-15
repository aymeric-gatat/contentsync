"use server";

import "server-only";
import { refresh } from "next/cache";
import { z } from "zod";
import { verifyApiKey } from "@/lib/ai/adapt";
import { requireUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type AccountFormState = { error?: string; success?: string };

const profileInput = z.object({ name: z.string().trim().min(1, "Le nom est vide.").max(100) });

export async function updateProfile(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const parsed = profileInput.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const user = await requireUser();

  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  refresh();
  return { success: "Profil enregistré." };
}

const apiKeyInput = z.object({
  apiKey: z.string().trim().startsWith("sk-ant-", "Une clé Anthropic commence par « sk-ant- ».").max(500),
});

export async function saveApiKey(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const parsed = apiKeyInput.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const user = await requireUser();

  const check = await verifyApiKey(parsed.data.apiKey);
  if (!check.ok) return { error: check.error };

  await db.user.update({
    where: { id: user.id },
    data: { anthropicApiKey: encrypt(parsed.data.apiKey, env.ENCRYPTION_KEY) },
  });
  refresh();
  return { success: "Clé vérifiée et enregistrée." };
}

export async function deleteApiKey(): Promise<AccountFormState> {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { anthropicApiKey: null } });
  refresh();
  return { success: "Clé supprimée." };
}
