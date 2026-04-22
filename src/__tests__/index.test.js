// Tests for ship-happens core logic
// Run with: npm test

const { buildComment, getEnvEmoji, formatTimestamp } = require("../helpers");

// ─── Comment Builder ──────────────────────────────────────────────────────────

describe("buildComment", () => {
  const base = {
    environment: "production",
    status: "success",
    actor: "shiftEscape",
    approver: "tech-lead",
    runUrl: "https://github.com/owner/repo/actions/runs/123",
    customMessage: "",
    repoUrl: "https://github.com/shiftEscape/ship-happens",
  };

  test("contains the marker comment", () => {
    const result = buildComment(base);
    expect(result).toContain("<!-- ship-happens-audit -->");
  });

  test("shows success status with correct emoji", () => {
    const result = buildComment({ ...base, status: "success" });
    expect(result).toContain("✅");
    expect(result).toContain("success");
  });

  test("shows failure status with correct emoji", () => {
    const result = buildComment({ ...base, status: "failure" });
    expect(result).toContain("❌");
    expect(result).toContain("failure");
  });

  test("shows cancelled status with correct emoji", () => {
    const result = buildComment({ ...base, status: "cancelled" });
    expect(result).toContain("⚠️");
    expect(result).toContain("cancelled");
  });

  test("includes actor", () => {
    const result = buildComment(base);
    expect(result).toContain("@shiftEscape");
  });

  test("includes approver when provided", () => {
    const result = buildComment(base);
    expect(result).toContain("@tech-lead");
  });

  test("shows fallback when no approver", () => {
    const result = buildComment({ ...base, approver: null });
    expect(result).toContain("no approval required");
  });

  test("includes custom message when provided", () => {
    const result = buildComment({ ...base, customMessage: "Hotfix for auth bug" });
    expect(result).toContain("Hotfix for auth bug");
  });

  test("omits custom message row when empty", () => {
    const result = buildComment({ ...base, customMessage: "" });
    expect(result).not.toContain("💬");
  });

  test("includes run URL", () => {
    const result = buildComment(base);
    expect(result).toContain("https://github.com/owner/repo/actions/runs/123");
  });

  test("includes environment name", () => {
    const result = buildComment(base);
    expect(result).toContain("`production`");
  });
});

// ─── Env Emoji ────────────────────────────────────────────────────────────────

describe("getEnvEmoji", () => {
  test("returns red for production", () => {
    expect(getEnvEmoji("production")).toBe("🔴");
    expect(getEnvEmoji("prod")).toBe("🔴");
  });

  test("returns yellow for staging", () => {
    expect(getEnvEmoji("staging")).toBe("🟡");
    expect(getEnvEmoji("stage")).toBe("🟡");
  });

  test("returns green for development", () => {
    expect(getEnvEmoji("development")).toBe("🟢");
    expect(getEnvEmoji("dev")).toBe("🟢");
  });

  test("is case insensitive", () => {
    expect(getEnvEmoji("PRODUCTION")).toBe("🔴");
    expect(getEnvEmoji("Staging")).toBe("🟡");
  });

  test("returns rocket for unknown environments", () => {
    expect(getEnvEmoji("demo")).toBe("🚀");
    expect(getEnvEmoji("qa")).toBe("🚀");
  });
});

// ─── Timestamp ────────────────────────────────────────────────────────────────

describe("formatTimestamp", () => {
  test("includes UTC", () => {
    expect(formatTimestamp()).toContain("UTC");
  });

  test("matches expected format", () => {
    const result = formatTimestamp();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/);
  });
});
