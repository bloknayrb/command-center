import { z } from "zod";

const RecencyScanSchema = z.object({
  path: z.string(),
  max_age_days: z.number().positive(),
});

const AppConfigSchema = z.object({
  // Jeremy priority detection keywords
  jeremy_triggers: z.array(z.string()).default([
    "Jeremy",
    "Siviter",
    "URGENT",
    "ASAP",
    "immediately",
    "end of day",
    "EOD",
    "critical",
    "priority",
  ]),

  // Vault scanning scope
  hot_paths: z
    .object({
      always_scan: z.array(z.string()).default([
        "TaskNotes",
        "01-Projects",
        "Calendar",
      ]),
      recency_scan: z.array(RecencyScanSchema).default([
        { path: "02-Daily Notes", max_age_days: 14 },
        { path: "Emails", max_age_days: 14 },
        { path: "TeamsChats", max_age_days: 14 },
      ]),
      system_files: z.array(z.string()).default([
        "99-System/Claude-State.md",
        "99-System/Active-Projects.md",
        "99-System/Background-Tracking.md",
      ]),
      excluded: z.array(z.string()).default([
        ".obsidian",
        ".claude",
        ".trash",
        ".smart-env",
        "Excalidraw",
        "Ink",
        "Clippings",
        "temp",
        "thumbnails",
        "voicenotes",
        "Attachments",
        "06-Career",
        "KeepSidian",
        "05-Knowledge",
        "03-Contacts",
      ]),
    })
    .default({}),

  // Safety
  safe_mode: z.boolean().default(true),

  // Client detection for triage
  client_keywords: z
    .record(z.array(z.string()))
    .default({
      DRPA: ["DRPA", "Delaware River", "Port Authority"],
      VDOT: ["VDOT", "Virginia DOT", "NIOP"],
      MDTA: ["MDTA", "Maryland"],
      DelDOT: ["DelDOT", "Delaware DOT"],
    }),

  // PIP evidence generation (config only — PIP source files are gitignored)
  pip: z
    .object({
      start_date: z.string().default("2026-01-27"),
      end_date: z.string().default("2026-04-27"),
      checkin_interval_days: z.number().default(14),
      categories: z.array(z.string()).default([]),
    })
    .default({}),

  // Vault scanner cache TTL (seconds)
  scanner_cache_ttl: z.number().default(60),

  // Session management
  session_ttl_minutes: z.number().default(60),
  max_sessions: z.number().default(50),

  // MCP health check interval (seconds)
  mcp_health_interval: z.number().default(30),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export const config: AppConfig = AppConfigSchema.parse({});
