import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MasterPostForm } from "@/components/composer/master-post-form";
import { VariantCard } from "@/components/composer/variant-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteMasterPost } from "@/server/posts";

export default function EditPostPage({ params }: PageProps<"/compose/[id]">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{masterPost.title || "Post sans titre"}</h1>
        <form action={deleteMasterPost}>
          <input type="hidden" name="id" value={masterPost.id} />
          <Button type="submit" variant="destructive" size="sm">
            Supprimer
          </Button>
        </form>
      </div>
      <MasterPostForm
        masterPost={masterPost}
        platforms={platforms.length ? platforms : ["LINKEDIN", "X", "BLOG"]}
      />
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Variantes</h2>
        {masterPost.posts.length === 0 && (
          <p className="text-muted-foreground">Aucune variante pour l&apos;instant : lancez la génération.</p>
        )}
        {masterPost.posts.map((post) => (
          <VariantCard key={post.id} post={post} />
        ))}
      </section>
    </>
  );
}
