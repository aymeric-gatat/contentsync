"use client";

import { startTransition, useActionState } from "react";
import type { Platform } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/platforms";
import { saveMasterPost } from "@/server/posts";

type Props = {
  masterPost?: { id: string; title: string | null; content: string };
  platforms: Platform[];
};

export function MasterPostForm({ masterPost, platforms }: Props) {
  const [state, action, pending] = useActionState(saveMasterPost, { id: masterPost?.id });

  return (
    <form
      className="flex flex-col gap-4"
      // Appel manuel : un <form action> réinitialiserait les champs, et le texte saisi serait perdu en cas d'erreur.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      {state.id && <input type="hidden" name="id" value={state.id} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titre (interne)</Label>
        <Input id="title" name="title" defaultValue={masterPost?.title ?? ""} maxLength={200} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Post Maître</Label>
        <Textarea id="content" name="content" defaultValue={masterPost?.content} rows={10} required />
      </div>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 text-sm font-medium">Plateformes</legend>
        {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
          <Label key={p} className="flex items-center gap-2 font-normal">
            <Checkbox name="platforms" value={p} defaultChecked={platforms.includes(p)} />
            {PLATFORMS[p].label}
          </Label>
        ))}
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Génération en cours…" : "Enregistrer et générer les variantes"}
      </Button>
    </form>
  );
}
