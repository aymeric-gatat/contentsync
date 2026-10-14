"use server";

import "server-only";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Platform } from "@/generated/prisma/enums";
import { adaptMasterPost } from "@/lib/ai/adapt";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOverLimit, PLATFORMS } from "@/lib/platforms";

export type FormState = { error?: string; id?: string };

const masterPostInput = z.object({
  id: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1, "Le contenu est vide.").max(20_000),
  platforms: z.array(z.enum(Platform)).min(1, "Choisissez au moins une plateforme."),
});

/** Enregistre le Post Maître puis (re)génère ses variantes DRAFT pour les plateformes choisies. */
export async function saveMasterPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = masterPostInput.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title") || undefined,
    content: formData.get("content"),
    platforms: formData.getAll("platforms"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { id, title, content, platforms } = parsed.data;
  const user = await requireUser();

  // Enregistrer d'abord : un échec de l'IA ne doit pas faire perdre le texte saisi.
  let masterId = id;
  if (masterId) {
    const { count } = await db.masterPost.updateMany({ where: { id: masterId, userId: user.id }, data: { title, content } });
    if (count === 0) return { error: "Post introuvable." };
  } else {
    masterId = (await db.masterPost.create({ data: { userId: user.id, title, content } })).id;
  }

  const result = await adaptMasterPost(content, platforms);
  if (!result.ok) return { error: result.error, id: masterId };

  // Seuls les brouillons sont remplacés : une variante planifiée ou publiée n'est jamais écrasée.
  await db.$transaction([
    db.post.deleteMany({ where: { masterPostId: masterId, status: "DRAFT", platform: { in: platforms } } }),
    db.post.createMany({
      data: result.variants.map((v) => ({
        masterPostId: masterId,
        platform: v.platform,
        content: v.content,
        promptVersion: result.promptVersion,
      })),
    }),
  ]);

  if (!id) redirect(`/compose/${masterId}`);
  refresh();
  return { id: masterId };
}

const postInput = z.object({ id: z.string(), content: z.string().trim().min(1, "Le contenu est vide.") });

export async function updatePost(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = postInput.safeParse({ id: formData.get("id"), content: formData.get("content") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const user = await requireUser();

  const post = await db.post.findFirst({ where: { id: parsed.data.id, masterPost: { userId: user.id } } });
  if (!post) return { error: "Variante introuvable." };
  if (post.status === "PUBLISHING" || post.status === "PUBLISHED") return { error: "Variante déjà publiée." };
  const max = PLATFORMS[post.platform].maxLength;
  if (isOverLimit(post.platform, parsed.data.content)) return { error: `Limite de ${max} caractères dépassée.` };

  await db.post.update({ where: { id: post.id }, data: { content: parsed.data.content } });
  refresh();
  return {};
}

export async function deleteMasterPost(formData: FormData) {
  const id = z.string().parse(formData.get("id"));
  const user = await requireUser();
  // shortcut: ne retire pas les jobs BullMQ ; le worker (étape 3) ignore les tâches dont le post n'existe plus.
  await db.masterPost.deleteMany({ where: { id, userId: user.id } });
  redirect("/");
}
