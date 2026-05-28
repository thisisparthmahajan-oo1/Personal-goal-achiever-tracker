import { addDays, format, startOfDay, subDays } from "date-fns";

type Cell = { date: Date; total: number; done: number; ratio: number };

const WEEKS = 14;

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function HabitHeatmap({ data }: { data: Cell[] }) {
  const today = startOfDay(new Date());
  const oldest = data[0]?.date ?? subDays(today, 89);
  const oldestSunday = subDays(oldest, oldest.getDay());

  const map = new Map<string, Cell>();
  for (const d of data) map.set(dayKey(d.date), d);

  const cols: { date: Date; entry?: Cell; inRange: boolean }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: Date; entry?: Cell; inRange: boolean }[] = [];
    for (let day = 0; day < 7; day++) {
      const d = addDays(oldestSunday, w * 7 + day);
      const entry = map.get(dayKey(d));
      const inRange = d >= oldest && d <= today;
      col.push({ date: d, entry, inRange });
    }
    cols.push(col);
  }

  return (
    <div className="priv flex gap-[3px]">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((cell, j) => {
            if (!cell.inRange) {
              return <div key={j} className="size-3 rounded-sm bg-transparent" />;
            }
            const intensity = cell.entry?.ratio ?? 0;
            const hasData = (cell.entry?.total ?? 0) > 0;
            const opacity = hasData ? 0.18 + intensity * 0.72 : 0.06;
            const title = cell.entry?.total
              ? `${format(cell.date, "MMM d")} · ${cell.entry.done}/${cell.entry.total}`
              : `${format(cell.date, "MMM d")} · no habits`;
            return (
              <div
                key={j}
                title={title}
                className="size-3 rounded-sm bg-primary"
                style={{ opacity }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
