import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="hero flex-1">
      <div className="hero-content text-center">
        <div className="flex max-w-md flex-col items-center gap-6">
          <h1 className="text-5xl font-bold">ContentSync</h1>
          <p className="text-base-content/70">
            Rédigez une fois. L&apos;IA adapte votre message pour LinkedIn, X et votre blog, puis le publie au bon moment.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn btn-primary btn-lg">
              Se connecter avec Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
