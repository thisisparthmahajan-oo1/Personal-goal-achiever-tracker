#!/usr/bin/env tsx
/**
 * Personal Tracker MCP server (stdio transport).
 *
 * Exposes tools to read and write goals, tasks, and check-ins.
 * Talks to the same MongoDB the web app uses.
 *
 * Run via Claude Code MCP config:
 *   "personal-tracker": {
 *     "command": "npx",
 *     "args": ["tsx", "/absolute/path/to/personal-tracker/mcp-server/index.ts"]
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import * as goals from "../lib/repositories/goals";
import * as tasks from "../lib/repositories/tasks";
import * as todos from "../lib/repositories/todos";
import {
  Frequency,
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

// ---------- Connect ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so stdout stays clean for the MCP protocol.
  console.error("personal-tracker MCP server connected");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
