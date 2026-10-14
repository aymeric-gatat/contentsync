import Link from "next/link";

// Pas de contrôle d'accès ici : les layouts ne se re-rendent pas à la navigation. Chaque page appelle requireUser().
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-6 border-b px-6 py-3">
        <Link href="/" className="font-semibold">
          ContentSync
        </Link>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
