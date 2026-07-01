import { describe, it, expect } from "vitest";
import { serializePresetCss, getDefaultPresetCss, PRESETS, DEFAULT_PRESET_NAME } from "./presets";

describe("serializePresetCss", () => {
  it("wraps vars in a :root block", () => {
    const css = serializePresetCss({ "--bg": "#000", "--fg": "#fff" });
    expect(css).toMatch(/^:root \{/);
    expect(css).toMatch(/\}\n$/);
  });

  it("includes each variable declaration", () => {
    const css = serializePresetCss({ "--bg": "#1e1e2e", "--fg": "#cdd6f4" });
    expect(css).toContain("  --bg: #1e1e2e;");
    expect(css).toContain("  --fg: #cdd6f4;");
  });

  it("indents each declaration with two spaces", () => {
    const css = serializePresetCss({ "--accent": "#7aa2f7" });
    expect(css).toContain("  --accent:");
  });
});

describe("getDefaultPresetCss", () => {
  it("returns a non-empty CSS string", () => {
    const css = getDefaultPresetCss();
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain(":root");
  });

  it("reflects DEFAULT_PRESET_NAME", () => {
    const preset = PRESETS.find(p => p.name === DEFAULT_PRESET_NAME);
    expect(preset).toBeDefined();
    const css = getDefaultPresetCss();
    // spot-check one variable from the default preset
    const firstVar = Object.keys(preset!.vars)[0];
    expect(css).toContain(firstVar);
  });
});

describe("PRESETS", () => {
  it("every preset has the required color tokens", () => {
    const required = [
      "--bg", "--fg", "--surface", "--border", "--muted",
      "--tile-correct", "--tile-present", "--tile-absent",
      "--tile-text", "--success", "--error", "--accent",
      "--button-bg", "--button-fg",
    ];
    for (const preset of PRESETS) {
      for (const token of required) {
        expect(preset.vars[token], `${preset.name} missing ${token}`).toBeDefined();
      }
    }
  });

  it("DEFAULT_PRESET_NAME exists in PRESETS", () => {
    expect(PRESETS.find(p => p.name === DEFAULT_PRESET_NAME)).toBeDefined();
  });
});
