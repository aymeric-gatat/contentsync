import Link from "next/link";
import { signOut } from "@/lib/auth";

// Pas de contrôle d'accès ici : les layouts ne se re-rendent pas à la navigation. Chaque page appelle requireUser().
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="navbar bg-base-100 px-2 shadow-sm sm:px-4">
        <div className="navbar-start w-auto flex-1">
          <Link href="/" className="btn btn-ghost px-2 text-lg font-bold">
            ContentSync
          </Link>
        </div>
        <nav className="navbar-end w-auto gap-1">
          <Link href="/compose" className="btn btn-primary btn-sm">
            Nouveau post
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn btn-ghost btn-sm">
              Déconnexion
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
