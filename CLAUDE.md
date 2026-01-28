# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Context

**Command Center** — Next.js 15 (App Router) personal operations dashboard integrating with an Obsidian vault. React 19, Tailwind CSS 4, Zustand 5, TanStack React Query 5, TypeScript 5.8.

### Build & Test

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm test             # Vitest — 63 tests, 8 suites
npm run typecheck    # tsc --noEmit
```

### Key Architecture

- **Dual AI backend**: Claude Code subprocess (default, Max subscription) or Anthropic API (`ANTHROPIC_API_KEY` env var). Selection logic in `src/lib/agent/config.ts`.
- **Agent tools**: Defined in `src/lib/agent/tools.ts`. Tool definitions are Anthropic SDK `Tool[]` format. Executor is a `switch` statement routing tool names to vault operations.
- **Streaming**: Agent responses stream via SSE (`src/app/api/agent/route.ts` → `src/hooks/useAgent.ts`). The hook uses a chunked buffer to handle split TCP frames.
- **Vault integration**: `src/lib/obsidian/` — scanner caches files from hot paths, tasks parsed from YAML frontmatter in TaskNote markdown files.
- **State**: Zustand for UI layout (`src/stores/layoutStore.ts`), React Query for server data (`src/hooks/useTasks.ts`).
- **Config**: Zod-validated in `src/config/app.config.ts`. Defines client keywords, vault hot paths, session TTL, scanner cache TTL.

### Shared Utilities

These utilities exist to prevent duplication. Use them instead of inline implementations:

- **`src/lib/utils/cn.ts`** — `cn()` for className merging (clsx + tailwind-merge).
- **`src/lib/utils/tasks.ts`** — `isTaskOverdue(task)` checks due date, status, returns boolean.
- **`src/lib/obsidian/task-filters.ts`** — `parseTaskFilters()`, `parseTaskFiltersFromParams()`, `buildCreateTaskPayload()` for consistent task filter parsing and creation payloads.
- **`src/lib/obsidian/scanner.ts`** — `VAULT_CATEGORIES` constant with category matcher functions (`emails`, `teams`, `meetings`, `tasks`).
- **`src/lib/obsidian/vault.ts`** — `getVaultRoot()` (throws if not set), `getVaultRootOrNull()` (returns null if not set).
- **`src/lib/safety/safe-write.ts`** — `withRetry<T>(fn)` for OneDrive lock retry logic.
- **`src/components/ui/ErrorBanner.tsx`** — `<ErrorBanner message={...} />` for consistent error display.

### Conventions

- CSS utility function: `cn()` from `src/lib/utils/cn.ts`. Do not create local copies.
- Accessibility: All interactive elements use `focus-visible:ring-2 focus-visible:ring-blue-500` pattern.
- Loading states: Use `<Skeleton>` from `src/components/ui/Skeleton.tsx` and `<Card loading>` from `src/components/ui/Card.tsx`.
- Error states: Use `<ErrorBanner>` from `src/components/ui/ErrorBanner.tsx`.
- Icons: Lucide React (`lucide-react`), not emoji strings.
- Dashboard components: Wrap in `<Card>` for consistent styling.
- Client lists: Derive from `Object.keys(config.client_keywords)`, not hardcoded arrays.

### Feature Flags

- `NEXT_PUBLIC_ENABLE_PIP=true` (in `.env.local`) enables PIP evidence dashboard panel and `generate_pip_report` agent tool. PIP source files (`src/lib/pip/`, `src/app/api/pip/`, `src/components/dashboard/PIPEvidence.tsx`) are gitignored — they exist locally but not in the repository. The pip config schema in `app.config.ts` is retained so local PIP files compile.

### Files Excluded from Repository

The following exist locally but are gitignored (see `.gitignore`):

- `src/components/dashboard/PIPEvidence.tsx`
- `src/app/api/pip/`
- `src/lib/pip/`
- `tests/evidence-generator.test.ts`
- `docs/IMPLEMENTATION-PLAN.md`

The `tsconfig.json` `exclude` array also lists these paths to avoid CI type errors when the files are absent.
