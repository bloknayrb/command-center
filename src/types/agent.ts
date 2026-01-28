/**
 * Agent types — shared across agent modules and API routes.
 */

export type AgentRole = "task" | "search" | "triage" | "general";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  /** Which subagent handled this (if any) */
  agent?: AgentRole;
  /** Timestamp */
  timestamp: string;
}

export interface AgentStreamEvent {
  type: "text" | "done" | "error";
  content?: string;
  agent?: AgentRole;
}

export interface AgentSession {
  id: string;
  messages: AgentMessage[];
  createdAt: Date;
  lastActive: Date;
}

export interface AgentQueryOptions {
  /** User's prompt */
  prompt: string;
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** Force a specific subagent */
  agent?: AgentRole;
}
