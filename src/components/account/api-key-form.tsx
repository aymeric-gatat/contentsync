"use client";

import { startTransition, useActionState } from "react";
import { FormFeedback } from "@/components/account/profile-form";
import { deleteApiKey, saveApiKey } from "@/server/account";

type Props = {
  /** 4 derniers caractères de la clé enregistrée ; la clé complète ne quitte jamais le serveur. */
  keyHint: string | null;
  keyUnreadable: boolean;
  hasServerKey: boolean;
};

export function ApiKeyForm({ keyHint, keyUnreadable, hasServerKey }: Props) {
  const [state, action, pending] = useActionState(saveApiKey, {});
  const [, deleteAction, deleting] = useActionState(deleteApiKey, {});
  const hasKey = keyHint !== null || keyUnreadable;

  return (
    <div className="flex flex-col gap-3">
      {keyUnreadable ? (
        <div role="alert" className="alert alert-warning alert-soft">
          <span>Votre clé enregistrée est illisible (clé de chiffrement du serveur modifiée). Enregistrez-la à nouveau.</span>
        </div>
      ) : keyHint ? (
        <p>
          Clé personnelle active : <code className="font-mono">sk-ant-…{keyHint}</code>
        </p>
      ) : (
        <p className="text-base-content/70">
          {hasServerKey
            ? "Aucune clé personnelle : la clé du serveur est utilisée."
            : "Aucune clé configurée : la génération IA ne fonctionnera pas tant que vous n'en ajoutez pas une."}
        </p>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(() => action(formData));
        }}
      >
        <div className="fieldset">
          <label htmlFor="apiKey" className="fieldset-legend">
            {hasKey ? "Remplacer la clé" : "Clé API Anthropic"}
          </label>
          {/* key : vide le champ une fois la nouvelle clé enregistrée */}
          <input
            key={keyHint ?? "none"}
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-..."
            className="input w-full font-mono"
            aria-describedby="apiKey-help"
            required
          />
          <p id="apiKey-help" className="label whitespace-normal">
            Créez une clé sur platform.claude.com → API Keys. Elle est vérifiée auprès d&apos;Anthropic puis stockée
            chiffrée.
          </p>
        </div>
        <FormFeedback state={state} />
        <div className="card-actions mt-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending && <span className="loading loading-spinner loading-sm" />}
            {pending ? "Vérification…" : "Vérifier et enregistrer"}
          </button>
        </div>
      </form>

      {hasKey && (
        // Pas de message de succès : le formulaire disparaît et le statut au-dessus passe à « aucune clé ».
        <form action={deleteAction}>
          <button type="submit" className="btn btn-error btn-outline btn-sm self-start" disabled={deleting}>
            Supprimer ma clé
          </button>
        </form>
      )}
    </div>
  );
}
