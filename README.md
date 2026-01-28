# Command Center

Personal operations dashboard that integrates with an Obsidian vault to surface tasks, emails, Teams messages, and meeting notes in a single view. Includes an AI chat agent backed by Claude that can query and manage vault content.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack dev)
- **UI:** React 19, Tailwind CSS 4, Lucide icons
- **State:** Zustand 5 (layout), TanStack React Query 5 (server state)
- **AI:** Anthropic SDK (Claude), dual backend (Claude Code subprocess or API)
- **Validation:** Zod 3
- **Testing:** Vitest 3

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your values (see Environment Variables below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OBSIDIAN_VAULT_PATH` | Yes | Absolute path to Obsidian vault |
| `ANTHROPIC_API_KEY` | No | Anthropic API key. Omit to use Claude Code subprocess (Max subscription) |
| `SIMPLEMEM_PATH` | No | Path to SimpleMem MCP server |
| `SIMPLEMEM_DB_PATH` | No | Path to SimpleMem LanceDB data |
| `SIMPLEMEM_PYTHON` | No | Path to SimpleMem Python executable |
| `OPENMEMORY_URL` | No | OpenMemory MCP server URL |
| `NEXT_PUBLIC_ENABLE_PIP` | No | Set to `true` to enable PIP evidence panel and agent tool |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run tests (Vitest, single run) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |

## Architecture

```
src/
├── app/                    # Next.js pages & API routes
│   ├── api/agent/          # Streaming agent endpoint (SSE)
│   ├── api/health/         # MCP health check
│   ├── api/scan/           # Vault scanner
│   ├── api/tasks/          # Task CRUD
│   ├── tasks/              # Tasks page
│   └── projects/           # Projects page
├── components/
│   ├── chat/               # Chat panel, message input, markdown rendering
│   ├── dashboard/          # Status cards, task table, feed, priorities
│   ├── layout/             # App shell, header, sidebar
│   └── ui/                 # Reusable primitives (Card, Skeleton)
├── config/                 # Zod-validated app configuration
├── hooks/                  # useAgent (streaming), useTasks (CRUD)
├── lib/
│   ├── agent/              # Dual-backend AI agent (Claude Code / Anthropic API)
│   ├── obsidian/           # Vault scanner, task parser, email parser
│   ├── safety/             # Env validation, MCP health, safe file writes
│   └── utils/              # cn(), date helpers, path helpers
├── stores/                 # Zustand stores (layout, selection)
└── types/                  # TypeScript interfaces (task, agent, project)
```

### Agent System

The agent supports two backends, selected automatically:

1. **Claude Code subprocess** (default) — uses Max subscription, no API key needed
2. **Anthropic API** — activated when `ANTHROPIC_API_KEY` is set

The agent has tools for listing/creating/updating tasks, scanning the vault, and reading files. Responses stream via SSE to the chat panel.

### Vault Integration

The scanner reads the Obsidian vault at configured hot paths (TaskNotes, Projects, Calendar, recent emails/Teams/daily notes) and caches results. Tasks are parsed from markdown frontmatter (YAML) in TaskNote files.

### Feature Flags

| Flag | Effect |
|------|--------|
| `NEXT_PUBLIC_ENABLE_PIP=true` | Enables PIP evidence dashboard panel and `generate_pip_report` agent tool. PIP source files are gitignored. |

## Testing

```bash
npm test              # 51 tests across 6 suites
npm run test:watch    # Watch mode
```

Test suites cover task parsing, vault operations, vault scanning, path resolution, error handling, and evidence generation.
