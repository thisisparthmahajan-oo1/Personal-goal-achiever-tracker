import { CommandPalette } from "./CommandPalette";
import { PrivacyToggle } from "@/components/privacy/PrivacyToggle";
import { cn } from "@/lib/utils";

type Stats = {
  activeGoals: number;
  avgProgress: number;
  mongoOk: boolean;
};

type GoalRef = { _id: string; title: string };

export function TopBar({
  stats,
  goals,
}: {
  stats: Stats;
  goals: GoalRef[];
}) {
  return (
    <div className="flex h-14 items-center justify-between px-6">
      <div className="flex items-center gap-5 text-[11px] uppercase tracking-[0.18em]">
        <Stat label="Active" value={stats.activeGoals.toString()} />
        <Separator />
        <Stat label="Avg progress" value={`${stats.avgProgress}%`} />
      </div>

      <div className="flex items-center gap-4">
        <CommandPalette goals={goals} />
        <PrivacyToggle />
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              stats.mongoOk
                ? "bg-[oklch(0.74_0.14_175)]"
                : "bg-destructive"
            )}
            style={{
              boxShadow: stats.mongoOk
                ? "0 0 8px oklch(0.74 0.14 175 / 0.8)"
                : "0 0 8px oklch(0.66 0.21 22 / 0.8)",
            }}
          />
          <span>db</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground/60">{label}</span>
      <span
        data-numeric
        className="priv font-mono text-foreground tabular-nums normal-case tracking-normal"
      >
        {value}
      </span>
    </div>
  );
}

function Separator() {
  return <span className="h-3 w-px bg-border/60" />;
}
