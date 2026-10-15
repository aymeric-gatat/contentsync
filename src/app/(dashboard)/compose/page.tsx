import { Suspense } from "react";
import { MasterPostForm } from "@/components/composer/master-post-form";
import { requireUser } from "@/lib/auth";

export default function NewPostPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Nouveau post</h1>
      <Suspense fallback={<span className="loading loading-spinner" aria-label="Chargement" />}>
        <NewPostForm />
      </Suspense>
    </div>
  );
}

async function NewPostForm() {
  await requireUser();
  return <MasterPostForm platforms={["LINKEDIN", "X", "BLOG"]} />;
}
