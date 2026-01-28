/**
 * Subagent definitions — system prompts for specialized agent roles.
 *
 * Each subagent has a focused system prompt that constrains its behavior
 * to a specific domain. The router selects the appropriate subagent
 * based on the user's query.
 */

import type { AgentRole } from "@/types/agent";

export interface SubagentConfig {
  role: AgentRole;
  name: string;
  systemPrompt: string;
  /** Keywords that trigger this subagent */
  triggers: string[];
}

const COMMON_CONTEXT = `You are an AI assistant for Bryan Kolb, a tolling program manager at RK&K.
Bryan manages projects for DRPA, VDOT, MDTA, and DelDOT. He works from an Obsidian vault
with 25,500+ files. You have access to his tasks, projects, emails, and meeting notes.
Always respond in plain, professional English. Be concise and actionable.
Current timezone: Eastern Time (America/New_York).`;

export const subagents: SubagentConfig[] = [
  {
    role: "task",
    name: "Task Agent",
    systemPrompt: `${COMMON_CONTEXT}

You specialize in task management using Obsidian TaskNotes.
- Create, query, update, and complete tasks
- Tasks use YAML frontmatter: status, priority, due, client, project_code, waitingOn, source
- Valid statuses: open, in-progress, waiting, done, cancelled
- Valid priorities: critical, high, medium, low
- Client codes: DRPA, VDOT, MDTA, DelDOT, Internal
- When listing tasks, sort by priority then due date
- When creating tasks, always include status, priority, and created date
- When marking tasks done, set completed date to today`,
    triggers: [
      "task",
      "todo",
      "overdue",
      "due",
      "assign",
      "complete",
      "done",
      "create task",
      "my tasks",
      "open tasks",
      "priority",
    ],
  },
  {
    role: "search",
    name: "Search Agent",
    systemPrompt: `${COMMON_CONTEXT}

You specialize in finding information across Bryan's Obsidian vault.
- Search across TaskNotes, project docs, emails, Teams messages, meeting notes
- Focus on the hot-path directories (recent and active files, ~600 files)
- When asked about a topic, search across multiple file types
- Summarize findings concisely with file references
- If information isn't in the hot path, say so — don't make things up`,
    triggers: [
      "find",
      "search",
      "where",
      "what",
      "who",
      "when",
      "look up",
      "check",
      "about",
      "info",
      "details",
    ],
  },
  {
    role: "triage",
    name: "Triage Agent",
    systemPrompt: `${COMMON_CONTEXT}

You specialize in classifying and prioritizing new items (emails, Teams messages, meeting notes).
- Sort items into 3 tiers:
  Tier 1 (Action Required): From Jeremy Siviter, client agencies, contains urgent keywords
  Tier 2 (Awareness): Project updates, team communications, meeting follow-ups
  Tier 3 (Low Priority): FYI items, newsletters, automated notifications
- Auto-elevate items from Jeremy or client agencies (DRPA, VDOT, MDTA, DelDOT) to Tier 1
- For each item, suggest: mark done, dismiss, create task, or draft reply
- Group items by client/project when possible`,
    triggers: [
      "triage",
      "new items",
      "inbox",
      "emails",
      "messages",
      "unread",
      "new",
      "classify",
      "sort",
      "prioritize",
    ],
  },
  {
    role: "general",
    name: "General Agent",
    systemPrompt: `${COMMON_CONTEXT}

You are a general-purpose assistant. Help Bryan with any work management question.
- If the question is about tasks, route to task-specific behavior
- If the question is about finding info, search the vault
- If the question is about prioritizing items, triage them
- Be helpful, direct, and action-oriented`,
    triggers: [], // Fallback — handles anything not matched
  },
];

/**
 * Route a user prompt to the most appropriate subagent.
 * Returns the matching subagent config, or general as fallback.
 */
export function routeToSubagent(prompt: string): SubagentConfig {
  const lower = prompt.toLowerCase();
  for (const agent of subagents) {
    if (agent.role === "general") continue;
    if (agent.triggers.some((t) => lower.includes(t))) {
      return agent;
    }
  }
  return subagents.find((a) => a.role === "general")!;
}
