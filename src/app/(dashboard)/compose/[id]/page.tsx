import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MasterPostForm } from "@/components/composer/master-post-form";
import { VariantCard } from "@/components/composer/variant-card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteMasterPost } from "@/server/posts";

export default function EditPostPage({ params }: PageProps<"/compose/[id]">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<span className="loading loading-spinner" aria-label="Chargement" />}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}

async function Editor({ params }: Pick<PageProps<"/compose/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const masterPost = await db.masterPost.findFirst({
    where: { id, userId: user.id },
    include: { posts: { orderBy: { platform: "asc" } } },
  });
  if (!masterPost) notFound();

  const platforms = masterPost.posts.map((p) => p.platform);
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{masterPost.title || "Post sans titre"}</h1>
        <form action={deleteMasterPost}>
          <input type="hidden" name="id" value={masterPost.id} />
          <button type="submit" className="btn btn-error btn-outline btn-sm">
            Supprimer
          </button>
        </form>
      </div>
      <MasterPostForm
        masterPost={masterPost}
        platforms={platforms.length ? platforms : ["LINKEDIN", "X", "BLOG"]}
      />
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Variantes</h2>
        {masterPost.posts.length === 0 && (
          <p className="text-base-content/70">Aucune variante pour l&apos;instant : lancez la génération.</p>
        )}
        {masterPost.posts.map((post) => (
          <VariantCard key={post.id} post={post} />
        ))}
      </section>
    </>
  );
}
