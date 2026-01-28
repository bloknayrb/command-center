/**
 * dates.ts — Eastern Time formatting utilities.
 *
 * Bryan is on Eastern Time. All dates displayed in the UI
 * and used in vault operations should be ET-aware.
 */

const EASTERN_TZ = "America/New_York";

/**
 * Get the current date/time in Eastern Time.
 */
export function nowET(): Date {
  return new Date();
}

/**
 * Format a date as "YYYY-MM-DD" in Eastern Time.
 */
export function formatDateET(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: EASTERN_TZ });
}

/**
 * Format a date as "YYYY-MM-DD HH:mm" in Eastern Time.
 */
export function formatDateTimeET(date: Date = new Date()): string {
  const d = formatDateET(date);
  const t = date.toLocaleTimeString("en-US", {
    timeZone: EASTERN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${d} ${t}`;
}

/**
 * Format a date as a friendly string like "Monday, January 27, 2026".
 */
export function formatFriendlyDateET(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    timeZone: EASTERN_TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Check if a date is within the last N days (using ET dates).
 */
export function isWithinDays(date: Date, days: number): boolean {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= cutoff;
}

/**
 * Get the Monday and Friday of the current week in ET.
 */
export function getCurrentWeekRange(): { monday: string; friday: string } {
  const now = new Date();
  // Shift to ET for day-of-week calculation
  const etStr = now.toLocaleDateString("en-CA", { timeZone: EASTERN_TZ });
  const etDate = new Date(etStr + "T12:00:00");
  const day = etDate.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(etDate);
  monday.setDate(etDate.getDate() + diffToMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    monday: formatDateET(monday),
    friday: formatDateET(friday),
  };
}
