/**
 * Tests for user-friendly error mapping.
 */

import { describe, it, expect } from "vitest";
import { toUserError } from "@/lib/safety/user-errors";

describe("toUserError", () => {
  it("maps EACCES to OneDrive lock message", () => {
    const err = Object.assign(new Error("permission denied"), { code: "EACCES" });
    const result = toUserError(err);
    expect(result.message).toContain("locked");
    expect(result.recovery).toContain("Wait");
    expect(result.technical).toContain("EACCES");
  });

  it("maps EBUSY to OneDrive sync message", () => {
    const err = Object.assign(new Error("resource busy"), { code: "EBUSY" });
    const result = toUserError(err);
    expect(result.message).toContain("synced");
    expect(result.recovery).toContain("OneDrive");
  });

  it("maps ENOENT to not found message", () => {
    const err = Object.assign(new Error("no such file"), { code: "ENOENT" });
    const result = toUserError(err);
    expect(result.message).toContain("not found");
  });

  it("maps ECONNREFUSED to service unavailable", () => {
    const err = Object.assign(new Error("connection refused"), {
      code: "ECONNREFUSED",
    });
    const result = toUserError(err);
    expect(result.message).toContain("connect");
  });

  it("maps rate limit errors", () => {
    const err = new Error("429 Too Many Requests");
    const result = toUserError(err);
    expect(result.message).toContain("busy");
    expect(result.recovery).toContain("rate limit");
  });

  it("maps auth errors", () => {
    const err = new Error("401 authentication failed");
    const result = toUserError(err);
    expect(result.message).toContain("API key");
  });

  it("handles unknown error types", () => {
    const result = toUserError("string error");
    expect(result.message).toBeDefined();
    expect(result.recovery).toBeDefined();
    expect(result.technical).toBe("string error");
  });

  it("handles generic Error objects", () => {
    const err = new Error("something broke");
    const result = toUserError(err);
    expect(result.message).toBeDefined();
    expect(result.technical).toBe("something broke");
  });
});
