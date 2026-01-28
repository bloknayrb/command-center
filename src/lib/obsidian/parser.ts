/**
 * Markdown + frontmatter parser.
 *
 * Uses gray-matter to parse YAML frontmatter from Obsidian notes.
 * Returns typed data with both frontmatter and body content.
 */

import matter from "gray-matter";

export interface ParsedNote {
  /** Parsed YAML frontmatter as key-value pairs */
  frontmatter: Record<string, unknown>;
  /** Markdown body (everything after frontmatter) */
  body: string;
  /** Raw file content */
  raw: string;
}

/**
 * Parse a markdown file with YAML frontmatter.
 */
export function parseNote(content: string): ParsedNote {
  const { data, content: body } = matter(content);
  return {
    frontmatter: data as Record<string, unknown>,
    body: body.trim(),
    raw: content,
  };
}

/**
 * Serialize frontmatter + body back to markdown string.
 */
export function serializeNote(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  return matter.stringify(body, frontmatter);
}

/**
 * Extract a string value from frontmatter, returning undefined if missing or wrong type.
 */
export function getString(
  fm: Record<string, unknown>,
  key: string
): string | undefined {
  const val = fm[key];
  return typeof val === "string" ? val : undefined;
}

/**
 * Extract a string array from frontmatter (handles both string and array values).
 */
export function getStringArray(
  fm: Record<string, unknown>,
  key: string
): string[] {
  const val = fm[key];
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  if (typeof val === "string") return [val];
  return [];
}
