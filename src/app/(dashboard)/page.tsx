import Link from "next/link";
import { Suspense } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const masterPosts = await db.masterPost.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true, _count: { select: { posts: true } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bonjour {user.name ?? user.email}</h1>
        <div className="flex gap-2">
          <Link href="/compose" className={buttonVariants()}>
            Nouveau post
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
        </div>
      </div>
      {masterPosts.length === 0 ? (
        <p className="text-muted-foreground">Aucun post pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {masterPosts.map((m) => (
            <li key={m.id}>
              <Link href={`/compose/${m.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted">
                <span className="truncate">{m.title || m.content.slice(0, 80)}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{m._count.posts} variante(s)</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
