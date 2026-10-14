import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  providers: [Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })],
  pages: { signIn: "/login" },
  callbacks: {
    // En JWT, l'id utilisateur n'est exposé dans la session que via token.sub
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Data Access Layer : à appeler dans chaque page / Server Action protégée. */
export async function requireUser() {
  // Auth.js utilise crypto avant de lire les cookies : sans ça, Cache Components tente de pré-rendre la suite.
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}
