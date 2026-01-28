# Design Review: Command Center UI

**Review ID:** command-center-ui_20260127_210000
**Reviewed:** 2026-01-27 21:00 ET
**Target:** Full UI — 15 components, 3 pages, 2 hooks, 2 stores, 1 CSS file
**Focus:** Comprehensive (Visual, Usability, Code Quality, Performance)

## Summary

The Command Center UI is a well-structured, functional MVP with clean component boundaries and solid state management. The main issues are: (1) a duplicate `cn()` utility in Header.tsx that diverges from the shared one, (2) missing dark mode / color scheme support in a single-line globals.css, (3) several accessibility gaps (missing focus states, keyboard navigation, ARIA roles), and (4) the StatusCards component fires 4 parallel API requests on mount that could be consolidated. The code is generally clean, uses good patterns (Zustand + React Query), and has consistent Tailwind styling.

**Issues Found:** 18

- Critical: 1
- Major: 5
- Minor: 7
- Suggestions: 5

---

## Critical Issues

### Issue 1: Header.tsx defines its own `cn()` function, shadowing the shared utility

**Severity:** Critical
**Location:** `src/components/layout/Header.tsx:38-40`
**Category:** Code Quality

**Problem:**
Header.tsx defines a local `cn()` function that's a simple `filter(Boolean).join(" ")` implementation. The project already has a proper `cn()` at `src/lib/utils/cn.ts` that uses `clsx` + `tailwind-merge` — which correctly handles Tailwind class conflicts (e.g., `bg-red-500 bg-blue-500` deduplication). The Header component imports nothing for `cn()` but uses it on line 23.

**Impact:**
The local `cn()` won't merge conflicting Tailwind classes correctly. If someone adds conditional classes that overlap (e.g., dynamic backgrounds), they'll silently produce incorrect styles. This is also a maintenance trap — developers will see `cn()` used in Header and assume it's the shared utility.

**Recommendation:**
Delete the local function. Import from `@/lib/utils/cn`.

**Code Example:**
```tsx
// Before (Header.tsx)
import { useLayoutStore } from "@/stores/layoutStore";
// ... uses cn() on line 23
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// After
import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils/cn";
// delete lines 38-40
```

---

## Major Issues

### Issue 2: globals.css is a single line — no design tokens, resets, or base styles

**Severity:** Major
**Location:** `src/app/globals.css:1`
**Category:** Visual Design

**Problem:**
The entire CSS file is `@import "tailwindcss";`. There's no color scheme definition, no CSS custom properties for design tokens, no base body styles, no scrollbar styling, and no dark mode `prefers-color-scheme` support. The app renders with raw browser defaults for everything Tailwind doesn't cover.

**Impact:**
- No consistent scrollbar appearance across components (especially the chat panel and task table)
- No dark mode support — all hardcoded `text-gray-900`, `bg-white` classes
- No design tokens means color changes require finding/replacing across all 15 component files
- Selection highlight colors default to browser blue, which may clash

**Recommendation:**
Add a minimal base layer with CSS custom properties for your primary colors and common surface/text colors. Even without full dark mode, establishing tokens now prevents a painful refactor later.

### Issue 3: No focus-visible styles on interactive elements

**Severity:** Major
**Location:** Multiple components
**Category:** Usability / Accessibility

**Problem:**
Most buttons and links lack `focus-visible:` ring styles. Tailwind's default focus ring was removed in v4 (requires explicit `focus-visible:ring-*` classes). Affected components:
- Sidebar.tsx: toggle button (line 34), nav links (line 47)
- Header.tsx: chat toggle button (line 22)
- ChatPanel.tsx: Clear and Close buttons (lines 45-57)
- TaskTable.tsx: filter buttons (line 111), sort headers (lines 150-165)
- SmartSuggestions.tsx: suggestion buttons (line 57)
- ContextChips.tsx: remove buttons (line 51)

**Impact:**
Keyboard users cannot see which element is focused. This is a WCAG 2.1 AA failure (2.4.7 Focus Visible). Even for a single-user app, keyboard navigation is useful for power users (which you are).

**Recommendation:**
Add `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1` to all interactive elements. Consider adding a shared button component to standardize this.

### Issue 4: SSE parsing in useAgent doesn't handle split chunks

**Severity:** Major
**Location:** `src/hooks/useAgent.ts:77-78`
**Category:** Code Quality / Reliability

**Problem:**
The SSE parser splits on `\n` and processes each line independently. But SSE events can be split across ReadableStream chunks — a `data: {"type":"text"...` JSON payload could be split mid-JSON across two `reader.read()` calls. The current code would try to `JSON.parse` an incomplete string and silently swallow the error in the catch block (line 109).

**Impact:**
On slow connections or large responses, you'll see missing chunks in the streamed response. The text will appear to "skip" portions. This is intermittent and hard to debug.

**Recommendation:**
Buffer incomplete lines between read cycles. Track whether the last chunk ended with a newline.

**Code Example:**
```tsx
// Before
const chunk = decoder.decode(value, { stream: true });
const lines = chunk.split("\n");

// After
let buffer = "";
// ... in the read loop:
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split("\n");
buffer = lines.pop() ?? ""; // Keep incomplete last line in buffer
```

### Issue 5: StatusCards fires 4 separate API requests on mount

**Severity:** Major
**Location:** `src/components/dashboard/StatusCards.tsx:12-15`
**Category:** Performance

**Problem:**
Each card triggers its own `useTasks()` call with different filters. On mount, this fires 4 concurrent GET requests to `/api/tasks`. Each request triggers a full vault scan (unless cached). With React Query's staleTime of 30s, these requests will re-fire every 60s (the refetch interval).

**Impact:**
4x the API calls needed. On the vault scanner side, the 60s cache means the first request scans, and the other 3 hit cache — but the serialized query keys differ, so React Query treats them as 4 separate cache entries. Every refresh cycles through all 4.

**Recommendation:**
Create a single `/api/tasks/summary` endpoint (or add a `?summary=true` query param) that returns all counts in one response. Or use a single `useTasks()` call at the Dashboard level and pass counts down as props.

### Issue 6: No loading/skeleton states for dashboard on initial load

**Severity:** Major
**Location:** `src/app/page.tsx`, multiple dashboard components
**Category:** Usability

**Problem:**
On initial page load, all dashboard components show nothing until their data loads. StatusCards shows "—" values, NewItemsFeed shows a small "Scanning..." text, JeremyPriorities shows nothing, and PIPEvidence shows "Generating report...". There's no skeleton/shimmer animation or consistent loading pattern.

**Impact:**
Users see a flash of empty content, then content pops in. This feels broken/slow, especially with 4+ concurrent API calls. The layout shifts as content appears.

**Recommendation:**
Add skeleton placeholders that match the final layout shape. Even simple gray `animate-pulse` blocks prevent layout shift and feel more responsive.

---

## Minor Issues

### Issue 7: Message list uses array index as key

**Severity:** Minor
**Location:** `src/components/chat/ChatPanel.tsx:76`
**Category:** Code Quality

**Problem:**
`messages.map((msg, i) => <MessageBubble key={i} ... />)` — index keys cause incorrect reconciliation when messages are removed (e.g., `clearMessages`).

**Impact:**
When clearing messages and starting a new conversation, React may reuse DOM nodes from the previous conversation, causing brief visual artifacts. In practice, since `clearMessages` replaces the entire array, this is low-impact.

**Recommendation:**
Add a `timestamp` + index composite key, or generate an ID when creating each message:
```tsx
key={`${msg.timestamp}-${i}`}
```

### Issue 8: Sidebar uses emoji characters for icons

**Severity:** Minor
**Location:** `src/components/layout/Sidebar.tsx:9-11`
**Category:** Visual Design

**Problem:**
Navigation icons are emoji strings (`📊`, `✅`, `📁`). Emojis render differently across OS/browser combinations and have unpredictable widths. They also can't be styled (no color/size control independent of font-size).

**Impact:**
Icons may appear misaligned or visually inconsistent. On some Windows builds, emoji rendering is notably less crisp than SVG icons. The sidebar collapse animation can look janky with emoji widths.

**Recommendation:**
The project already has `lucide-react` installed. Switch to Lucide icons:
```tsx
import { LayoutDashboard, CheckSquare, FolderOpen } from "lucide-react";
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  // ...
];
```

### Issue 9: `SafeMarkdown` double-sanitizes content

**Severity:** Minor
**Location:** `src/components/chat/SafeMarkdown.tsx:19-31`
**Category:** Code Quality

**Problem:**
Content goes through DOMPurify sanitization *before* being passed to ReactMarkdown. But DOMPurify operates on HTML, and the input is markdown. This means markdown syntax like `**bold**` passes through DOMPurify unchanged (it's not HTML), and then ReactMarkdown converts it to `<strong>bold</strong>`. The DOMPurify pass is mostly a no-op on valid markdown.

The real XSS protection comes from ReactMarkdown itself (which doesn't render raw HTML by default unless you enable `rehypeRaw`) and the link component override (lines 37-55).

**Impact:**
Minor performance cost of running DOMPurify on every render (mitigated by `useMemo`). No security gap — the protection is redundant, not absent. However, DOMPurify could strip valid markdown that looks like HTML (e.g., markdown containing `<details>` tags).

**Recommendation:**
Either (a) remove the DOMPurify pre-processing since ReactMarkdown already prevents XSS, or (b) add `rehypeRaw` to ReactMarkdown and rely on DOMPurify for raw HTML sanitization. Currently the two systems are working at cross purposes.

### Issue 10: PIPEvidence copy fallback uses deprecated `document.execCommand`

**Severity:** Minor
**Location:** `src/components/dashboard/PIPEvidence.tsx:35-41`
**Category:** Code Quality

**Problem:**
The clipboard fallback creates a textarea, appends to DOM, selects, and calls `document.execCommand("copy")`. This API is deprecated and may be removed from browsers.

**Impact:**
Low — the primary `navigator.clipboard.writeText` works on localhost (same-origin). The fallback is only needed for non-secure contexts (HTTP without localhost), which shouldn't apply here.

**Recommendation:**
Keep the fallback but add a comment noting it's for edge cases. Or simplify to just the modern API with a user-visible error message if it fails.

### Issue 11: `getLastSessionTime()` in NewItemsFeed recalculates on every render

**Severity:** Minor
**Location:** `src/components/dashboard/NewItemsFeed.tsx:22-27`
**Category:** Performance

**Problem:**
`getLastSessionTime()` is called at the component function body level (line 30), creating a new Date object and ISO string on every render. This means the React Query key changes slightly on each re-render (millisecond differences), potentially causing cache misses.

**Impact:**
Likely negligible since React Query compares the key deeply and the string will stabilize between re-renders. But it's conceptually wrong — "since" should be a stable reference.

**Recommendation:**
Wrap in `useMemo` or `useRef` to compute once per mount:
```tsx
const since = useMemo(() => getLastSessionTime(), []);
```

### Issue 12: TaskTable sort headers lack `scope="col"` and `role` attributes

**Severity:** Minor
**Location:** `src/components/dashboard/TaskTable.tsx:148-166`
**Category:** Accessibility

**Problem:**
Table headers are `<th>` elements acting as both column labels AND sort buttons (via onClick). They lack `scope="col"` for accessibility, and there's no ARIA indication of sort state (`aria-sort`).

**Impact:**
Screen readers won't announce the sort state or direction to users.

**Recommendation:**
Add `scope="col"` and `aria-sort`:
```tsx
<th
  scope="col"
  aria-sort={sortField === "title" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
  role="columnheader"
  // ...
>
```

### Issue 13: Chat panel doesn't handle multi-line SSE data fields

**Severity:** Minor
**Location:** `src/hooks/useAgent.ts:80`
**Category:** Code Quality

**Problem:**
SSE spec allows multi-line data by using multiple `data:` lines. The parser only captures single `data:` lines. If the server ever sends multi-line SSE events, they'll be parsed as separate events.

**Impact:**
Low — the current server implementation (`/api/agent/route.ts`) doesn't send multi-line data fields. But it's a spec compliance gap that could cause bugs if the server implementation changes.

---

## Suggestions

### Suggestion 1: Extract a shared `Card` component

**Category:** Code Quality

Several dashboard components use the same card pattern:
```tsx
<div className="rounded-lg border border-gray-200 bg-white p-4">
  <div className="mb-3 flex items-center justify-between">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    <span className="text-xs text-gray-400">{meta}</span>
  </div>
  {children}
</div>
```

This pattern appears in: NewItemsFeed, JeremyPriorities, PIPEvidence, TaskTable. Extracting a `<Card title="..." meta="...">` component would reduce duplication and ensure consistent styling.

### Suggestion 2: Add `Escape` key to close chat panel

**Category:** Usability

The chat panel opens with Ctrl+K but can only be closed by clicking the X button or pressing Ctrl+K again. Adding Escape key support would match standard panel/modal behavior.

### Suggestion 3: Make the task table scrollable with sticky headers

**Category:** Usability

With many tasks, the table scrolls within the main content area, and the column headers scroll out of view. Adding `sticky top-0` to the `<thead>` row with a background color would keep headers visible.

### Suggestion 4: Add error boundary wrapper

**Category:** Code Quality

No component has an error boundary. If any component throws during render (e.g., unexpected API response shape), the entire page crashes. A React error boundary at the `<AppShell>` or `<Providers>` level would contain failures to individual panels.

### Suggestion 5: Consider `layout.tsx` font loading

**Category:** Visual Design / Performance

The root layout doesn't specify any web font. The app inherits system fonts from Tailwind's default `font-sans` stack, which is fine — but there's no `next/font` optimization. If you add a custom font later, pre-configuring `next/font/google` or `next/font/local` in layout.tsx would prevent layout shift.

---

## Positive Observations

- **Clean component boundaries**: Each component has a single responsibility with clear prop interfaces. No prop drilling beyond 1 level.
- **Good state management split**: Zustand for UI state (layout, selection), React Query for server state (tasks, scan, PIP). This is the correct pattern.
- **Smart suggestions are context-aware**: The `SmartSuggestions` component adapts based on selected items — this is a genuinely useful feature.
- **Selection store for chat context**: The `ContextChips` → `selectionStore` → `ChatPanel` flow is well-designed for connecting dashboard actions to chat queries.
- **XSS protection**: Both DOMPurify and ReactMarkdown component overrides provide defense in depth against XSS in chat responses.
- **Resizable panels**: Using `react-resizable-panels` for the chat panel is the right call — it gives users control over their workspace.
- **Keyboard shortcut (Ctrl+K)**: The global keyboard handler for toggling chat is a nice power-user feature.
- **Proper QueryClient initialization**: `useState(() => new QueryClient(...))` prevents re-creating the client on re-renders — a common mistake avoided.
- **Auto-refresh on task data**: The 60s refetch interval on tasks keeps the dashboard current without manual refresh.
- **TypeScript throughout**: Full type safety with well-defined interfaces for all data shapes.

---

## Next Steps

1. **Fix Header.tsx `cn()` duplication** — Critical, 2-minute fix
2. **Add focus-visible styles** — Major accessibility win, systematic pass across all components
3. **Fix SSE chunk buffering in useAgent** — Prevents streaming data loss
4. **Consolidate StatusCards API calls** — Either a summary endpoint or parent-level data fetch
5. **Add skeleton loading states** — Prevents layout shift on initial load
6. **Switch emojis to Lucide icons** — Visual polish, lucide-react already installed
7. **Add error boundary** — Prevents full-page crashes from individual component errors
8. **Establish CSS tokens in globals.css** — Foundation for consistent styling and future dark mode

---

_Generated by UI Design Review. Run `/ui-design:design-review` again after fixes._
