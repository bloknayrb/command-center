/**
 * CLI agent test script.
 *
 * Usage:
 *   npx tsx scripts/test-agent.ts "What are my overdue tasks?"
 *   npx tsx scripts/test-agent.ts
 *
 * Verifies that the agent core works end-to-end:
 * - Anthropic SDK connects
 * - Subagent routing works
 * - Streaming responses arrive
 */

import { queryAgent } from "../src/lib/agent";
import { routeToSubagent } from "../src/lib/agent/subagents";
import * as dotenv from "dotenv";
import * as path from "node:path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const prompt =
    process.argv[2] || "What are my overdue tasks? List them by priority.";

  console.log("=== Command Center Agent Test ===\n");
  console.log(`Prompt: "${prompt}"\n`);

  // Show routing
  const subagent = routeToSubagent(prompt);
  console.log(`Routed to: ${subagent.name} (${subagent.role})\n`);
  console.log("--- Response ---\n");

  // Stream the response
  try {
    for await (const event of queryAgent({ prompt })) {
      switch (event.type) {
        case "text":
          if (event.content) process.stdout.write(event.content);
          break;
        case "done":
          console.log("\n\n--- Done ---");
          break;
        case "error":
          console.error(`\nERROR: ${event.content}`);
          process.exit(1);
      }
    }
  } catch (err) {
    console.error(
      "\nFailed to query agent:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }
}

main();
