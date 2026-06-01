"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Library, Repeat, LayoutGrid, ListTodo, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: typeof Target;
  enabled: boolean;
};

const ITEMS: Item[] = [
  { href: "/", label: "Goals", icon: Target, enabled: true },
  { href: "/habits", label: "Habits", icon: Repeat, enabled: true },
  { href: "/todos", label: "Daily TODOs", icon: ListTodo, enabled: true },
  { href: "/library", label: "Library", icon: Library, enabled: true },
  { href: "/aggregator", label: "Aggregator", icon: LayoutGrid, enabled: false },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col">
      <Link href="/" className="flex h-14 items-center gap-2.5 border-b border-border/30 px-5">
        <div className="relative size-7 rounded-md bg-gradient-to-br from-primary to-[oklch(0.74_0.14_175)] shadow-[0_0_20px_oklch(0.66_0.22_285/0.5)]">
          <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white">
            T
          </div>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-[0.14em]">TRACKER</span>
          <span className="mt-0.5 text-[8px] uppercase tracking-[0.24em] text-muted-foreground">
            personal
          </span>
        </div>
      </Link>

      <ul className="space-y-0.5 px-3 py-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.enabled &&
            (item.href === "/"
              ? pathname === "/" || pathname.startsWith("/goals")
              : pathname === item.href);
          if (!item.enabled) {
            return (
              <li key={item.href}>
                <div className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/35">
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  <span className="ml-auto rounded-full border border-border/40 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/40">
                    soon
                  </span>
                </div>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                {active && (
                  <span
                    className="ml-auto size-1.5 rounded-full bg-primary"
                    style={{ boxShadow: "0 0 8px oklch(0.66 0.22 285)" }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-3 border-t border-border/30 px-5 py-4">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-3.5" />
          Settings
        </button>
        <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground/40">
          v1.0 · build 2026.5
        </p>
      </div>
    </nav>
  );
}
