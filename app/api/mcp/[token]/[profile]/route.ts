import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import * as todos from "@/lib/repositories/todos";
import * as trips from "@/lib/repositories/trips";
import * as goals from "@/lib/repositories/goals";
import * as stash from "@/lib/repositories/stash";
import * as meetings from "@/lib/repositories/meetings";
import * as tasks from "@/lib/repositories/tasks";
import { TripItemStatus } from "@/lib/schemas";
import { runWithProfile } from "@/lib/profile-context";

const ALLOWED_PROFILES = new Set(["personal", "office"]);

function isoKey(d: Date): string {
  // yyyy-mm-dd in UTC — matches the way task_instances normalize occurrence_date.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const dynamic = "force-dynamic";
// Mongo driver requires the Node runtime, not Edge.
export const runtime = "nodejs";
// Don't time out on slow first connections to Atlas.
export const maxDuration = 60;

const asText = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

function buildServer(): McpServer {
  const server = new McpServer({
    name: "personal-tracker",
    version: "1.0.0",
  });

  // ---------- TODOs ----------

  server.registerTool(
    "list_open_todos",
    {
      title: "List open TODOs",
      description:
        "Show every open daily TODO (not completed). Includes their status (todo / doing / done).",
      inputSchema: {},
    },
    async () => asText(await todos.listOpen())
  );

  server.registerTool(
    "add_todo",
    {
      title: "Add TODO",
      description:
        "Add a new TODO to the daily list. Use this when the user says things like 'remind me to X' or 'add X to my list'.",
      inputSchema: {
        title: z.string().min(1).max(300).describe("What needs doing"),
      },
    },
    async ({ title }) => asText(await todos.create({ title }))
  );

  server.registerTool(
    "complete_todo",
    {
      title: "Mark TODO completed",
      description:
        "Mark a TODO as done by its _id. Find the id via list_open_todos first.",
      inputSchema: {
        id: z.string().describe("TODO _id"),
      },
    },
    async ({ id }) => {
      const t = await todos.setCompleted(id, true);
      if (!t) return { ...asText(`TODO not found: ${id}`), isError: true };
      return asText(t);
    }
  );

  // ---------- Goals ----------

  server.registerTool(
    "list_active_goals",
    {
      title: "List active goals",
      description: "List all active goals (excludes completed / archived).",
      inputSchema: {},
    },
    async () => asText(await goals.list({ status: "active" }))
  );

  // ---------- Habits ----------

  server.registerTool(
    "list_habits",
    {
      title: "List habits",
      description:
        "List every recurring habit (tasks with a recurrence rule). Includes the recurrence config so you can tell which days the habit is meant to fire.",
      inputSchema: {},
    },
    async () => asText(await tasks.listHabits())
  );

  server.registerTool(
    "today_habits",
    {
      title: "Today's habits",
      description:
        "List the habits scheduled for today plus whether each is already done. Use this before mark_habit_done so you know what to act on.",
      inputSchema: {},
    },
    async () => {
      const all = await tasks.listHabits();
      const now = new Date();
      const dow = now.getDay();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );
      const scheduled = all.filter((t) =>
        tasks.getHabitWeekdays(t).includes(dow)
      );
      const instances = await Promise.all(
        scheduled.map((t) => tasks.getInstances(t._id, today, today))
      );
      return asText(
        scheduled.map((t, i) => ({
          _id: t._id,
          title: t.title,
          description: t.description,
          recurrence: t.recurrence,
          completed_today: instances[i].some((x) => x.completed_at !== null),
        }))
      );
    }
  );

  server.registerTool(
    "mark_habit_done",
    {
      title: "Mark a habit done for today",
      description:
        "Toggle today's completion for a habit by task _id. If already done today, this un-marks it. Find ids via list_habits or today_habits.",
      inputSchema: {
        task_id: z.string().describe("Habit task _id"),
      },
    },
    async ({ task_id }) => {
      const instance = await tasks.toggleOccurrence(task_id, new Date());
      return asText(instance);
    }
  );

  server.registerTool(
    "habit_history",
    {
      title: "Habit history (per habit)",
      description:
        "For one habit: return the last N days as a per-day grid (date, scheduled, completed), current and longest streaks (all-time), and a completion percentage over the window. Use for 'how am I doing on X' / 'what's my X streak' questions.",
      inputSchema: {
        task_id: z.string().describe("Habit task _id"),
        days: z
          .number()
          .int()
          .positive()
          .max(365)
          .default(30)
          .describe("Look-back window in days. Defaults to 30."),
      },
    },
    async ({ task_id, days }) => {
      const t = await tasks.get(task_id);
      if (!t || !t.recurrence) {
        return {
          ...asText(`Habit not found or not recurring: ${task_id}`),
          isError: true,
        };
      }
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - (days - 1));

      const weekdays = tasks.getHabitWeekdays(t);
      const windowInstances = await tasks.getInstances(task_id, start, today);
      const completedKeys = new Set(
        windowInstances
          .filter((i) => i.completed_at !== null)
          .map((i) => isoKey(new Date(i.occurrence_date)))
      );

      const occurrences: {
        date: string;
        weekday: number;
        scheduled: boolean;
        completed: boolean;
      }[] = [];
      for (
        let cursor = new Date(start);
        cursor <= today;
        cursor = new Date(cursor.getTime() + 86400000)
      ) {
        const key = isoKey(cursor);
        occurrences.push({
          date: key,
          weekday: cursor.getUTCDay(),
          scheduled: weekdays.includes(cursor.getUTCDay()),
          completed: completedKeys.has(key),
        });
      }

      const allByTask = await tasks.getAllInstancesForTasks([task_id]);
      const streak = tasks.computeStreaks(t, allByTask[task_id] ?? []);
      const scheduledDays = occurrences.filter((o) => o.scheduled).length;
      const completedScheduled = occurrences.filter(
        (o) => o.scheduled && o.completed
      ).length;

      return asText({
        habit: {
          _id: t._id,
          title: t.title,
          description: t.description,
          recurrence: t.recurrence,
        },
        range: {
          from: occurrences[0]?.date,
          to: occurrences.at(-1)?.date,
          days,
        },
        summary: {
          scheduled_days: scheduledDays,
          completed_scheduled: completedScheduled,
          completion_pct:
            scheduledDays > 0
              ? Math.round((completedScheduled / scheduledDays) * 100)
              : 0,
        },
        streak,
        occurrences,
      });
    }
  );

  server.registerTool(
    "habits_overview",
    {
      title: "Habits overview (all habits)",
      description:
        "Rollup across every habit: completion % over the last N days, plus current and longest streaks per habit. Sorted lowest-completion first so the lagging habits surface. Use for 'how are my habits doing this week' style questions.",
      inputSchema: {
        days: z
          .number()
          .int()
          .positive()
          .max(180)
          .default(7)
          .describe("Look-back window. Defaults to 7."),
      },
    },
    async ({ days }) => {
      const habitList = await tasks.listHabits();
      if (habitList.length === 0)
        return asText({ range_days: days, habits: [] });
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - (days - 1));
      const allByTask = await tasks.getAllInstancesForTasks(
        habitList.map((h) => h._id)
      );

      const out = habitList.map((h) => {
        const weekdays = tasks.getHabitWeekdays(h);
        const insts = allByTask[h._id] ?? [];
        const completedSet = new Set(
          insts
            .filter((i) => i.completed_at !== null)
            .map((i) => isoKey(new Date(i.occurrence_date)))
        );
        let scheduled = 0;
        let completed = 0;
        for (
          let cursor = new Date(start);
          cursor <= today;
          cursor = new Date(cursor.getTime() + 86400000)
        ) {
          if (weekdays.includes(cursor.getUTCDay())) {
            scheduled++;
            if (completedSet.has(isoKey(cursor))) completed++;
          }
        }
        const streak = tasks.computeStreaks(h, insts);
        return {
          _id: h._id,
          title: h.title,
          completion_pct:
            scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
          completed,
          scheduled,
          current_streak: streak.current,
          longest_streak: streak.longest,
          last_completed: streak.last_completed,
        };
      });
      out.sort((a, b) => a.completion_pct - b.completion_pct);
      return asText({ range_days: days, habits: out });
    }
  );

  // ---------- Trips ----------

  server.registerTool(
    "list_trips",
    {
      title: "List trips",
      description:
        "List upcoming / current trips with their _id, title, destination, dates, and item counts.",
      inputSchema: {},
    },
    async () => {
      const list = await trips.listTrips({ archived: false });
      const enriched = await Promise.all(
        list.map(async (t) => ({
          ...t,
          counts: await trips.countItems(t._id),
        }))
      );
      return asText(enriched);
    }
  );

  server.registerTool(
    "list_trip_prep",
    {
      title: "List trip prep items",
      description:
        "Show the prep checklist for a trip — each item's name, owner, status, due_date, notes. Find trip_id via list_trips.",
      inputSchema: {
        trip_id: z.string().describe("Trip _id"),
      },
    },
    async ({ trip_id }) => asText(await trips.listItems(trip_id))
  );

  server.registerTool(
    "update_trip_item_status",
    {
      title: "Update a trip prep item's status",
      description:
        "Change a trip prep item's status (yet_to_start / in_review / completed). Find the id via list_trip_prep.",
      inputSchema: {
        id: z.string().describe("Trip item _id"),
        status: TripItemStatus,
      },
    },
    async ({ id, status }) => {
      const updated = await trips.updateItem(id, { status });
      if (!updated)
        return { ...asText(`Trip item not found: ${id}`), isError: true };
      return asText(updated);
    }
  );

  // ---------- Meetings ----------

  server.registerTool(
    "list_recent_meetings",
    {
      title: "List recent meetings",
      description:
        "Show the most recent N meetings (across all series + ad-hoc). Useful for recalling commitments — pair with list_action_items on a specific meeting.",
      inputSchema: {
        limit: z.number().int().positive().max(20).default(5),
      },
    },
    async ({ limit }) => asText(await meetings.listRecentMeetings(limit))
  );

  server.registerTool(
    "list_meeting_action_items",
    {
      title: "List a meeting's action items",
      description:
        "Show every TODO that originated from a specific meeting (linked via source_meeting_id).",
      inputSchema: {
        meeting_id: z.string().describe("Meeting _id"),
      },
    },
    async ({ meeting_id }) =>
      asText(await todos.listForMeeting(meeting_id))
  );

  // ---------- Stash ----------

  server.registerTool(
    "add_stash_item",
    {
      title: "Stash a link or note",
      description:
        "Quick-capture a URL or a short note (or both) into the Library Stash. Either url or note must be provided.",
      inputSchema: {
        label: z.string().min(1).max(200).describe("Short title"),
        url: z.string().url().nullable().optional(),
        note: z.string().max(2000).nullable().optional(),
      },
    },
    async ({ label, url, note }) => {
      if (!url && !note)
        return {
          ...asText("Either url or note must be provided."),
          isError: true,
        };
      const item = await stash.create({
        label,
        url: url ?? null,
        note: note ?? null,
      });
      return asText(item);
    }
  );

  return server;
}

type Ctx = { params: Promise<{ token: string; profile: string }> };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handle(req: Request, ctx: Ctx): Promise<Response> {
  const expected = process.env.MCP_TOKEN;
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "MCP_TOKEN is not configured on the server." }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
  const { token, profile } = await ctx.params;
  if (!token || !timingSafeEqual(token, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (!ALLOWED_PROFILES.has(profile)) {
    return new Response(
      JSON.stringify({
        error: `Unknown profile "${profile}". Expected one of: ${[...ALLOWED_PROFILES].join(", ")}`,
      }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }

  // Bind the profile slug for the lifetime of this request so every repo
  // call inside the tool handlers scopes to the right profile. Then build
  // a fresh transport + server per request — stateless, no shared session.
  return runWithProfile(profile, async () => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = buildServer();
    await server.connect(transport);
    return transport.handleRequest(req);
  });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
