import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";
import { getDashboardSummary } from "@/lib/repositories/goals";

export async function AppShell({ children }: { children: React.ReactNode }) {
  let mongoOk = true;
  let activeGoals = 0;
  let avgProgress = 0;
  let goalsList: { _id: string; title: string }[] = [];
  try {
    const summary = await getDashboardSummary();
    activeGoals = summary.length;
    avgProgress =
      summary.length === 0
        ? 0
        : Math.round(
            summary.reduce((s, g) => s + g.progress_pct, 0) / summary.length
          );
    goalsList = summary.map((g) => ({ _id: g._id, title: g.title }));
  } catch {
    mongoOk = false;
  }

  return (
    <div className="grid h-screen grid-cols-[220px_1fr] grid-rows-[56px_1fr]">
      <aside className="row-span-2 border-r border-border/30 bg-background/50 backdrop-blur-md">
        <SideNav />
      </aside>
      <header className="border-b border-border/30 bg-background/30 backdrop-blur-md">
        <TopBar
          stats={{ activeGoals, avgProgress, mongoOk }}
          goals={goalsList}
        />
      </header>
      <main className="overflow-y-auto">{children}</main>
    </div>
  );
}
