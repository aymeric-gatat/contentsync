import { Suspense } from "react";
import { ApiKeyForm } from "@/components/account/api-key-form";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser, signOut } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <Suspense fallback={<span className="loading loading-spinner" aria-label="Chargement" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const { id } = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id },
    select: { name: true, email: true, anthropicApiKey: true },
  });

  let keyHint: string | null = null;
  let keyUnreadable = false;
  if (user.anthropicApiKey) {
    try {
      keyHint = decrypt(user.anthropicApiKey, env.ENCRYPTION_KEY).slice(-4);
    } catch {
      keyUnreadable = true;
    }
  }

  return (
    <>
      <section className="card bg-base-100 shadow-sm" aria-labelledby="profile-title">
        <div className="card-body">
          <h2 id="profile-title" className="card-title">
            Profil
          </h2>
          <ProfileForm name={user.name} email={user.email} />
        </div>
      </section>

      <section className="card bg-base-100 shadow-sm" aria-labelledby="ai-title">
        <div className="card-body">
          <h2 id="ai-title" className="card-title">
            Clé API Anthropic
          </h2>
          <ApiKeyForm keyHint={keyHint} keyUnreadable={keyUnreadable} hasServerKey={Boolean(env.ANTHROPIC_API_KEY)} />
        </div>
      </section>

      <section className="card bg-base-100 shadow-sm" aria-labelledby="session-title">
        <div className="card-body flex-row items-center justify-between">
          <h2 id="session-title" className="card-title">
            Session
          </h2>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn btn-outline btn-sm">
              Se déconnecter
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
