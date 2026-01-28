/**
 * Session management — in-memory session store with TTL cleanup.
 *
 * Sessions maintain conversation history for multi-turn interactions.
 * TTL-based cleanup prevents memory leaks.
 */

import type { AgentMessage, AgentSession } from "@/types/agent";
import { config } from "@/config/app.config";

const sessions = new Map<string, AgentSession>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Get or create a session by ID.
 */
export function getSession(sessionId: string): AgentSession {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
    };
    sessions.set(sessionId, session);
  }
  session.lastActive = new Date();
  return session;
}

/**
 * Add a message to a session.
 */
export function addMessage(
  sessionId: string,
  message: AgentMessage
): void {
  const session = getSession(sessionId);
  session.messages.push(message);
  session.lastActive = new Date();
}

/**
 * Get conversation history formatted for the Anthropic API.
 */
export function getConversationHistory(
  sessionId: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const session = getSession(sessionId);
  return session.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

/**
 * Start the cleanup timer to remove expired sessions.
 */
export function startSessionCleanup(): void {
  if (cleanupTimer) return;
  const intervalMs = 10 * 60 * 1000; // 10 minutes
  cleanupTimer = setInterval(() => {
    const ttlMs = config.session_ttl_minutes * 60 * 1000;
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActive.getTime() > ttlMs) {
        sessions.delete(id);
      }
    }
    // Enforce max sessions (evict oldest)
    if (sessions.size > config.max_sessions) {
      const sorted = [...sessions.entries()].sort(
        (a, b) => a[1].lastActive.getTime() - b[1].lastActive.getTime()
      );
      const toRemove = sorted.slice(0, sessions.size - config.max_sessions);
      for (const [id] of toRemove) {
        sessions.delete(id);
      }
    }
  }, intervalMs);
}

/**
 * Stop the cleanup timer.
 */
export function stopSessionCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Get current session count (for health checks).
 */
export function getSessionCount(): number {
  return sessions.size;
}
