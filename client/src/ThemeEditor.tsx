import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { applyTheme } from "./theme-apply";
import { IconArrowLeft } from "./icons";

// must stay in sync with theme.css :root defaults
const TEMPLATE = `:root {
  --bg: #282828;
  --fg: #ebdbb2;
  --surface: #3c3836;
  --border: #504945;
  --muted: #928374;
  --tile-correct: #98971a;
  --tile-present: #d79921;
  --tile-absent: #504945;
  --tile-text: #ebdbb2;
  --success: #b8bb26;
  --error: #fb4934;
  --accent: #83a598;
  --button-bg: #3c3836;
  --button-fg: #ebdbb2;
}
`;

type Entry = { key: string; value: string };
type Preset = { name: string; vars: Record<string, string> };

const PRESETS: Preset[] = [
  {
    name: "Gruvbox",
    vars: {
      "--bg": "#282828", "--fg": "#ebdbb2", "--surface": "#3c3836",
      "--border": "#504945", "--muted": "#928374",
      "--tile-correct": "#98971a", "--tile-present": "#d79921", "--tile-absent": "#504945",
      "--tile-text": "#ebdbb2", "--success": "#b8bb26", "--error": "#fb4934",
      "--accent": "#83a598", "--button-bg": "#3c3836", "--button-fg": "#ebdbb2",
    },
  },
  {
    name: "Tokyo Night",
    vars: {
      "--bg": "#1a1b26", "--fg": "#c0caf5", "--surface": "#24283b",
      "--border": "#414868", "--muted": "#565f89",
      "--tile-correct": "#9ece6a", "--tile-present": "#e0af68", "--tile-absent": "#414868",
      "--tile-text": "#c0caf5", "--success": "#9ece6a", "--error": "#f7768e",
      "--accent": "#7aa2f7", "--button-bg": "#24283b", "--button-fg": "#c0caf5",
    },
  },
  {
    name: "Catppuccin",
    vars: {
      "--bg": "#1e1e2e", "--fg": "#cdd6f4", "--surface": "#313244",
      "--border": "#45475a", "--muted": "#6c7086",
      "--tile-correct": "#a6e3a1", "--tile-present": "#f9e2af", "--tile-absent": "#45475a",
      "--tile-text": "#1e1e2e", "--success": "#a6e3a1", "--error": "#f38ba8",
      "--accent": "#89b4fa", "--button-bg": "#313244", "--button-fg": "#cdd6f4",
    },
  },
  {
    name: "Retro",
    vars: {
      "--bg": "#0d0d0d", "--fg": "#ffb000", "--surface": "#1a1400",
      "--border": "#3d2e00", "--muted": "#7a5c00",
      "--tile-correct": "#00cc44", "--tile-present": "#ffb000", "--tile-absent": "#1a1400",
      "--tile-text": "#0d0d0d", "--success": "#00cc44", "--error": "#ff3300",
      "--accent": "#ffb000", "--button-bg": "#1a1400", "--button-fg": "#ffb000",
    },
  },
  {
    name: "Dracula",
    vars: {
      "--bg": "#282a36", "--fg": "#f8f8f2", "--surface": "#44475a",
      "--border": "#6272a4", "--muted": "#6272a4",
      "--tile-correct": "#50fa7b", "--tile-present": "#f1fa8c", "--tile-absent": "#44475a",
      "--tile-text": "#282a36", "--success": "#50fa7b", "--error": "#ff5555",
      "--accent": "#bd93f9", "--button-bg": "#44475a", "--button-fg": "#f8f8f2",
    },
  },
  {
    name: "Rosé Pine",
    vars: {
      "--bg": "#191724", "--fg": "#e0def4", "--surface": "#26233a",
      "--border": "#403d52", "--muted": "#6e6a86",
      "--tile-correct": "#31748f", "--tile-present": "#f6c177", "--tile-absent": "#403d52",
      "--tile-text": "#e0def4", "--success": "#9ccfd8", "--error": "#eb6f92",
      "--accent": "#c4a7e7", "--button-bg": "#26233a", "--button-fg": "#e0def4",
    },
  },
];

const SWATCH_KEYS = ["--bg", "--accent", "--tile-correct", "--tile-present", "--error"];

function parseCss(css: string): Entry[] {
  const entries: Entry[] = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    entries.push({ key: m[1].trim(), value: m[2].trim() });
  }
  return entries;
}

function serializeCss(entries: Entry[]): string {
  const body = entries.map((e) => `  ${e.key}: ${e.value};`).join("\n");
  return `:root {\n${body}\n}\n`;
}

function isValidHex(val: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(val);
}

function contrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const n = parseInt(clean, 16);
  const [r, g, b] = ([(n >> 16) & 255, (n >> 8) & 255, n & 255] as number[]).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#000000" : "#ffffff";
}

function ColorRow({
  entry,
  onChange,
}: {
  entry: Entry;
  onChange: (key: string, value: string) => void;
}) {
  const [draft, setDraft] = useState(entry.value);

  useEffect(() => { setDraft(entry.value); }, [entry.value]);

  const resolvedBg = isValidHex(draft) ? draft : (isValidHex(entry.value) ? entry.value : "#3c3836");
  const textColor = contrastColor(resolvedBg);

  function handleText(v: string) {
    setDraft(v);
    if (isValidHex(v)) onChange(entry.key, v);
  }

  function handlePicker(v: string) {
    setDraft(v);
    onChange(entry.key, v);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm font-mono text-muted shrink-0 truncate">{entry.key}</span>
      <input
        type="color"
        value={isValidHex(entry.value) ? entry.value : "#000000"}
        onChange={(e) => handlePicker(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer border border-border-app/40 p-0.5 bg-transparent shrink-0"
      />
      <input
        type="text"
        value={draft}
        onChange={(e) => handleText(e.target.value)}
        spellCheck={false}
        maxLength={7}
        className="w-28 px-3 py-1.5 rounded-lg font-mono text-sm border focus:outline-none focus:ring-2 focus:ring-white/20 transition"
        style={{ background: resolvedBg, color: textColor, borderColor: resolvedBg }}
      />
    </div>
  );
}

function PresetButton({ preset, onClick }: { preset: Preset; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-xl border border-border-app/40 shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
      style={{ background: preset.vars["--bg"] }}
    >
      <div className="flex gap-1 mb-2">
        {SWATCH_KEYS.map((k) => (
          <div
            key={k}
            className="h-2.5 flex-1 rounded-full"
            style={{ background: preset.vars[k] }}
          />
        ))}
      </div>
      <span
        className="text-xs font-medium"
        style={{ color: preset.vars["--fg"] }}
      >
        {preset.name}
      </span>
    </button>
  );
}

export function ThemeEditor({ onClose }: { onClose: () => void }) {
  const { authedPost } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [savedCss, setSavedCss] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const data = await authedPost("/api/theme/get", {});
      const css = data.css || TEMPLATE;
      setSavedCss(css);
      setEntries(parseCss(css));
    })();
  }, [authedPost]);

  useEffect(() => {
    if (entries.length) applyTheme(serializeCss(entries));
  }, [entries]);

  function handleChange(key: string, value: string) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, value } : e)));
  }

  function loadPreset(preset: Preset) {
    setEntries((prev) =>
      prev.map((e) => (preset.vars[e.key] ? { ...e, value: preset.vars[e.key] } : e))
    );
  }

  function handleClose() {
    applyTheme(savedCss);
    onClose();
  }

  async function save() {
    const css = serializeCss(entries);
    const data = await authedPost("/api/theme/save", { css });
    if (!data.error) setSavedCss(css);
    setStatus(data.error ? data.error : "Saved!");
    setTimeout(() => setStatus(""), 2000);
  }

  function reset() {
    setEntries(parseCss(TEMPLATE));
    applyTheme("");
    setStatus("Reset to default");
    setTimeout(() => setStatus(""), 2000);
  }

  async function exportToClipboard() {
    await navigator.clipboard.writeText(serializeCss(entries));
    setStatus("Copied to clipboard!");
    setTimeout(() => setStatus(""), 2000);
  }

  async function importFromClipboard() {
    const text = await navigator.clipboard.readText();
    const parsed = parseCss(text);
    if (!parsed.length) {
      setStatus("Nothing to import");
      setTimeout(() => setStatus(""), 2000);
      return;
    }
    setEntries(parsed);
    setStatus("Imported!");
    setTimeout(() => setStatus(""), 2000);
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-20 pb-10 lg:py-10">
      {/* Mobile: fixed top-left back button */}
      <button
        onClick={handleClose}
        aria-label="Back"
        className="lg:hidden fixed top-4 left-4 z-10 w-10 h-10 flex items-center justify-center bg-surface border border-border-app/50 rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"
      >
        <IconArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            aria-label="Back"
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-muted bg-surface border border-border-app/40 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            <IconArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-fg">Theme editor</h1>
        </div>

        <div className="flex flex-col gap-5 p-5 rounded-xl bg-surface border border-border-app/40 shadow-lg shadow-black/40">
          {/* mobile: horizontal scroll preset strip */}
          <div className="lg:hidden">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Presets</span>
            <div className="flex gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none">
              {PRESETS.map((p) => (
                <div key={p.name} className="w-28 shrink-0">
                  <PresetButton preset={p} onClick={() => loadPreset(p)} />
                </div>
              ))}
            </div>
          </div>

          {/* body: color rows + presets sidebar (desktop) */}
          <div className="flex gap-6">
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              {entries.map((entry) => (
                <ColorRow key={entry.key} entry={entry} onChange={handleChange} />
              ))}
            </div>

            {/* right: presets sidebar (desktop only) */}
            <div className="hidden lg:flex w-36 shrink-0 flex-col gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider px-1">Presets</span>
              {PRESETS.map((p) => (
                <PresetButton key={p.name} preset={p} onClick={() => loadPreset(p)} />
              ))}
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-app/30">
            <button
              onClick={save}
              className="px-4 py-2 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
            >
              Save theme
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-bg text-fg border border-border-app/60 shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
            >
              Reset to default
            </button>
            {status && <span className="text-sm text-success font-medium">{status}</span>}
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={exportToClipboard}
                className="px-4 py-2 rounded-lg bg-bg text-fg border border-border-app/60 shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
              >
                Export
              </button>
              <button
                onClick={importFromClipboard}
                className="px-4 py-2 rounded-lg bg-bg text-fg border border-border-app/60 shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
