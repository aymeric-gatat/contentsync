"use client";

import { startTransition, useActionState } from "react";
import type { Platform } from "@/generated/prisma/enums";
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
      className="card bg-base-100 shadow-sm"
      // Appel manuel : un <form action> réinitialiserait les champs, et le texte saisi serait perdu en cas d'erreur.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <div className="card-body gap-2">
        {state.id && <input type="hidden" name="id" value={state.id} />}
        <div className="fieldset">
          <label htmlFor="title" className="fieldset-legend">
            Titre (interne)
          </label>
          <input id="title" name="title" className="input w-full" defaultValue={masterPost?.title ?? ""} maxLength={200} />
        </div>
        <div className="fieldset">
          <label htmlFor="content" className="fieldset-legend">
            Post Maître
          </label>
          <textarea
            id="content"
            name="content"
            className="textarea w-full"
            defaultValue={masterPost?.content}
            rows={10}
            required
          />
        </div>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Plateformes</legend>
          <div className="flex flex-wrap gap-6">
            {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
              <label key={p} className="label cursor-pointer gap-2 text-base-content">
                <input
                  type="checkbox"
                  name="platforms"
                  value={p}
                  className="checkbox checkbox-primary checkbox-sm"
                  defaultChecked={platforms.includes(p)}
                />
                {PLATFORMS[p].label}
              </label>
            ))}
          </div>
        </fieldset>
        {state.error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{state.error}</span>
          </div>
        )}
        <div className="card-actions mt-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending && <span className="loading loading-spinner loading-sm" />}
            {pending ? "Génération en cours…" : "Enregistrer et générer les variantes"}
          </button>
        </div>
      </div>
    </form>
  );
}
