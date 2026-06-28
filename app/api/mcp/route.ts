import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import * as todos from "@/lib/repositories/todos";
import * as trips from "@/lib/repositories/trips";
import * as goals from "@/lib/repositories/goals";
import * as stash from "@/lib/repositories/stash";
import * as meetings from "@/lib/repositories/meetings";
import { TripItemStatus } from "@/lib/schemas";

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

async function handle(req: Request): Promise<Response> {
  const token = process.env.MCP_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "MCP_TOKEN is not configured on the server." }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (provided !== token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": 'Bearer realm="personal-tracker-mcp"',
      },
    });
  }

  // Stateless: build a fresh transport + server per request. Per-request
  // cost is negligible and avoids any shared-session state on Vercel where
  // requests may land on different lambdas.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = buildServer();
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
