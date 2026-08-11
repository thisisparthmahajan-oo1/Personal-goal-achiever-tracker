import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import * as todos from "@/lib/repositories/todos";
import * as trips from "@/lib/repositories/trips";
import * as tripSections from "@/lib/repositories/trip-sections";
import * as goals from "@/lib/repositories/goals";
import * as stash from "@/lib/repositories/stash";
import * as meetings from "@/lib/repositories/meetings";
import * as tasks from "@/lib/repositories/tasks";
import {
  Frequency,
  Priority,
  RecurrenceRuleSchema,
  Status,
  TaskStatus,
  TripSectionContentType,
  TripSectionItemStatus,
  SpotCategory,
  SpotPriority,
  MealTag,
} from "@/lib/schemas";
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
    "list_goals",
    {
      title: "List goals",
      description:
        "List goals, optionally filtered by status. Defaults to active only — pass status 'archived' to see goals that were set aside, or 'completed' for finished ones.",
      inputSchema: {
        status: Status.optional().describe(
          "Filter by status. Defaults to 'active'."
        ),
      },
    },
    async ({ status }) => asText(await goals.list({ status: status ?? "active" }))
  );

  server.registerTool(
    "create_goal",
    {
      title: "Create goal",
      description:
        "Create a new goal. Goals are the top-level focus areas on the dashboard; tasks hang off them and carry the weight that drives progress.",
      inputSchema: {
        title: z.string().min(1).max(200).describe("Short goal title"),
        description: z.string().nullable().optional().describe("Optional detail"),
        target_date: z
          .string()
          .nullable()
          .optional()
          .describe("Target completion date, ISO yyyy-mm-dd"),
        source: z
          .string()
          .nullable()
          .optional()
          .describe("Where this came from — a URL or a short label"),
      },
    },
    async ({ title, description, target_date, source }) =>
      asText(
        await goals.create({
          title,
          description: description ?? null,
          target_date: target_date ? new Date(target_date) : null,
          source: source ?? null,
          status: "active",
        })
      )
  );

  server.registerTool(
    "update_goal",
    {
      title: "Update goal",
      description:
        "Update a goal's title, description, target_date, source, or status. Only the fields you pass are changed.",
      inputSchema: {
        id: z.string().describe("Goal _id"),
        title: z.string().min(1).max(200).optional(),
        description: z.string().nullable().optional(),
        target_date: z
          .string()
          .nullable()
          .optional()
          .describe("Target completion date, ISO yyyy-mm-dd"),
        source: z.string().nullable().optional(),
        status: Status.optional(),
      },
    },
    async ({ id, target_date, ...rest }) => {
      const patch: Record<string, unknown> = { ...rest };
      if (target_date !== undefined) {
        patch.target_date = target_date ? new Date(target_date) : null;
      }
      const goal = await goals.update(id, patch);
      if (!goal) {
        return {
          content: [{ type: "text" as const, text: `Goal not found: ${id}` }],
          isError: true,
        };
      }
      return asText(goal);
    }
  );

  server.registerTool(
    "set_goal_status",
    {
      title: "Archive / reactivate a goal",
      description:
        "Set a goal's status in one shot. Use 'archived' when the user wants a goal out of the way but still retrievable ('put X on hold', 'make X inactive'), 'completed' when they've finished it, and 'active' to bring it back. Nothing is deleted either way.",
      inputSchema: {
        id: z.string().describe("Goal _id"),
        status: Status.describe("active | completed | archived"),
      },
    },
    async ({ id, status }) => {
      const goal = await goals.update(id, { status });
      if (!goal) {
        return {
          content: [{ type: "text" as const, text: `Goal not found: ${id}` }],
          isError: true,
        };
      }
      return asText(goal);
    }
  );

  // ---------- Tasks ----------

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List tasks, optionally filtered by goal and/or status.",
      inputSchema: {
        goal_id: z.string().optional().describe("Restrict to one goal"),
        status: TaskStatus.optional().describe("todo | doing | done"),
      },
    },
    async (args) => asText(await tasks.list(args))
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description:
        "Create a task or habit. If 'goal_id' is provided, the task belongs to that goal — use 'weight' (0-100) for its share of the goal (root weights sum to 100; subtask weights sum to parent's weight). If 'goal_id' is omitted or null, the task is a standalone habit; in that case 'recurrence' must be set, 'weight' must be 0, and no subtasks are allowed. Use parent_task_id for subtasks (max 2 nesting levels).",
      inputSchema: {
        goal_id: z.string().nullable().optional(),
        title: z.string().min(1).max(200),
        weight: z.number().int().min(0).max(100).default(0),
        parent_task_id: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        priority: Priority.optional(),
        due_date: z.string().nullable().optional().describe("ISO yyyy-mm-dd"),
        recurrence: z
          .object({
            freq: Frequency,
            interval: z.number().int().positive().default(1),
            weekdays: z
              .array(z.number().int().min(0).max(6))
              .nullable()
              .optional(),
            end_date: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
      },
    },
    async ({
      goal_id,
      title,
      weight,
      parent_task_id,
      description,
      priority,
      due_date,
      recurrence,
    }) => {
      const rec = recurrence
        ? RecurrenceRuleSchema.parse({
            freq: recurrence.freq,
            interval: recurrence.interval ?? 1,
            weekdays: recurrence.weekdays ?? null,
            end_date: recurrence.end_date ? new Date(recurrence.end_date) : null,
          })
        : null;
      try {
        return asText(
          await tasks.create({
            goal_id: goal_id ?? null,
            title,
            weight,
            parent_task_id: parent_task_id ?? null,
            description: description ?? null,
            status: "todo",
            priority: priority ?? "med",
            recurrence: rec,
            due_date: due_date ? new Date(due_date) : null,
          })
        );
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: err instanceof Error ? err.message : String(err),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Update a task's title, status, weight, priority, description, or due date. Setting status to 'done' on a parent cascades to subtasks; completing all subtasks auto-completes the parent.",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        status: TaskStatus.optional(),
        weight: z.number().int().min(0).max(100).optional(),
        priority: Priority.optional(),
        description: z.string().nullable().optional(),
        due_date: z.string().nullable().optional().describe("ISO yyyy-mm-dd"),
      },
    },
    async ({ id, due_date, ...rest }) => {
      const patch: Record<string, unknown> = { ...rest };
      if (due_date !== undefined) {
        patch.due_date = due_date ? new Date(due_date) : null;
      }
      try {
        const task = await tasks.update(id, patch);
        if (!task) {
          return {
            content: [{ type: "text" as const, text: `Task not found: ${id}` }],
            isError: true,
          };
        }
        return asText(task);
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: err instanceof Error ? err.message : String(err),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "delete_task",
    {
      title: "Delete task",
      description:
        "Delete a task and all its subtasks. Permanent — prefer setting status to 'done' if the user just finished it.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => asText({ ok: await tasks.remove(id) })
  );

  server.registerTool(
    "set_recurrence",
    {
      title: "Set recurrence",
      description:
        "Set or clear the recurrence rule on a task. Pass `rule: null` to clear.",
      inputSchema: {
        task_id: z.string(),
        rule: z
          .object({
            freq: Frequency,
            interval: z.number().int().positive().default(1),
            weekdays: z
              .array(z.number().int().min(0).max(6))
              .nullable()
              .optional(),
            end_date: z.string().nullable().optional(),
          })
          .nullable(),
      },
    },
    async ({ task_id, rule }) => {
      const parsed = rule
        ? RecurrenceRuleSchema.parse({
            freq: rule.freq,
            interval: rule.interval ?? 1,
            weekdays: rule.weekdays ?? null,
            end_date: rule.end_date ? new Date(rule.end_date) : null,
          })
        : null;
      const task = await tasks.update(task_id, { recurrence: parsed });
      if (!task) {
        return {
          content: [{ type: "text" as const, text: `Task not found: ${task_id}` }],
          isError: true,
        };
      }
      return asText(task);
    }
  );

  server.registerTool(
    "toggle_task_occurrence",
    {
      title: "Toggle a task occurrence",
      description:
        "Toggle completion of a recurring task's occurrence on a given date. Omit 'date' for today. For habits specifically, mark_habit_done is the friendlier entry point.",
      inputSchema: {
        task_id: z.string(),
        date: z
          .string()
          .optional()
          .describe("ISO yyyy-mm-dd. Defaults to today."),
      },
    },
    async ({ task_id, date }) =>
      asText(await tasks.toggleOccurrence(task_id, date ? new Date(date) : new Date()))
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
        "List upcoming / current trips with their _id, title, destination, and dates.",
      inputSchema: {},
    },
    async () => {
      const list = await trips.listTrips({ archived: false });
      return asText(list);
    }
  );

  // ---------- Trip sections ----------

  server.registerTool(
    "list_trip_sections",
    {
      title: "List trip sections",
      description:
        "List every section and subsection for a trip (flat list — use parent_id to see the 2-level hierarchy: null = top-level section, otherwise a subsection of that section). Each has a content_type of 'tasks' (checklist items with status/due date/notes) or 'spots' (food/beach-club recommendations). Find trip_id via list_trips.",
      inputSchema: {
        trip_id: z.string(),
      },
    },
    async ({ trip_id }) => asText(await tripSections.listSections(trip_id))
  );

  server.registerTool(
    "create_trip_section",
    {
      title: "Create trip section",
      description:
        "Create a top-level section or a subsection under one. Subsections cannot themselves have children (2-level max). content_type determines what kind of leaf content it can hold: 'tasks' (default) or 'spots'.",
      inputSchema: {
        trip_id: z.string(),
        name: z.string().min(1).max(200),
        parent_id: z.string().nullable().optional(),
        content_type: TripSectionContentType.optional(),
      },
    },
    async ({ trip_id, name, parent_id, content_type }) => {
      try {
        return asText(
          await tripSections.createSection(trip_id, {
            name,
            parent_id: parent_id ?? null,
            content_type,
          })
        );
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: err instanceof Error ? err.message : String(err),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "delete_trip_section",
    {
      title: "Delete trip section",
      description:
        "Delete a section. Permanent — cascades to its subsections and all their items/spots, plus its own items/spots.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => asText({ ok: await tripSections.removeSection(id) })
  );

  server.registerTool(
    "list_trip_items",
    {
      title: "List trip checklist items",
      description:
        "List task-template items (name, status, due date, notes) for a trip, optionally restricted to one section. Only applies to sections with content_type 'tasks'.",
      inputSchema: {
        trip_id: z.string(),
        section_id: z.string().optional(),
      },
    },
    async ({ trip_id, section_id }) => {
      const all = await tripSections.listItems(trip_id);
      return asText(section_id ? all.filter((i) => i.section_id === section_id) : all);
    }
  );

  server.registerTool(
    "create_trip_item",
    {
      title: "Create trip checklist item",
      description:
        "Add a checklist item under a section (must have content_type 'tasks'). Find section_id via list_trip_sections.",
      inputSchema: {
        trip_id: z.string(),
        section_id: z.string(),
        name: z.string().min(1).max(300),
      },
    },
    async ({ trip_id, section_id, name }) =>
      asText(await tripSections.createItem(trip_id, section_id, { name }))
  );

  server.registerTool(
    "update_trip_item",
    {
      title: "Update trip checklist item",
      description:
        "Update a checklist item's name, status (yet_to_start / in_review / completed), due date, or notes.",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(300).optional(),
        status: TripSectionItemStatus.optional(),
        due_date: z.string().nullable().optional().describe("ISO yyyy-mm-dd"),
        notes: z.string().nullable().optional(),
      },
    },
    async ({ id, due_date, ...rest }) => {
      const patch: Record<string, unknown> = { ...rest };
      if (due_date !== undefined) {
        patch.due_date = due_date ? new Date(due_date) : null;
      }
      const item = await tripSections.updateItem(id, patch);
      if (!item)
        return { ...asText(`Trip item not found: ${id}`), isError: true };
      return asText(item);
    }
  );

  server.registerTool(
    "delete_trip_item",
    {
      title: "Delete trip checklist item",
      description: "Delete a checklist item. Permanent.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => asText({ ok: await tripSections.removeItem(id) })
  );

  server.registerTool(
    "list_trip_spots",
    {
      title: "List trip spots",
      description:
        "List food/beach-club recommendation entries (name, category, priority, meal tags, dishes, link, notes) for a trip, optionally restricted to one section. Only applies to sections with content_type 'spots' (e.g. per-city subsections under a City Research section).",
      inputSchema: {
        trip_id: z.string(),
        section_id: z.string().optional(),
      },
    },
    async ({ trip_id, section_id }) => {
      const all = await tripSections.listSpots(trip_id);
      return asText(section_id ? all.filter((s) => s.section_id === section_id) : all);
    }
  );

  server.registerTool(
    "create_trip_spot",
    {
      title: "Create trip spot",
      description:
        "Add a spot (restaurant/cafe/beach club/etc) under a section (must have content_type 'spots'). Find section_id via list_trip_sections. Defaults to category 'other' and priority 'optional' — use update_trip_spot to set the rest.",
      inputSchema: {
        trip_id: z.string(),
        section_id: z.string(),
        name: z.string().min(1).max(200),
      },
    },
    async ({ trip_id, section_id, name }) =>
      asText(await tripSections.createSpot(trip_id, section_id, { name }))
  );

  server.registerTool(
    "update_trip_spot",
    {
      title: "Update trip spot",
      description:
        "Update a spot's name, category, priority (must_try / optional), meal tags (breakfast/lunch/dinner), what-to-try dishes, link, or notes.",
      inputSchema: {
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        category: SpotCategory.optional(),
        priority: SpotPriority.optional(),
        meal_tags: z.array(MealTag).optional(),
        dishes: z.string().nullable().optional(),
        link: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      },
    },
    async ({ id, ...patch }) => {
      const spot = await tripSections.updateSpot(id, patch);
      if (!spot)
        return { ...asText(`Trip spot not found: ${id}`), isError: true };
      return asText(spot);
    }
  );

  server.registerTool(
    "delete_trip_spot",
    {
      title: "Delete trip spot",
      description: "Delete a spot entry. Permanent.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => asText({ ok: await tripSections.removeSpot(id) })
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
