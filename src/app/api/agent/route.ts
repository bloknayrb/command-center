/**
 * SSE streaming API route for agent queries.
 *
 * POST /api/agent
 * Body: { prompt: string, sessionId?: string, agent?: string }
 *
 * Returns Server-Sent Events stream with agent responses.
 * Each event is a JSON-encoded AgentStreamEvent.
 */

import { NextRequest } from "next/server";
import { queryAgent } from "@/lib/agent";
import { toUserError } from "@/lib/safety/user-errors";
import type { AgentRole } from "@/types/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, sessionId, agent } = body as {
      prompt?: string;
      sessionId?: string;
      agent?: AgentRole;
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of queryAgent({
            prompt: prompt.trim(),
            sessionId,
            agent,
          })) {
            const data = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const userErr = toUserError(err);
          const errorEvent = JSON.stringify({
            type: "error",
            content: userErr.message,
          });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const userErr = toUserError(err);
    return new Response(
      JSON.stringify({ error: userErr.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
