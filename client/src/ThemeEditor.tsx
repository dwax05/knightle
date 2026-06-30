import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth";
import { applyTheme, applyThemeAnimated } from "./theme-apply";
import { IconArrowLeft } from "./icons";
import { AnimatedHorizontalList } from "./AnimatedHorizontalList";

// must stay in sync with theme.css :root defaults
const TEMPLATE = `:root {
  --bg: #1e1e2e;
  --fg: #cdd6f4;
  --surface: #313244;
  --border: #45475a;
  --muted: #a6adc8;
  --tile-correct: #a6e3a1;
  --tile-present: #f9e2af;
  --tile-absent: #45475a;
  --tile-text: #1e1e2e;
  --success: #a6e3a1;
  --error: #f38ba8;
  --accent: #cba6f7;
  --button-bg: #313244;
  --button-fg: #cdd6f4;
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
    name: "Catppuccin Mocha",
    vars: {
      "--bg": "#1e1e2e", "--fg": "#cdd6f4", "--surface": "#313244",
      "--border": "#45475a", "--muted": "#a6adc8",
      "--tile-correct": "#a6e3a1", "--tile-present": "#f9e2af", "--tile-absent": "#45475a",
      "--tile-text": "#1e1e2e", "--success": "#a6e3a1", "--error": "#f38ba8",
      "--accent": "#cba6f7", "--button-bg": "#313244", "--button-fg": "#cdd6f4",
    },
  },
  {
    name: "Catppuccin Latte",
    vars: {
      "--bg": "#eff1f5", "--fg": "#4c4f69", "--surface": "#e6e9ef",
      "--border": "#ccd0da", "--muted": "#9ca0b0",
      "--tile-correct": "#40a02b", "--tile-present": "#df8e1d", "--tile-absent": "#ccd0da",
      "--tile-text": "#eff1f5", "--success": "#40a02b", "--error": "#d20f39",
      "--accent": "#1e66f5", "--button-bg": "#e6e9ef", "--button-fg": "#4c4f69",
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
    name: "Nord",
    vars: {
      "--bg": "#2e3440", "--fg": "#d8dee9", "--surface": "#3b4252",
      "--border": "#434c5e", "--muted": "#4c566a",
      "--tile-correct": "#a3be8c", "--tile-present": "#ebcb8b", "--tile-absent": "#434c5e",
      "--tile-text": "#2e3440", "--success": "#a3be8c", "--error": "#bf616a",
      "--accent": "#88c0d0", "--button-bg": "#3b4252", "--button-fg": "#d8dee9",
    },
  },
  {
    name: "One Dark",
    vars: {
      "--bg": "#282c34", "--fg": "#abb2bf", "--surface": "#3e4451",
      "--border": "#4b5263", "--muted": "#5c6370",
      "--tile-correct": "#98c379", "--tile-present": "#e5c07b", "--tile-absent": "#4b5263",
      "--tile-text": "#282c34", "--success": "#98c379", "--error": "#e06c75",
      "--accent": "#61afef", "--button-bg": "#3e4451", "--button-fg": "#abb2bf",
    },
  },
  {
    name: "Solarized Dark",
    vars: {
      "--bg": "#002b36", "--fg": "#839496", "--surface": "#073642",
      "--border": "#586e75", "--muted": "#657b83",
      "--tile-correct": "#859900", "--tile-present": "#b58900", "--tile-absent": "#073642",
      "--tile-text": "#fdf6e3", "--success": "#859900", "--error": "#dc322f",
      "--accent": "#268bd2", "--button-bg": "#073642", "--button-fg": "#839496",
    },
  },
  {
    name: "Solarized Light",
    vars: {
      "--bg": "#fdf6e3", "--fg": "#657b83", "--surface": "#eee8d5",
      "--border": "#93a1a1", "--muted": "#93a1a1",
      "--tile-correct": "#859900", "--tile-present": "#b58900", "--tile-absent": "#eee8d5",
      "--tile-text": "#fdf6e3", "--success": "#859900", "--error": "#dc322f",
      "--accent": "#268bd2", "--button-bg": "#eee8d5", "--button-fg": "#657b83",
    },
  },
  {
    name: "Everforest",
    vars: {
      "--bg": "#2d353b", "--fg": "#d3c6aa", "--surface": "#343f44",
      "--border": "#475258", "--muted": "#859289",
      "--tile-correct": "#a7c080", "--tile-present": "#dbbc7f", "--tile-absent": "#475258",
      "--tile-text": "#2d353b", "--success": "#a7c080", "--error": "#e67e80",
      "--accent": "#7fbbb3", "--button-bg": "#343f44", "--button-fg": "#d3c6aa",
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
const SLOT_COUNT = 4;
const EMPTY_SLOTS: (Record<string, string> | null)[] = Array(SLOT_COUNT).fill(null);

const GROUPS: { label: string; keys: string[] }[] = [
  { label: "Page", keys: ["--bg", "--fg", "--surface", "--border", "--muted"] },
  { label: "Tiles", keys: ["--tile-correct", "--tile-present", "--tile-absent", "--tile-text"] },
  { label: "Accents", keys: ["--success", "--error", "--accent"] },
  { label: "Buttons", keys: ["--button-bg", "--button-fg"] },
];

const LABELS: Record<string, string> = {
  "--bg": "Background",
  "--fg": "Text",
  "--surface": "Surface",
  "--border": "Border",
  "--muted": "Muted text",
  "--tile-correct": "Correct",
  "--tile-present": "Present",
  "--tile-absent": "Absent",
  "--tile-text": "Tile text",
  "--success": "Success",
  "--error": "Error",
  "--accent": "Accent",
  "--button-bg": "Button",
  "--button-fg": "Button text",
};

function entriesToVars(entries: Entry[]): Record<string, string> {
  return Object.fromEntries(entries.map((e) => [e.key, e.value]));
}

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

  const resolvedBg = isValidHex(draft) ? draft : (isValidHex(entry.value) ? entry.value : "#313244");
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
      <span className="w-28 text-sm text-muted shrink-0 truncate">{LABELS[entry.key] ?? entry.key}</span>
      <input
        type="color"
        value={isValidHex(entry.value) ? entry.value : "#000000"}
        onChange={(e) => handlePicker(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent shrink-0 outline-none"
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
        className="text-xs font-medium flex items-end min-h-[2.5em]"
        style={{ color: preset.vars["--fg"] }}
      >
        {preset.name}
      </span>
    </button>
  );
}

function SlotButton({
  index,
  slot,
  onSave,
  onLoad,
  onClear,
}: {
  index: number;
  slot: Record<string, string> | null;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
}) {
  return (
    <button
      onClick={slot ? onLoad : onSave}
      className="relative w-full text-left px-3 py-2.5 rounded-xl border border-border-app/40 shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
      style={{ background: slot?.["--bg"] ?? undefined }}
    >
      {slot && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded text-xs font-bold leading-none hover:brightness-110"
          style={{ color: slot["--muted"] }}
          aria-label="Clear slot"
        >
          ×
        </span>
      )}
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); onSave(); }}
        className="absolute bottom-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded text-xs leading-none hover:brightness-110"
        style={slot ? { color: slot["--muted"] } : undefined}
        aria-label="Save to slot"
        title="Save current theme here"
      >
        ↓
      </span>
      <div className={`flex gap-1 mb-2 ${!slot ? "invisible" : ""}`}>
        {SWATCH_KEYS.map((k) => (
          <div key={k} className="h-2.5 flex-1 rounded-full" style={{ background: slot?.[k] }} />
        ))}
      </div>
      <span className="text-xs font-medium" style={slot ? { color: slot["--fg"] } : undefined}>
        {slot ? `Slot ${index + 1}` : <span className="text-muted">Slot {index + 1}</span>}
      </span>
    </button>
  );
}

export function ThemeEditor({ onClose }: { onClose: () => void }) {
  const { authedPost } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [savedCss, setSavedCss] = useState("");
  const [status, setStatus] = useState("");
  const actionsRef = useRef<HTMLDivElement>(null);
  const animateNextApply = useRef(false);
  const [actionsVisible, setActionsVisible] = useState(true);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActionsVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [slots, setSlots] = useState<(Record<string, string> | null)[]>(EMPTY_SLOTS);

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2000);
  }

  async function persistSlots(updated: (Record<string, string> | null)[]) {
    setSlots(updated);
    await authedPost("/api/theme/slots", { slots: updated });
  }

  function handleSaveSlot(i: number) {
    persistSlots(slots.map((s, idx) => idx === i ? entriesToVars(entries) : s));
  }

  function handleLoadSlot(i: number) {
    const slot = slots[i];
    if (!slot) return;
    animateNextApply.current = true;
    setEntries((prev) => prev.map((e) => slot[e.key] ? { ...e, value: slot[e.key] } : e));
  }

  function handleClearSlot(i: number) {
    persistSlots(slots.map((s, idx) => idx === i ? null : s));
  }

  useEffect(() => {
    (async () => {
      const data = await authedPost("/api/theme/get", {});
      const css = data.css || TEMPLATE;
      setSavedCss(css);
      setEntries(parseCss(css));
      if (Array.isArray(data.slots) && data.slots.length === SLOT_COUNT) {
        setSlots(data.slots);
      }
    })();
  }, [authedPost]);

  useEffect(() => {
    if (!entries.length) return;
    if (animateNextApply.current) {
      animateNextApply.current = false;
      applyThemeAnimated(serializeCss(entries));
    } else {
      applyTheme(serializeCss(entries));
    }
  }, [entries]);

  function handleChange(key: string, value: string) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, value } : e)));
  }

  function loadPreset(preset: Preset) {
    animateNextApply.current = true;
    setEntries((prev) =>
      prev.map((e) => (preset.vars[e.key] ? { ...e, value: preset.vars[e.key] } : e))
    );
  }

  function handleClose() {
    applyThemeAnimated(savedCss);
    onClose();
  }

  async function save() {
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 150);
    const css = serializeCss(entries);
    const data = await authedPost("/api/theme/save", { css });
    if (data.error) flash(data.error);
    else setSavedCss(css);
  }

  function reset() {
    animateNextApply.current = true;
    setEntries(parseCss(TEMPLATE));
    flash("Reset to default");
  }

  async function exportToClipboard() {
    await navigator.clipboard.writeText(serializeCss(entries));
    flash("Copied to clipboard!");
  }

  async function importFromClipboard() {
    const text = await navigator.clipboard.readText();
    const parsed = parseCss(text);
    if (!parsed.length) { flash("Nothing to import"); return; }
    setEntries(parsed);
    flash("Imported!");
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
            <AnimatedHorizontalList
              items={PRESETS}
              renderItem={(p) => <PresetButton preset={p} onClick={() => loadPreset(p)} />}
              onItemSelect={(p) => loadPreset(p)}
              itemWidth={112}
              gap={8}
              className="pt-2 pb-1"
            />
            <span className="text-xs font-semibold text-muted uppercase tracking-wider mt-3 block">Saved</span>
            <AnimatedHorizontalList
              items={slots}
              renderItem={(slot, i) => (
                <SlotButton
                  index={i}
                  slot={slot}
                  onSave={() => handleSaveSlot(i)}
                  onLoad={() => handleLoadSlot(i)}
                  onClear={() => handleClearSlot(i)}
                />
              )}
              itemWidth={112}
              gap={8}
              className="pt-2 pb-1"
              enableArrowNavigation={false}
            />
          </div>

          {/* body: color rows + presets sidebar (desktop) */}
          <div className="flex gap-6">
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {GROUPS.map((group) => {
                const groupEntries = group.keys
                  .map((k) => entries.find((e) => e.key === k))
                  .filter(Boolean) as Entry[];
                if (!groupEntries.length) return null;
                return (
                  <div key={group.label} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">{group.label}</span>
                    {groupEntries.map((entry) => (
                      <ColorRow key={entry.key} entry={entry} onChange={handleChange} />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* right: presets + slots sidebar (desktop only) */}
            <div className="hidden lg:block shrink-0 w-64">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider px-1 block mb-2">Presets</span>
              <AnimatedHorizontalList
                items={PRESETS}
                renderItem={(p) => <PresetButton preset={p} onClick={() => loadPreset(p)} />}
                onItemSelect={(p) => loadPreset(p)}
                itemWidth={112}
                gap={8}
                className="pb-1"
              />
              <span className="text-xs font-semibold text-muted uppercase tracking-wider px-1 block mt-4 mb-2">Saved</span>
              <AnimatedHorizontalList
                items={slots}
                renderItem={(slot, i) => (
                  <SlotButton
                    index={i}
                    slot={slot}
                    onSave={() => handleSaveSlot(i)}
                    onLoad={() => handleLoadSlot(i)}
                    onClear={() => handleClearSlot(i)}
                  />
                )}
                itemWidth={112}
                gap={8}
                className="pb-1"
                enableArrowNavigation={false}
              />
            </div>
          </div>

          {/* actions */}
          <div ref={actionsRef} className="flex items-center gap-3 pt-2 border-t border-border-app/30">
            <button
              onClick={save}
              className={`px-4 py-2 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100 lg:opacity-100 lg:pointer-events-auto ${actionsVisible ? "opacity-100 delay-10" : "opacity-0 pointer-events-none"}`}
              style={saveFlash ? { background: "var(--success)" } : undefined}
            >
              Save
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-bg text-fg border border-border-app/60 shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
            >
              Reset
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

      {/* Floating Save/Reset on mobile when actions bar is off-screen */}
      <div className={`lg:hidden fixed bottom-8 left-9 z-30 flex gap-2 transition-all duration-150 ${actionsVisible ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0 delay-10"}`}>
        <button
          onClick={save}
          className="px-4 py-2 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.5)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
          style={saveFlash ? { background: "var(--success)" } : undefined}
        >
          Save
        </button>
      </div>
    </div>
  );
}
