# Personal Tracker

Single-user, local web app for tracking progress against personal focus areas. Built around two write surfaces: a manual web UI, and an MCP server Claude Code can drive during a research session.

See `REQUIREMENTS.md` for the frozen spec.

## Quickstart

Requires Node 20+ and a running local `mongod` on `mongodb://127.0.0.1:27017`.

```sh
npm install
npm run dev
```

Open http://localhost:3000.

## MCP server

The MCP server exposes typed tools for Claude Code to create/update goals, tasks, and check-ins.

### Run manually

```sh
npm run mcp
```

### Wire it into Claude Code

Add to your Claude Code MCP config (replace the path):

```json
{
  "mcpServers": {
    "personal-tracker": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/personal-tracker/mcp-server/index.ts"]
    }
  }
}
```

After restarting Claude Code, you'll be able to ask Claude to list/create goals and tasks directly from the terminal.

### Tools exposed

- `list_goals` / `get_goal` / `create_goal` / `update_goal`
- `list_tasks` / `create_task` / `update_task` / `delete_task`
- `set_recurrence`
- `log_checkin` / `list_checkins`

## Stack

- Next.js 16 (App Router), React 19
- MongoDB (`mongodb` driver, no ODM)
- Zod schemas as the single source of truth (shared by Next routes and the MCP server)
- Tailwind v4 + shadcn/ui (base-ui flavor)
- Recharts for the trend chart, hand-rolled SVG for sparklines
- Framer Motion for entrances

## Project layout

```
app/                Next.js App Router (UI + server actions)
components/         UI components — dashboard/, goal/, forms/, motion/, ui/ (shadcn)
lib/
  db.ts             Mongo client singleton
  schemas.ts        Zod schemas (single source of truth)
  recurrence.ts     Virtual recurrence expansion (no eager instance creation)
  repositories/     Thin CRUD wrappers, Zod-parsed on read
mcp-server/         Stdio MCP server, imports lib/* directly
```

## Env

Configurable via `.env.local`:

```
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=personal_tracker
```
