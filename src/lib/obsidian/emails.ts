/**
 * Email note parsing — extracts structured data from email markdown files.
 *
 * Email notes in the vault follow a pattern with frontmatter containing
 * sender, subject, date, and tags. This module parses them for triage.
 */

import * as path from "node:path";
import { parseNote, getString, getStringArray } from "./parser";
import { config } from "@/config/app.config";

export interface EmailNote {
  /** File name */
  id: string;
  /** Full file path */
  filePath: string;
  /** Email subject */
  subject: string;
  /** Sender name or address */
  from: string;
  /** Date received */
  date: string;
  /** Tags extracted from frontmatter */
  tags: string[];
  /** Detected client (DRPA, VDOT, etc.) */
  client: string | null;
  /** Triage tier (1 = action required, 2 = awareness, 3 = low priority) */
  tier: 1 | 2 | 3;
  /** Body content */
  body: string;
}

/**
 * Parse an email note from file content + path.
 */
export function parseEmailNote(
  filePath: string,
  content: string
): EmailNote {
  const parsed = parseNote(content);
  const fm = parsed.frontmatter;

  const subject = getString(fm, "subject") ?? path.basename(filePath, ".md");
  const from = getString(fm, "from") ?? getString(fm, "sender") ?? "Unknown";
  const date = getString(fm, "date") ?? "";
  const tags = getStringArray(fm, "tags");
  const body = parsed.body;

  const client = detectClient(subject + " " + body);
  const tier = classifyTier(from, subject, body, tags);

  return {
    id: path.basename(filePath, ".md"),
    filePath,
    subject,
    from,
    date,
    tags,
    client,
    tier,
    body,
  };
}

/**
 * Detect which client an email relates to based on content keywords.
 */
function detectClient(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [client, keywords] of Object.entries(config.client_keywords)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return client;
    }
  }
  return null;
}

/**
 * Classify email into triage tier.
 *
 * Tier 1: From Jeremy, client agencies, or urgent keywords
 * Tier 2: Project updates, team comms, follow-ups
 * Tier 3: FYI, newsletters, automated
 */
function classifyTier(
  from: string,
  subject: string,
  body: string,
  tags: string[]
): 1 | 2 | 3 {
  const combined = `${from} ${subject} ${body}`.toLowerCase();

  // Check Jeremy triggers (Tier 1)
  if (config.jeremy_triggers.some((t) => combined.includes(t.toLowerCase()))) {
    return 1;
  }

  // Check client keywords (Tier 1)
  for (const keywords of Object.values(config.client_keywords)) {
    if (keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      return 1;
    }
  }

  // Check for action-required signals (Tier 2)
  const actionSignals = [
    "action",
    "follow up",
    "follow-up",
    "review",
    "approve",
    "response needed",
    "please",
    "request",
    "update",
    "meeting",
  ];
  if (actionSignals.some((s) => combined.includes(s))) {
    return 2;
  }

  // Check tags for priority signals
  if (tags.some((t) => t.toLowerCase().includes("urgent") || t.toLowerCase().includes("action"))) {
    return 1;
  }

  // Default: low priority
  return 3;
}
