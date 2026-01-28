# Command Center — Implementation Plan (v3, Survival Mode)

**Project**: Full-stack AI-powered work management hub
**Language**: TypeScript
**Package Manager**: npm
**Location**: `C:\Users\bkolb\Documents\GitHub\command-center`
**PIP Context**: 90-day PIP (Jan 27 – Apr 27, 2026). First check-in ~Feb 10. Biweekly check-ins.

---

## Critical Constraint: PIP Timeline

| Date | Event | What Brian Needs |
|------|-------|-----------------|
| **Feb 7** | Pre-check-in | Working agent + 10 days of task logs |
| **Feb 10** | 1st check-in | Demo: agent routing, task log, memory usage |
| **Feb 24** | 2nd check-in | Web dashboard with 30 days of analytics |
| **Mar 10** | 3rd check-in | Full dashboard, meeting prep, project views |
| **Mar 24** | 4th check-in | Advanced features, PIP progress tracking |
| **Apr 7** | 5th check-in | Polished system, trend data |
| **Apr 21** | Pre-final | 90-day evidence package generated |
| **Apr 27** | PIP Review | Comprehensive data proving improvement |

**Principle**: Ship incrementally. Every check-in has demo-able progress.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | Single codebase for frontend + API |
| **UI Components** | shadcn/ui + Tailwind CSS | Professional, accessible, own the code |
| **State (Server)** | TanStack Query v5 | Caching, optimistic updates |
| **State (Client)** | Zustand | Selected items, UI prefs, chat panel state |
| **Agent Core** | `@anthropic-ai/claude-agent-sdk` | Claude Agent SDK |
| **Validation** | Zod | Runtime type validation |
| **Markdown** | gray-matter + react-markdown + DOMPurify | Parse frontmatter, render safely |
| **Dev Runtime** | tsx | Run TypeScript scripts directly |
| **Resize** | react-resizable-panels | Drag-to-resize chat panel |

---

## Architecture Overview

```
Browser (Next.js frontend)
  ├── Dashboard (3-column: New Items | Jeremy Priorities | All Tasks)
  │   └── Calendar section (meetings + prep buttons)
  │   └── PIP Evidence module (collapsible)
  ├── Chat Side Panel (resizable, persistent across all views)
  └── Task Views (/tasks — full-page filterable table)
        │
        │ HTTP / Server-Sent Events
        ▼
Next.js API Routes (Node.js backend)
  ├── /api/agent (SSE streaming — Claude Agent SDK)
  ├── /api/tasks (REST — Obsidian TaskNotes CRUD)
  ├── /api/projects (REST — project data from vault)
  └── /api/health (system health + MCP status)
        │
        ├── Claude Agent SDK
        │   ├── Built-in tools (Read, Write, Glob, Grep, Bash)
        │   ├── Custom Obsidian MCP server (in-process via createSdkMcpServer)
        │   └── Subagents (task, search, triage, meeting-prep, project)
        │
        ├── SimpleMem MCP (STDIO) — temporal memory
        ├── OpenMemory MCP (HTTP :8081) — persistent memory
        └── Obsidian Vault (scoped hot-path only) — ~600 active files from 25,500+ total
```

---

## UI Design (User Requirements)

### Layout: Sidebar + Main Area + Chat Panel
- **Sidebar** (left, collapsible): Dashboard, Tasks, Projects
- **Main content** (center): View-specific, reflows dynamically
- **Chat side panel** (right, resizable): Persistent on all views, drag left edge to resize (300px–60% viewport), state persists across navigation and sessions
- **Command palette** (Ctrl+K): Global fuzzy search

### Dashboard: 3-Column + Calendar + PIP Module

**Column 1: New Items**
- Emails, Teams messages, meeting notes since last session
- Each item interactive: mark done, dismiss, start chat, create task, assign priority/due/project/notes
- Triaged into 3 tiers: Action Required, Awareness, Low Priority
- Jeremy + client agency auto-elevated to Tier 1

**Column 2: Jeremy Priorities**
- Auto-detected: meeting notes (temporal signals), emails/Teams from Jeremy (urgency keywords)
- Manually tagged: right-click → "Mark as Jeremy Priority" or Shift+J
- Badges: "Auto" (blue) vs "Manual" (orange) with tooltip showing detection reason
- Detection keywords configurable in `app.config.ts` → `jeremy_triggers` array

**Column 3: All Tasks**
- Full TaskNote table sortable/filterable by ALL frontmatter properties:
  priority, status, due, waitingOn, scheduled, source, client, project_code
- Inline editing: click any property to change it (dropdown for enums, datepicker for dates)
- Same interactive actions as other columns

**Calendar Section** (below columns, collapsible)
- Today's meetings chronologically
- Per-meeting buttons: "Generate Agenda" | "Prep Meeting"
- Prep status indicator (prepared / needs prep / no materials)

**PIP Evidence Module** (collapsible, default open)
- **"Generate Weekly Report" button** → produces copy-pasteable markdown:
  1. Queries tasks where `status: done` and `completed` within last 7 days
  2. Groups by `client` or `project` (DRPA, VDOT, MDTA, DelDOT, Internal)
  3. Formats as "Weekly Status Report" with date range header
  4. Output template:
     ```
     ## Weekly Status Report: [Mon date] – [Fri date]
     ### DRPA
     - Completed task description (due: date)
     - ...
     ### VDOT
     - ...
     ### Summary
     X tasks completed | Y hours logged | Z projects active
     ```
  5. Copy-to-clipboard button for pasting into email
- **Period selector**: "Last 7 days" (default) | "Last 14 days" | "Custom range"
- **PIP check-in mode**: Button to generate full biweekly evidence package (all 6 PIP categories with accomplishments)
- Remembers collapsed/expanded state

### Chat Side Panel (NOT a separate page)
- **Always available** from any view via Ctrl+K or header button
- **Resizable**: drag left edge (react-resizable-panels)
- **Content reflows**: main area + panel both adapt dynamically
- **Item context**: selected dashboard items auto-populate as context chips
- **Smart suggestions**: action buttons based on item types (Draft reply, Create task, Generate agenda, etc.)
- **Streaming**: SSE real-time responses with markdown rendering (DOMPurify sanitized)

### Configuration (Static File — No Settings UI)
- All configuration lives in `src/config/app.config.ts` — edit code to change behavior
- **Jeremy detection**: `jeremy_triggers` keyword array
- **Vault scoping**: `hot_paths` directory whitelist + recency filters
- **Safe mode**: `safe_mode` boolean (default true = all writes require confirmation)
- **No Settings page, no settings API, no database for prefs** — saves 2 days of dev time

---

## Project Structure

```
command-center/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── components.json
├── .env.local                    # API keys (gitignored)
├── .env.local.example            # Template for setup
├── .gitignore
│
├── scripts/
│   ├── test-agent.ts             # Verify agent SDK connection
│   ├── test-mcp.ts               # Verify MCP server connections
│   └── health-check.ts           # System health check
│
├── src/
│   ├── config/
│   │   └── app.config.ts         # ALL settings — static, edit code to change
│   │
│   ├── app/
│   │   ├── layout.tsx            # Root: sidebar + chat panel (global)
│   │   ├── page.tsx              # Dashboard (3-column + calendar + PIP evidence)
│   │   ├── globals.css
│   │   ├── tasks/page.tsx        # Full task table
│   │   ├── projects/page.tsx     # Project views
│   │   └── api/
│   │       ├── agent/route.ts    # SSE streaming
│   │       ├── tasks/route.ts    # Task CRUD
│   │       └── health/route.ts   # System health + MCP status
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui base components
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      # Sidebar + main + chat panel layout
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx     # Resizable side panel (global)
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── ContextChips.tsx  # Selected items as context
│   │   │   ├── SmartSuggestions.tsx
│   │   │   └── SafeMarkdown.tsx  # XSS-safe markdown rendering
│   │   ├── dashboard/
│   │   │   ├── NewItemsColumn.tsx
│   │   │   ├── JeremyPrioritiesColumn.tsx
│   │   │   ├── AllTasksColumn.tsx
│   │   │   ├── CalendarSection.tsx
│   │   │   ├── PipEvidenceModule.tsx   # Weekly report generator
│   │   │   └── QuickActions.tsx
│   │   └── tasks/
│   │       ├── TaskTable.tsx     # Full filterable table
│   │       ├── InlineEditor.tsx  # Click-to-edit properties
│   │       └── TaskFilters.tsx
│   │
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── index.ts          # queryAgent() function
│   │   │   ├── config.ts         # MCP configs + env validation
│   │   │   ├── subagents.ts      # Agent definitions
│   │   │   ├── tools.ts          # Custom Obsidian MCP tools
│   │   │   └── hooks.ts          # Lifecycle hooks
│   │   ├── obsidian/
│   │   │   ├── vault.ts          # Safe read/write with retry + backup
│   │   │   ├── scanner.ts        # Hot-path vault scanner (scoped dirs + recency)
│   │   │   ├── tasks.ts          # TaskNote parsing and CRUD
│   │   │   ├── parser.ts         # Markdown + frontmatter
│   │   │   └── emails.ts         # Email note parsing
│   │   ├── pip/
│   │   │   └── evidence.ts       # Weekly report generation logic
│   │   ├── safety/
│   │   │   ├── safe-write.ts     # Atomic writes, backups, OneDrive retry
│   │   │   ├── mcp-health.ts     # MCP health checks, graceful degradation
│   │   │   ├── user-errors.ts    # Technical → friendly error mapping
│   │   │   └── env-validation.ts # Startup env checks
│   │   └── utils/
│   │       ├── paths.ts          # Windows path normalization
│   │       └── dates.ts          # Eastern Time formatting
│   │
│   ├── hooks/
│   │   ├── useAgent.ts           # SSE streaming
│   │   ├── useTasks.ts           # TanStack Query for tasks
│   │   ├── useSelectedItems.ts   # Zustand: selected items → chat context
│   │   └── useLayoutState.ts     # Panel sizes, collapsed state persistence
│   │
│   ├── stores/
│   │   ├── selectionStore.ts     # Selected items (Zustand)
│   │   └── layoutStore.ts        # Panel sizes, module states
│   │
│   └── types/
│       ├── task.ts               # Full TaskNote YAML properties
│       ├── project.ts
│       └── agent.ts
│
└── tests/
    ├── vault-operations.test.ts  # Atomic writes, backups, retries
    ├── vault-scanner.test.ts     # Hot-path scoping, recency filters
    ├── mcp-health.test.ts        # Graceful degradation
    ├── error-mapping.test.ts     # User-friendly errors
    ├── evidence-generator.test.ts # PIP report generation
    └── security.test.ts          # XSS, path traversal
```

---

## Environment Variables (`.env.local`)

```
ANTHROPIC_API_KEY=<your key>
OBSIDIAN_VAULT_PATH=C:/Users/bkolb/OneDrive - RK&K/Obsidian/Obsidian
SIMPLEMEM_PATH=C:/Users/bkolb/Tools/SimpleMem-MCP/dist/index.js
SIMPLEMEM_DB_PATH=C:/Users/bkolb/Tools/SimpleMem/data/lancedb_data
SIMPLEMEM_PYTHON=C:/Users/bkolb/Tools/SimpleMem/venv/Scripts/python.exe
OPENMEMORY_URL=http://localhost:8081
```

---

## Vault Hot-Path Strategy (`lib/obsidian/scanner.ts`)

**Problem**: 25,500+ files in vault. Full recursive scan = crash or multi-second latency.

**Solution**: Scoped directory whitelist + recency filter. Only scan ~400-600 files.

### Hot-Path Directories (always scanned)

| Directory | Files | Why |
|-----------|-------|-----|
| `TaskNotes/` | 89 | Primary task management — HIGHEST priority |
| `01-Projects/` | 278 | Active project docs (DRPA, VDOT, DelDOT, MDTA) |
| `02-Daily Notes/` | 463 total | Daily notes — **last 14 days only** (~14 files) |
| `Calendar/` | 5 | Meeting events — tiny, always scan |
| `99-System/` | ~10 key files | Claude-State.md, Active-Projects.md, Background-Tracking.md |

### Communication Directories (recency-filtered)

| Directory | Files | Strategy |
|-----------|-------|----------|
| `Emails/` | 3,084 | **Last 14 days only** by `mtime` (~50-100 files) |
| `TeamsChats/` | 383 | **Last 14 days only** by `mtime` (~30-50 files) |

### Excluded (never scanned by default)

`.obsidian/`, `.claude/`, `.trash/`, `.smart-env/`, `Excalidraw/`, `Ink/`,
`Clippings/`, `temp/`, `thumbnails/`, `voicenotes/`, `Attachments/` (binary),
`06-Career/` (1,273 archival files), `KeepSidian/`, `05-Knowledge/`, `03-Contacts/`

### Scanner Implementation

```typescript
// src/lib/obsidian/scanner.ts
interface ScanResult {
  files: VaultFile[];      // parsed file metadata
  scannedCount: number;    // how many files we actually read
  totalVaultFiles: number; // for health reporting
  scanDuration: number;    // ms
}

// Hot paths from app.config.ts — always scanned
// Communication dirs — filtered by mtime within recency window
// Result cached for 60 seconds to avoid repeated fs walks
```

### Static Config Definition (`src/config/app.config.ts`)

```typescript
import { z } from 'zod';

const AppConfigSchema = z.object({
  // Jeremy priority detection
  jeremy_triggers: z.array(z.string()).default([
    'Jeremy', 'Siviter', 'URGENT', 'ASAP', 'immediately',
    'end of day', 'EOD', 'critical', 'priority'
  ]),

  // Vault scanning scope
  hot_paths: z.object({
    always_scan: z.array(z.string()).default([
      'TaskNotes',
      '01-Projects',
      'Calendar',
    ]),
    recency_scan: z.array(z.object({
      path: z.string(),
      max_age_days: z.number(),
    })).default([
      { path: '02-Daily Notes', max_age_days: 14 },
      { path: 'Emails', max_age_days: 14 },
      { path: 'TeamsChats', max_age_days: 14 },
    ]),
    system_files: z.array(z.string()).default([
      '99-System/Claude-State.md',
      '99-System/Active-Projects.md',
      '99-System/Background-Tracking.md',
    ]),
  }),

  // Safety
  safe_mode: z.boolean().default(true), // true = all writes require confirmation

  // Client detection (for triage)
  client_keywords: z.record(z.array(z.string())).default({
    'DRPA': ['DRPA', 'Delaware River', 'Port Authority'],
    'VDOT': ['VDOT', 'Virginia DOT', 'NIOP'],
    'MDTA': ['MDTA', 'Maryland'],
    'DelDOT': ['DelDOT', 'Delaware DOT'],
  }),

  // PIP evidence generation
  pip: z.object({
    start_date: z.string().default('2026-01-27'),
    end_date: z.string().default('2026-04-27'),
    checkin_interval_days: z.number().default(14),
    categories: z.array(z.string()).default([
      'Productivity & Time Management',
      'Communication',
      'Technical Skills',
      'Knowledge Retention',
      'Self-Reliance',
      'Documentation',
    ]),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export const config = AppConfigSchema.parse({});
```

---

## Safety & Robustness (QA Review Requirements)

### 1. Vault Write Safety (`lib/safety/safe-write.ts`)
- **Atomic writes**: Write to `.tmp` file, then rename (prevents corruption on crash)
- **Backup before overwrite**: Keep last 5 backups per file
- **OneDrive retry**: Exponential backoff (200ms, 400ms, 800ms) on EACCES/EBUSY
- **Rollback on failure**: Restore from backup if write fails
- **Path traversal prevention**: Validate all paths stay within vault root

### 2. MCP Health Checks (`lib/safety/mcp-health.ts`)
- Poll every 30 seconds, cache results
- **Graceful degradation**: If MCP servers down, chat still works (just no memory)
- Health status shown on dashboard and in /api/health
- User-friendly message: "Memory service unavailable — chat will work but won't remember context"

### 3. User-Friendly Errors (`lib/safety/user-errors.ts`)
- Map every technical error to plain English + recovery action
- Examples: EACCES → "Vault locked by OneDrive, wait 30 seconds"
- No technical jargon in UI error messages
- Errors logged to structured log file for debugging

### 4. Session Management
- In-memory sessions with 1-hour TTL
- Cleanup timer every 10 minutes removes expired sessions
- Max 50 sessions (single user, but prevents leak)

### 5. XSS Protection (`components/chat/SafeMarkdown.tsx`)
- DOMPurify sanitizes all markdown before rendering
- Block javascript:, data: URLs in links
- Block script tags and event handlers
- Only allow http/https for images and links

### 6. Environment Validation (`lib/safety/env-validation.ts`)
- Startup checks: API key present and valid format
- Vault path exists and is accessible
- MCP server paths exist
- Clear error messages if anything missing

---

## Subagents

### Phase 1 (Must-Have)
1. **`task-agent`**: Create, query, update tasks. Knows TaskNote YAML, client names, direct vs managed dependencies.
2. **`search-agent`**: Find info across vault using hot-path scanner (~600 active files). Falls back to full vault only on explicit request.
3. **`triage-agent`**: Classify new emails/Teams. 3-tier priority. Auto-elevate Jeremy + client agency.

### Phase 2 (By Week 5)
4. **`meeting-prep-agent`**: Briefing packages with attendees, context, action items, talking points.
5. **`project-agent`**: Project status, milestones, risks. Per-client dashboards (DRPA, VDOT, MDTA, DelDOT).

### Phase 3 (By Week 9)
6. **`comms-agent`**: Draft professional communications with audience-appropriate tone.
7. **`doc-review-agent`**: Review contractor submittals against contract requirements.
8. **`status-agent`**: Generate weekly/monthly status reports.

---

## Implementation Steps (PIP-Aligned)

### Step 1: Project Init + Safety Foundation + Static Config (Day 1)
**Files created:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- `.env.local`, `.env.local.example`, `.gitignore`
- `src/config/app.config.ts` — ALL settings (jeremy triggers, hot paths, safe mode, PIP dates)
- `src/lib/safety/safe-write.ts` — atomic writes, backups, OneDrive retry
- `src/lib/safety/mcp-health.ts` — health checks, graceful degradation
- `src/lib/safety/user-errors.ts` — error mapping
- `src/lib/safety/env-validation.ts` — startup validation
- Install shadcn/ui components

**Verify:** `npx tsc --noEmit` passes. Environment validates on `npm run dev`. Config exports correctly.

### Step 2: Agent Core (Days 2-3)
**Files created:**
- `src/lib/agent/config.ts` — MCP server configs
- `src/lib/agent/tools.ts` — Custom Obsidian MCP tools via `createSdkMcpServer()`
- `src/lib/agent/subagents.ts` — task-agent, search-agent, triage-agent
- `src/lib/agent/index.ts` — `queryAgent()` with error handling
- `src/lib/agent/hooks.ts` — PostToolUse logging, memory auto-store
- `scripts/test-agent.ts` — CLI verification

**Verify:** `npx tsx scripts/test-agent.ts "What are my overdue tasks?"` returns real task data.

### Step 3: Obsidian Integration + Vault Scanner (Days 3-4)
**Files created:**
- `src/lib/obsidian/vault.ts` — Safe read/write via safe-write layer
- `src/lib/obsidian/scanner.ts` — Hot-path vault scanner (reads config, scoped dirs, recency filter, 60s cache)
- `src/lib/obsidian/tasks.ts` — TaskNote YAML parsing, full property CRUD
- `src/lib/obsidian/parser.ts` — Markdown + gray-matter
- `src/lib/obsidian/emails.ts` — Email note parsing with tag extraction

**Verify:** Scanner returns ~400-600 files (not 25,500). Can read TaskNotes, parse frontmatter, list tasks by client/status. Scanner completes in <500ms.

### Step 4: API Routes (Day 4)
**Files created:**
- `src/app/api/agent/route.ts` — SSE streaming with timeout + error handling
- `src/app/api/tasks/route.ts` — GET (list/filter), POST (create), PATCH (update)
- `src/app/api/health/route.ts` — System health + MCP status + scanner stats

**Verify:** `curl` to `/api/agent` returns SSE stream. `/api/tasks` returns real tasks. `/api/health` shows green + scanner file count.

### Step 5: App Shell + Chat Panel (Days 5-6)
**Files created:**
- `src/app/layout.tsx` — Root layout with AppShell
- `src/components/layout/AppShell.tsx` — Sidebar + main + resizable chat panel
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- `src/components/chat/ChatPanel.tsx` — Resizable, persistent, SSE streaming
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/MessageInput.tsx`
- `src/components/chat/SafeMarkdown.tsx` — DOMPurify
- `src/components/chat/ContextChips.tsx`
- `src/components/chat/SmartSuggestions.tsx`
- `src/hooks/useAgent.ts` — SSE hook
- `src/hooks/useSelectedItems.ts`
- `src/stores/selectionStore.ts`
- `src/stores/layoutStore.ts`

**Verify:** Chat panel opens from any view, resizes, persists size. Streaming responses render. Selected items appear as context chips.

### Step 6: Dashboard — 3 Columns + Calendar + PIP Evidence (Days 7-9)
**Files created:**
- `src/app/page.tsx` — Dashboard layout
- `src/components/dashboard/NewItemsColumn.tsx`
- `src/components/dashboard/JeremyPrioritiesColumn.tsx`
- `src/components/dashboard/AllTasksColumn.tsx`
- `src/components/dashboard/CalendarSection.tsx`
- `src/components/dashboard/PipEvidenceModule.tsx` — Weekly report generator UI
- `src/lib/pip/evidence.ts` — Report generation logic (query done tasks, group by client, format markdown)
- `src/components/dashboard/QuickActions.tsx`

**Verify:** 3 columns show real data. Tasks filterable/sortable. Calendar shows meetings. "Generate Weekly Report" button produces copy-pasteable markdown grouped by client. Items interactive (mark done, start chat, create task).

### Step 7: Task View + Inline Editing (Days 9-10)
**Files created:**
- `src/app/tasks/page.tsx`
- `src/components/tasks/TaskTable.tsx`
- `src/components/tasks/InlineEditor.tsx`
- `src/components/tasks/TaskFilters.tsx`
- `src/hooks/useTasks.ts`

**Verify:** Full TaskNote table with all properties. Click any property to edit inline. Filter by client, status, priority. Changes save to vault.

### Step 8: Tests + Error Handling (Day 10)
**Files created:**
- `tests/vault-operations.test.ts`
- `tests/vault-scanner.test.ts` — hot-path scoping, recency filters, cache behavior
- `tests/mcp-health.test.ts`
- `tests/error-mapping.test.ts`
- `tests/evidence-generator.test.ts` — PIP report formatting, date ranges, client grouping
- `tests/security.test.ts`

**Verify:** All tests pass. `npx tsc --noEmit` clean. Error scenarios handled gracefully. Scanner tests confirm <600 files scanned.

### Step 9: Integration + Polish (Days 11-12)
- Connect all dashboard components to real vault data
- Test full user journeys end-to-end
- Layout state persistence (panel sizes, collapsed states)
- Performance tuning for vault operations
- Git init + first commit

**Verify:** Full MVP verification (see Verification Plan below).

---

## Key Design Decisions

1. **Chat is a side panel from Day 1** (not a separate page) — per user requirement
2. **Task management in Phase 1** — required for PIP evidence and dashboard
3. **Static config file, no Settings UI** — edit `app.config.ts` to change behavior, saves 2 days of dev time
4. **Hot-path vault scanning** — only ~600 active files scanned, not 25,500 (prevents crash/latency)
5. **Atomic vault writes with backup** — prevents data corruption from OneDrive conflicts
6. **Graceful MCP degradation** — system works even if memory servers are down
7. **All errors mapped to plain English** — user can self-recover
8. **react-resizable-panels** for chat resize — proven library, CSS grid compatible
9. **Zustand for selected items** — global state connecting dashboard selections to chat context
10. **DOMPurify for markdown** — prevents XSS in agent responses
11. **PIP Evidence module** — generates tangible weekly status reports, not abstract metrics

---

## API Cost Management

- **Budget**: Set monthly cap (discuss with management)
- **Model tiering**: Sonnet for complex tasks, Haiku for simple routing
- **Prompt caching**: Cache system prompts (90% cost reduction on repeated context)
- **maxBudgetUsd**: SDK option to set per-query cost limits
- **Monitor**: Track daily spend in health dashboard

---

## Verification Plan

### After Step 2 (Agent Core):
```bash
npx tsx scripts/test-agent.ts "What are my overdue tasks?"
```
Expected: Agent responds with real task data from vault.

### After Step 4 (API Routes):
```bash
npm run dev
# In another terminal:
curl -N -X POST http://localhost:3000/api/agent -H "Content-Type: application/json" -d "{\"prompt\": \"What are my tasks?\"}"
curl http://localhost:3000/api/health
```
Expected: SSE stream of agent messages. Health check shows green.

### After Step 5 (Chat Panel):
1. Open `http://localhost:3000`
2. Click chat button or Ctrl+K — panel opens on right
3. Drag left edge to resize — main content reflows
4. Navigate to /tasks — panel stays open at same width
5. Close and reopen — remembers width

### After Step 8 (Tests):
```bash
npx tsc --noEmit        # Zero type errors
npm test                 # All tests pass
```

### After Step 9 (Full MVP):
1. Open dashboard — 3 columns with real data, calendar shows meetings, PIP Evidence module visible
2. Select 2 items in New Items column → open chat → see context chips + smart suggestions
3. Click "Create task from this" → task appears in All Tasks column with pre-filled properties
4. Click task priority → inline dropdown → change to High → saves to vault
5. Right-click item → "Mark as Jeremy Priority" → appears in Jeremy column with Manual badge
6. Navigate to /tasks → full filterable table → filter by DRPA → see only DRPA tasks
7. Click "Generate Weekly Report" in PIP Evidence module → copy-pasteable markdown appears:
   - Grouped by client (DRPA, VDOT, etc.)
   - Lists completed tasks from last 7 days
   - Summary line with counts
   - Copy-to-clipboard button works
8. `/api/health` shows scanner stats: ~400-600 files scanned, <500ms scan time

---

## Companion Documents

**Detailed workflow requirements** (950 lines, from tolling PM agent):
`C:\Users\bkolb\.claude\plans\vectorized-sauteeing-snowglobe-agent-a1240a1.md`

Contains: 9 agent definitions with behavioral rules, 15 quick actions, project-specific metrics (DRPA, VDOT, MDTA, DelDOT), integration architecture, stakeholder reference table, existing command mapping.

---

## Fallback Strategy (If Full Build Delayed)

If the web app isn't ready by Feb 10:
1. **CLI agent** works from Day 2 (`scripts/test-agent.ts`)
2. Brian logs tasks manually in Obsidian (task log template provided)
3. Memory systems (SimpleMem + OpenMemory) are already operational
4. At check-in: "I've built a systematic AI workflow. Here's 14 days of logged usage."
5. Web UI becomes the enhancement, not the prerequisite

**PIP success doesn't require a perfect app — it requires consistent, demonstrable improvement.**
