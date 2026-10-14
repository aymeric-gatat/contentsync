import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default function HomePage() {
  return (
    <Suspense fallback={<span className="loading loading-spinner" aria-label="Chargement" />}>
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
      <h1 className="text-2xl font-bold">Bonjour {user.name ?? user.email}</h1>
      {masterPosts.length === 0 ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center">
            <p className="text-base-content/70">Aucun post pour l&apos;instant.</p>
            <Link href="/compose" className="btn btn-primary">
              Créer mon premier post
            </Link>
          </div>
        </div>
      ) : (
        <ul className="list rounded-box bg-base-100 shadow-sm">
          {masterPosts.map((m) => (
            <li key={m.id} className="list-row items-center">
              <Link href={`/compose/${m.id}`} className="list-col-grow link link-hover truncate">
                {m.title || m.content.slice(0, 80)}
              </Link>
              <span className="badge badge-ghost">{m._count.posts} variante(s)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
