import { describe, it, expect } from "vitest";
import { sanitizeThemeCss } from "./theme-apply";

describe("sanitizeThemeCss", () => {
  it("passes valid custom property declarations through", () => {
    const input = `:root { --bg: #1e1e2e; --fg: #cdd6f4; }`;
    const output = sanitizeThemeCss(input);
    expect(output).toContain("--bg: #1e1e2e !important");
    expect(output).toContain("--fg: #cdd6f4 !important");
  });

  it("wraps output in :root block", () => {
    const output = sanitizeThemeCss(`:root { --bg: #000; }`);
    expect(output).toMatch(/^:root \{/);
    expect(output).toMatch(/\}$/);
  });

  it("appends !important to every declaration", () => {
    const output = sanitizeThemeCss(`:root { --accent: #7aa2f7; }`);
    expect(output).toContain("!important");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeThemeCss("")).toBe("");
  });

  it("returns empty string when no valid declarations found", () => {
    expect(sanitizeThemeCss(`:root { color: red; font-size: 16px; }`)).toBe("");
  });

  it("rejects url() values", () => {
    const output = sanitizeThemeCss(`:root { --bg: url(https://evil.com/x.png); }`);
    expect(output).toBe("");
  });

  it("rejects javascript: values", () => {
    const output = sanitizeThemeCss(`:root { --bg: javascript:alert(1); }`);
    expect(output).toBe("");
  });

  it("rejects values containing <", () => {
    const output = sanitizeThemeCss(`:root { --bg: <script>; }`);
    expect(output).toBe("");
  });

  it("rejects values containing >", () => {
    const output = sanitizeThemeCss(`:root { --bg: </style>; }`);
    expect(output).toBe("");
  });

  it("rejects @import values", () => {
    const output = sanitizeThemeCss(`:root { --bg: @import url(x); }`);
    expect(output).toBe("");
  });

  it("rejects values longer than 200 characters", () => {
    const long = "#" + "a".repeat(201);
    const output = sanitizeThemeCss(`:root { --bg: ${long}; }`);
    expect(output).toBe("");
  });

  it("accepts values up to 200 characters", () => {
    const val = "#" + "a".repeat(199);
    const output = sanitizeThemeCss(`:root { --bg: ${val}; }`);
    expect(output).toContain(`--bg: ${val} !important`);
  });

  it("filters bad declarations while keeping valid ones", () => {
    const input = `:root {
      --bg: #1e1e2e;
      --evil: url(x);
      --fg: #cdd6f4;
    }`;
    const output = sanitizeThemeCss(input);
    expect(output).toContain("--bg");
    expect(output).toContain("--fg");
    expect(output).not.toContain("--evil");
  });
});
