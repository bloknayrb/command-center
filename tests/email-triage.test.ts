/**
 * Email triage classification tests.
 *
 * Tests the classifyTier ordering fix:
 * 1. Jeremy triggers → Tier 1
 * 2. Client detected → Tier 1
 * 3. Tags "urgent"/"action" → Tier 1
 * 4. Action signals → Tier 2
 * 5. Default → Tier 3
 */

import { describe, it, expect } from "vitest";
import { parseEmailNote } from "@/lib/obsidian/emails";

describe("classifyTier", () => {
  it("classifies email with urgent tag as Tier 1 regardless of body content", () => {
    // Body contains "update" which is an action signal,
    // but the "urgent" tag should take priority → Tier 1
    const content = `---
subject: Weekly status update
from: someone@example.com
date: 2026-01-27
tags:
  - urgent
---

Here is the weekly status update for the project.`;

    const result = parseEmailNote("test/email.md", content);
    expect(result.tier).toBe(1);
  });

  it("classifies email with action tag as Tier 1", () => {
    const content = `---
subject: Misc item
from: someone@example.com
date: 2026-01-27
tags:
  - action
---

No special keywords here besides tags.`;

    const result = parseEmailNote("test/email.md", content);
    expect(result.tier).toBe(1);
  });

  it("classifies email with DRPA keyword as Tier 1 via client detection", () => {
    const content = `---
subject: DRPA Documentation Review
from: someone@example.com
date: 2026-01-27
tags: []
---

Please review the DRPA documentation.`;

    const result = parseEmailNote("test/email.md", content);
    expect(result.tier).toBe(1);
    expect(result.client).toBe("DRPA");
  });

  it("classifies generic email as Tier 3", () => {
    const content = `---
subject: Newsletter
from: noreply@example.com
date: 2026-01-27
tags: []
---

This is an automated newsletter with no relevant keywords.`;

    const result = parseEmailNote("test/email.md", content);
    expect(result.tier).toBe(3);
  });

  it("classifies email with action signals as Tier 2", () => {
    const content = `---
subject: Can you please look at this
from: colleague@example.com
date: 2026-01-27
tags: []
---

Could you approve this document?`;

    const result = parseEmailNote("test/email.md", content);
    expect(result.tier).toBe(2);
  });
});
