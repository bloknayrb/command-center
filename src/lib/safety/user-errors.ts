/**
 * user-errors.ts — Map technical errors to plain English + recovery actions.
 *
 * No technical jargon in UI error messages. Every error gets:
 * 1. A friendly message the user can understand
 * 2. A recovery action they can take
 */

export interface UserError {
  /** Short friendly message for the UI */
  message: string;
  /** What the user can do about it */
  recovery: string;
  /** Technical details for logging (not shown to user) */
  technical: string;
}

/**
 * Map a technical error to a user-friendly error.
 */
export function toUserError(err: unknown): UserError {
  if (err instanceof Error) {
    const nodeErr = err as NodeJS.ErrnoException;

    // File system errors
    if (nodeErr.code === "EACCES" || nodeErr.code === "EPERM") {
      return {
        message: "File is locked — probably by OneDrive or Obsidian",
        recovery: "Wait 30 seconds and try again. If it persists, close Obsidian briefly.",
        technical: `${nodeErr.code}: ${nodeErr.message}`,
      };
    }

    if (nodeErr.code === "EBUSY") {
      return {
        message: "File is being synced by OneDrive",
        recovery: "Wait a moment — OneDrive is uploading. Try again in 15 seconds.",
        technical: `EBUSY: ${nodeErr.message}`,
      };
    }

    if (nodeErr.code === "ENOENT") {
      return {
        message: "File or folder not found",
        recovery: "Check that the vault path is correct and OneDrive is online.",
        technical: `ENOENT: ${nodeErr.message}`,
      };
    }

    if (nodeErr.code === "ENOSPC") {
      return {
        message: "Disk is full",
        recovery: "Free up some disk space and try again.",
        technical: `ENOSPC: ${nodeErr.message}`,
      };
    }

    // Network errors
    if (nodeErr.code === "ECONNREFUSED") {
      return {
        message: "Could not connect to a required service",
        recovery: "Check that all services are running (MCP servers, etc).",
        technical: `ECONNREFUSED: ${nodeErr.message}`,
      };
    }

    if (nodeErr.code === "ETIMEDOUT") {
      return {
        message: "Request timed out",
        recovery: "The operation took too long. Try again.",
        technical: `ETIMEDOUT: ${nodeErr.message}`,
      };
    }

    // API errors
    if (err.message.includes("429") || err.message.includes("rate limit")) {
      return {
        message: "AI service is temporarily busy",
        recovery: "Wait a minute and try again. This is a rate limit.",
        technical: `Rate limited: ${err.message}`,
      };
    }

    if (err.message.includes("401") || err.message.includes("authentication")) {
      return {
        message: "API key is invalid or expired",
        recovery: "Check your ANTHROPIC_API_KEY in .env.local.",
        technical: `Auth error: ${err.message}`,
      };
    }

    // Generic known error
    return {
      message: "Something went wrong",
      recovery: "Try again. If the problem persists, check the logs.",
      technical: err.message,
    };
  }

  // Unknown error type
  return {
    message: "An unexpected error occurred",
    recovery: "Try again. If the problem persists, restart the application.",
    technical: String(err),
  };
}
