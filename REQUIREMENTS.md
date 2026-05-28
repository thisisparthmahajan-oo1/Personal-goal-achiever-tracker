# Personal Tracker — Requirements v1

## Product summary

A single-user, local web app for tracking progress against personal focus areas. The unmet need it addresses (vs. Notion): explicit, quantifiable progress over time, plus a Claude-native way to populate goals/tasks from research sessions.

**Data flow:** User defines goals and tasks manually in the UI, **or** Claude Code creates them via the MCP server during a research session in the terminal. Research reports themselves stay in the terminal — only the resulting goals and tasks land in the app.

## Core entities

- **Goal** — `title`, `description`, `target_date` (per-goal, variable duration), `status`, optional `source` label (e.g. `"claude research 2026-05-20"`) for traceability.
- **Task** — belongs to a goal. `title`, `status` (`todo` / `doing` / `done`), `priority`, optional `parent_task_id` (for subtasks), optional `recurrence` rule (for recurring tasks).
- **Check-in** — belongs to a goal. `confidence` score (0–1), `note`, `timestamp`. Weekly cadence.

## Functional scope (v1)

- Full manual CRUD for goals, tasks, and subtasks in the UI.
- Recurring tasks: define a recurrence rule; instances auto-generate.
- Weekly check-in flow per goal. App flags goals that are overdue for a check-in.
- **Dashboard:** active goals with **both** progress signals shown side by side — confidence trend (sparkline of recent check-ins) and task-completion ratio.
- **Goal detail page:** task tree (with subtasks), check-in history, trend chart.
- **MCP server** exposing tools to create/update goals, tasks, and check-ins. This is the *only* Claude integration surface — there is no in-app research report ingestion.
- Local-only, single-user, no authentication.

## Out of scope (v1) — named to prevent drift

- Notes, daily logs, calendar, any aggregator features.
- Multi-user, sharing, cross-device sync.
- Mobile-optimized UI (desktop browser only).
- Notifications / reminders (overdue is shown in-app, not pushed).
- Task dependencies (blocked-by relationships).
- In-app research report ingestion.

## UI/UX direction

Professional and futuristic. Working interpretation (to be refined during design):

- Dark-first theme with high-contrast typography.
- Depth via glass / subtle blur, not skeuomorphism.
- Considered motion — meaningful transitions, never decorative.
- Data-dense without being cluttered: trend charts, sparklines, status chips treated as first-class UI primitives.
- Monospaced numerals for any displayed metric, so columns of numbers align cleanly.

## Stack

- **Next.js** (App Router) — UI + API routes in a single process.
- **MongoDB** local (`mongod`), accessed via the official `mongodb` driver.
- **Zod** schemas as the single source of truth for entity shapes; shared between API routes and MCP server.
- **MCP server** — standalone Node process in the same repo, talks to the same DB.
- **Tailwind CSS + shadcn/ui** for UI primitives.
