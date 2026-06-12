#!/usr/bin/env tsx
/**
 * Personal Tracker MCP server (stdio transport).
 *
 * Exposes tools to read and write goals, tasks, and check-ins.
 * Talks to the same MongoDB the web app uses.
 *
 * Run via Claude Code MCP config (one instance per profile):
 *   "personal-tracker": {
 *     "command": "npx",
 *     "args": ["tsx", "/absolute/path/to/personal-tracker/mcp-server/index.ts"],
 *     "env": { "TRACKER_PROFILE_SLUG": "personal" }
 *   },
 *   "office-tracker": { ..., "env": { "TRACKER_PROFILE_SLUG": "office" } }
 *
 * Without TRACKER_PROFILE_SLUG the server defaults to the "personal" profile.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import * as goals from "../lib/repositories/goals";
import * as tasks from "../lib/repositories/tasks";
import * as todos from "../lib/repositories/todos";
import * as goalNotes from "../lib/repositories/goal-notes";
import * as stash from "../lib/repositories/stash";
import * as meetings from "../lib/repositories/meetings";
import {
  Frequency,
  GoalNoteKind,
  Priority,
  RecurrenceRuleSchema,
  Status,
  TaskStatus,
} from "../lib/schemas";

function asText(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "personal-tracker",
  version: "1.0.0",
});

// ---------- Goals ----------

server.registerTool(
  "list_goals",
  {
    title: "List goals",
    description:
      "List all goals, optionally filtered by status. Use this first to find goal_ids before creating tasks or check-ins.",
    inputSchema: {
      status: Status.optional().describe("Filter by status. Defaults to all."),
    },
  },
  async ({ status }) => {
    return asText(await goals.list(status ? { status } : undefined));
  }
);

server.registerTool(
  "get_goal",
  {
    title: "Get goal",
    description:
      "Get a single goal by id, along with its tasks. Use this to understand context before adding new tasks.",
    inputSchema: { id: z.string().describe("Goal _id") },
  },
  async ({ id }) => {
    const [goal, taskList] = await Promise.all([
      goals.get(id),
      tasks.list({ goal_id: id }),
    ]);
    if (!goal) {
      return {
        content: [{ type: "text", text: `Goal not found: ${id}` }],
        isError: true,
      };
    }
    return asText({ goal, tasks: taskList });
  }
);

server.registerTool(
  "create_goal",
  {
    title: "Create goal",
    description:
      "Create a new focus area / goal. Use 'source' to traceably attribute this to a research session (e.g. 'claude research 2026-05-20').",
    inputSchema: {
      title: z.string().min(1).max(200),
      description: z.string().nullable().optional(),
      target_date: z
        .string()
        .nullable()
        .optional()
        .describe("ISO 8601 date string"),
      source: z.string().nullable().optional(),
    },
  },
  async ({ title, description, target_date, source }) => {
    const goal = await goals.create({
      title,
      description: description ?? null,
      target_date: target_date ? new Date(target_date) : null,
      source: source ?? null,
      status: "active",
    });
    return asText(goal);
  }
);

server.registerTool(
  "update_goal",
  {
    title: "Update goal",
    description: "Update a goal's title, description, target_date, source, or status.",
    inputSchema: {
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().nullable().optional(),
      target_date: z.string().nullable().optional(),
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
        content: [{ type: "text", text: `Goal not found: ${id}` }],
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
      goal_id: z.string().optional(),
      status: TaskStatus.optional(),
    },
  },
  async (args) => {
    return asText(await tasks.list(args));
  }
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
      due_date: z.string().nullable().optional(),
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
  async ({ goal_id, title, weight, parent_task_id, description, priority, due_date, recurrence }) => {
    const rec = recurrence
      ? RecurrenceRuleSchema.parse({
          freq: recurrence.freq,
          interval: recurrence.interval ?? 1,
          weekdays: recurrence.weekdays ?? null,
          end_date: recurrence.end_date ? new Date(recurrence.end_date) : null,
        })
      : null;
    try {
      const task = await tasks.create({
        goal_id: goal_id ?? null,
        title,
        weight,
        parent_task_id: parent_task_id ?? null,
        description: description ?? null,
        status: "todo",
        priority: priority ?? "med",
        recurrence: rec,
        due_date: due_date ? new Date(due_date) : null,
      });
      return asText(task);
    } catch (err) {
      return {
        content: [
          { type: "text", text: err instanceof Error ? err.message : String(err) },
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
      due_date: z.string().nullable().optional(),
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
          content: [{ type: "text", text: `Task not found: ${id}` }],
          isError: true,
        };
      }
      return asText(task);
    } catch (err) {
      return {
        content: [
          { type: "text", text: err instanceof Error ? err.message : String(err) },
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
    description: "Delete a task and all its subtasks.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const ok = await tasks.remove(id);
    return asText({ ok });
  }
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
        content: [{ type: "text", text: `Task not found: ${task_id}` }],
        isError: true,
      };
    }
    return asText(task);
  }
);

// ---------- Daily TODOs ----------

server.registerTool(
  "list_todos",
  {
    title: "List daily TODOs",
    description:
      "List daily TODOs. Scope 'open' returns items not yet completed (auto-carry-over). 'completed_today' returns items completed since local midnight. 'all' returns everything. Defaults to 'open'.",
    inputSchema: {
      scope: z.enum(["open", "completed_today", "all"]).optional(),
    },
  },
  async ({ scope }) => {
    const s = scope ?? "open";
    if (s === "open") return asText(await todos.listOpen());
    if (s === "completed_today")
      return asText(await todos.listCompletedOn(new Date()));
    return asText(await todos.list());
  }
);

server.registerTool(
  "create_todo",
  {
    title: "Create daily TODO",
    description:
      "Add a daily TODO. These are day-scoped, non-recurring scratchpad items that auto-roll forward until completed or deleted. For recurring rituals use create_task with a recurrence rule under Habits instead.",
    inputSchema: { title: z.string().min(1).max(300) },
  },
  async ({ title }) => {
    const todo = await todos.create({ title: title.trim() });
    return asText(todo);
  }
);

server.registerTool(
  "complete_todo",
  {
    title: "Complete daily TODO",
    description:
      "Mark a TODO as completed (stamps completed_at = now). Pass `completed: false` to re-open.",
    inputSchema: {
      id: z.string(),
      completed: z.boolean().optional(),
    },
  },
  async ({ id, completed }) => {
    const todo = await todos.setCompleted(id, completed ?? true);
    if (!todo) {
      return {
        content: [{ type: "text", text: `Todo not found: ${id}` }],
        isError: true,
      };
    }
    return asText(todo);
  }
);

server.registerTool(
  "delete_todo",
  {
    title: "Delete daily TODO",
    description: "Delete a TODO permanently.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const ok = await todos.remove(id);
    return asText({ ok });
  }
);

// ---------- Goal Notes ----------

server.registerTool(
  "list_goal_notes",
  {
    title: "List goal notes",
    description:
      "List notes captured under a goal, newest first. Optional kind filter ('personal' | 'office').",
    inputSchema: {
      goal_id: z.string(),
      kind: GoalNoteKind.optional(),
    },
  },
  async ({ goal_id, kind }) => {
    return asText(
      await goalNotes.listForGoal(goal_id, kind ? { kind } : undefined)
    );
  }
);

server.registerTool(
  "create_goal_note",
  {
    title: "Create goal note",
    description:
      "Add a note under a goal. Optionally link the note to a specific task or subtask within that goal via `task_id` so future browsing knows which task the insight relates to. `kind` distinguishes personal vs office context.",
    inputSchema: {
      goal_id: z.string(),
      task_id: z.string().nullable().optional(),
      kind: GoalNoteKind.default("personal"),
      body: z.string().min(1).max(10000),
    },
  },
  async ({ goal_id, task_id, kind, body }) => {
    const note = await goalNotes.create({
      goal_id,
      task_id: task_id ?? null,
      kind: kind ?? "personal",
      body,
    });
    return asText(note);
  }
);

server.registerTool(
  "update_goal_note",
  {
    title: "Update goal note",
    description:
      "Patch a goal note. Any of body, kind, task_id can be updated. Pass `task_id: null` to unlink from a task.",
    inputSchema: {
      id: z.string(),
      body: z.string().min(1).max(10000).optional(),
      kind: GoalNoteKind.optional(),
      task_id: z.string().nullable().optional(),
    },
  },
  async ({ id, body, kind, task_id }) => {
    const patch: Record<string, unknown> = {};
    if (body !== undefined) patch.body = body;
    if (kind !== undefined) patch.kind = kind;
    if (task_id !== undefined) patch.task_id = task_id;
    const note = await goalNotes.update(id, patch);
    if (!note) {
      return {
        content: [{ type: "text", text: `Goal note not found: ${id}` }],
        isError: true,
      };
    }
    return asText(note);
  }
);

server.registerTool(
  "delete_goal_note",
  {
    title: "Delete goal note",
    description: "Delete a goal note permanently.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const ok = await goalNotes.remove(id);
    return asText({ ok });
  }
);

// ---------- Stash ----------

server.registerTool(
  "list_stash",
  {
    title: "List stash items",
    description:
      "List ad-hoc stashed links (Library → Stash), newest first. Optional limit.",
    inputSchema: { limit: z.number().int().positive().optional() },
  },
  async ({ limit }) => {
    const all = await stash.list();
    return asText(limit ? all.slice(0, limit) : all);
  }
);

server.registerTool(
  "add_stash",
  {
    title: "Add stash item",
    description:
      "Save an ad-hoc item to the Library Stash. Use for URLs or text snippets the user wants to remember but that don't belong to a specific goal. `label` is a short title (required). `url` is optional — any scheme (https/file/mailto/etc.) preserved as-is; bare hosts get https:// prefixed. `note` is optional multi-line content (paste a snippet, jot a thought). At least one of `url` or `note` must be provided.",
    inputSchema: {
      label: z.string().min(1).max(200),
      url: z.string().max(2000).nullable().optional(),
      note: z.string().max(5000).nullable().optional(),
    },
  },
  async ({ label, url, note }) => {
    const trimmedUrl = url?.trim();
    const normalizedUrl = trimmedUrl
      ? /^[a-z][a-z0-9+\-.]*:/i.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl}`
      : null;
    const trimmedNote = note?.trim() || null;
    if (!normalizedUrl && !trimmedNote) {
      return {
        content: [
          {
            type: "text",
            text: "Refusing to save: provide at least a url or a note alongside the label.",
          },
        ],
        isError: true,
      };
    }
    const item = await stash.create({
      label: label.trim(),
      url: normalizedUrl,
      note: trimmedNote,
    });
    return asText(item);
  }
);

server.registerTool(
  "delete_stash",
  {
    title: "Delete stash item",
    description: "Remove a stash item permanently.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const ok = await stash.remove(id);
    return asText({ ok });
  }
);

// ---------- Meetings ----------

server.registerTool(
  "list_meeting_series",
  {
    title: "List meeting series",
    description:
      "List recurring meeting series in the active profile. Optional `archived` filter (default: only active series).",
    inputSchema: { archived: z.boolean().optional() },
  },
  async ({ archived }) => {
    return asText(await meetings.listSeries({ archived: archived ?? false }));
  }
);

server.registerTool(
  "create_meeting_series",
  {
    title: "Create meeting series",
    description:
      "Create a recurring meeting series (e.g. 'Weekly 1:1 with Anand'). `cadence_label` is a free-form human description like 'Mondays 4pm' — no real recurrence rule is enforced. `default_attendees` is prefilled into each new meeting's notes.",
    inputSchema: {
      title: z.string().min(1).max(200),
      cadence_label: z.string().max(100).nullable().optional(),
      default_attendees: z.string().max(500).nullable().optional(),
    },
  },
  async ({ title, cadence_label, default_attendees }) => {
    const series = await meetings.createSeries({
      title: title.trim(),
      cadence_label: cadence_label?.trim() || null,
      default_attendees: default_attendees?.trim() || null,
    });
    return asText(series);
  }
);

server.registerTool(
  "list_meetings",
  {
    title: "List meetings",
    description:
      "List meetings in the active profile, newest first. Pass `series_id` to scope to one series, or `series_id: null` for ad-hoc only. Omit to list everything. Optional `limit`.",
    inputSchema: {
      series_id: z.string().nullable().optional(),
      limit: z.number().int().positive().optional(),
    },
  },
  async ({ series_id, limit }) => {
    const opts: { series_id?: string | null; limit?: number } = {};
    if (series_id !== undefined) opts.series_id = series_id;
    if (limit !== undefined) opts.limit = limit;
    return asText(await meetings.listMeetings(opts));
  }
);

server.registerTool(
  "create_meeting",
  {
    title: "Create meeting",
    description:
      "Log a meeting. Pass `series_id` to attach to a recurring series, or omit/null for ad-hoc. `meeting_date` defaults to today if omitted. `body` is free-form multi-line notes (attendees, agenda, decisions). Use `add_meeting_action_item` afterwards to turn each follow-up into a real TODO.",
    inputSchema: {
      series_id: z.string().nullable().optional(),
      title: z.string().max(200).optional(),
      meeting_date: z.string().optional(),
      body: z.string().max(20000).optional(),
    },
  },
  async ({ series_id, title, meeting_date, body }) => {
    const seriesId = series_id ?? null;
    let resolvedTitle = title?.trim() || "";
    let resolvedBody = body ?? "";
    const meetingDate = meeting_date ? new Date(meeting_date) : new Date();
    if (seriesId && !resolvedTitle) {
      const series = await meetings.getSeries(seriesId);
      if (series) {
        const datePart = meetingDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        resolvedTitle = `${series.title} — ${datePart}`;
        if (!resolvedBody && series.default_attendees) {
          resolvedBody = `Attendees: ${series.default_attendees}\n\n`;
        }
      }
    }
    if (!resolvedTitle) resolvedTitle = "Untitled meeting";
    const meeting = await meetings.createMeeting({
      series_id: seriesId,
      title: resolvedTitle,
      meeting_date: meetingDate,
      body: resolvedBody,
    });
    return asText(meeting);
  }
);

server.registerTool(
  "add_meeting_action_item",
  {
    title: "Add meeting action item",
    description:
      "Turn a follow-up from a meeting into a real TODO. Creates a Todo with `source_meeting_id` pointing back to the meeting; it appears in /todos and in the meeting's Action Items section. Use this for every concrete follow-up, not a freeform note in the meeting body.",
    inputSchema: {
      meeting_id: z.string(),
      title: z.string().min(1).max(300),
    },
  },
  async ({ meeting_id, title }) => {
    const meeting = await meetings.getMeeting(meeting_id);
    if (!meeting) {
      return {
        content: [
          { type: "text", text: `Meeting not found: ${meeting_id}` },
        ],
        isError: true,
      };
    }
    const todo = await todos.create({
      title: title.trim(),
      source_meeting_id: meeting_id,
    });
    return asText(todo);
  }
);

// ---------- Connect ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so stdout stays clean for the MCP protocol.
  const profileSlug = process.env.TRACKER_PROFILE_SLUG ?? "personal";
  console.error(
    `personal-tracker MCP server connected (profile=${profileSlug})`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
