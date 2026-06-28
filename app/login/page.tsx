import { Lock } from "lucide-react";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  wrong: "Wrong passcode. Try again.",
  config: "Server isn't configured for auth yet — set APP_PASSCODE and SESSION_SECRET.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  const err = sp.error ? ERROR_MESSAGES[sp.error] ?? null : null;

  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border/30 bg-card/40 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Lock className="size-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              <span className="text-primary">●</span>
              <span className="ml-2">Tracker</span>
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Enter passcode</h1>
          </div>
        </div>

        <form action={loginAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <input
            name="passcode"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            placeholder="Passcode"
            className="w-full rounded-md border border-border/40 bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
          {err && (
            <p className="text-[11px] text-rose-300/90">{err}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Unlock
          </button>
        </form>

        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
          Session lasts 30 days on this device.
        </p>
      </div>
    </div>
  );
}
