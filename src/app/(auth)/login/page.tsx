import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">ContentSync</h1>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <Button type="submit">Se connecter avec Google</Button>
      </form>
    </main>
  );
}
