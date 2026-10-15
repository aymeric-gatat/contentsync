"use client";

import { startTransition, useActionState } from "react";
import { updateProfile } from "@/server/account";

type Props = { name: string | null; email: string | null };

export function ProfileForm({ name, email }: Props) {
  const [state, action, pending] = useActionState(updateProfile, {});

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <div className="fieldset">
        <label htmlFor="name" className="fieldset-legend">
          Nom affiché
        </label>
        <input id="name" name="name" className="input w-full" defaultValue={name ?? ""} maxLength={100} required />
      </div>
      <div className="fieldset">
        <label htmlFor="email" className="fieldset-legend">
          E-mail
        </label>
        <input id="email" className="input w-full" value={email ?? ""} readOnly disabled aria-describedby="email-help" />
        <p id="email-help" className="label">
          Lié à votre compte Google, non modifiable.
        </p>
      </div>
      <FormFeedback state={state} />
      <div className="card-actions mt-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending && <span className="loading loading-spinner loading-sm" />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

export function FormFeedback({ state }: { state: { error?: string; success?: string } }) {
  if (state.error)
    return (
      <div role="alert" className="alert alert-error alert-soft">
        <span>{state.error}</span>
      </div>
    );
  if (state.success)
    return (
      <div role="status" className="alert alert-success alert-soft">
        <span>{state.success}</span>
      </div>
    );
  return null;
}
