/**
 * Agent lifecycle hooks — logging and memory auto-store.
 *
 * These hooks are called at various points in the agent execution
 * lifecycle to provide observability and automatic memory persistence.
 */

export interface AgentHookContext {
  sessionId: string;
  agent: string;
  prompt: string;
}

/**
 * Called before an agent query starts.
 */
export function onQueryStart(ctx: AgentHookContext): void {
  console.log(
    `[agent] ${ctx.agent} query start | session=${ctx.sessionId} | prompt="${ctx.prompt.slice(0, 80)}"`
  );
}

/**
 * Called after an agent query completes.
 */
export function onQueryComplete(
  ctx: AgentHookContext,
  durationMs: number,
  tokenUsage?: { input: number; output: number }
): void {
  const usage = tokenUsage
    ? ` | tokens=${tokenUsage.input}in/${tokenUsage.output}out`
    : "";
  console.log(
    `[agent] ${ctx.agent} query complete | ${durationMs}ms${usage}`
  );
}

/**
 * Called when an agent query fails.
 */
export function onQueryError(ctx: AgentHookContext, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[agent] ${ctx.agent} query error | ${msg}`);
}
