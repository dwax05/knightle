import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "./auth";
import { applyTheme, applyThemeAnimated } from "./theme-apply";
import { IconArrowLeft } from "./icons";
import { AnimatedHorizontalList } from "./AnimatedHorizontalList";
import { TabBar } from "./TabBar";

const PREVIEW_ROWS: { word: string; marks: ("correct" | "present" | "absent")[] }[] = [
  { word: "CRANE", marks: ["absent", "absent", "absent", "present", "present"] },
  { word: "KNELT", marks: ["correct", "absent", "correct", "present", "absent"] },
  { word: "KNEEL", marks: ["correct", "correct", "correct", "correct", "correct"] },
];
const TILE_COLOR: Record<string, string> = {
  correct: "var(--tile-correct)",
  present: "var(--tile-present)",
  absent: "var(--tile-absent)",
};

function BoardPreview() {
  return (
    <div className="flex flex-col gap-2 items-center py-2">
      {PREVIEW_ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-2">
          {row.word.split("").map((letter, ci) => (
            <div
              key={ci}
              className="w-16 h-16 flex items-center justify-center rounded font-bold text-base"
              style={{ background: TILE_COLOR[row.marks[ci]], color: "var(--tile-text)" }}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: 5 }).map((_, ci) => (
            <div
              key={ci}
              className="w-16 h-16 rounded border"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

import { PRESETS, getDefaultPresetCss, type Preset } from "./presets";

type Entry = { key: string; value: string };

const TEMPLATE = getDefaultPresetCss();

const SWATCH_KEYS = ["--bg", "--accent", "--tile-correct", "--tile-present", "--error"];
const SLOT_COUNT = 3;
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
    const value = m[2].trim().replace(/\s*!important\s*$/, "");
    entries.push({ key: m[1].trim(), value });
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
  onDraftChange,
  resetKey,
}: {
  entry: Entry;
  onChange: (key: string, value: string) => void;
  onDraftChange: (key: string, valid: boolean) => void;
  resetKey: number;
}) {
  const [draft, setDraft] = useState(entry.value);

  useEffect(() => {
    setDraft(entry.value);
    onDraftChange(entry.key, true);
  }, [entry.value, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftValid = isValidHex(draft);
  const resolvedBg = draftValid ? draft : (isValidHex(entry.value) ? entry.value : "#313244");
  const textColor = contrastColor(resolvedBg);

  function handleText(v: string) {
    setDraft(v);
    const valid = isValidHex(v);
    if (valid) onChange(entry.key, v);
    onDraftChange(entry.key, valid);
  }

  function handlePicker(v: string) {
    setDraft(v);
    onChange(entry.key, v);
    onDraftChange(entry.key, true);
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
        className="w-28 px-3 py-1.5 rounded-lg font-mono text-sm border focus:outline-none focus:ring-2 transition"
        style={draftValid
          ? { background: resolvedBg, color: textColor, borderColor: resolvedBg }
          : { background: "var(--surface)", color: "var(--error)", borderColor: "var(--error)" }
        }
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

type SidebarTab = "themes" | "preview";

function SidebarCard({
  slots,
  onLoadPreset,
  onSaveSlot,
  onLoadSlot,
  onClearSlot,
}: {
  slots: (Record<string, string> | null)[];
  onLoadPreset: (p: Preset) => void;
  onSaveSlot: (i: number) => void;
  onLoadSlot: (i: number) => void;
  onClearSlot: (i: number) => void;
}) {
  const [tab, setTab] = useState<SidebarTab>("themes");

  return (
    <div className="hidden lg:flex flex-col shrink-0 w-96 bg-surface border border-border-app/30 rounded-2xl p-4 gap-3">
      <TabBar
        layoutId="theme-editor-tabs"
        tabs={[
          { value: "themes" as SidebarTab, label: "Themes" },
          { value: "preview" as SidebarTab, label: "Preview" },
        ]}
        value={tab}
        onChange={(v) => setTab(v)}
      />

      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
      {tab === "themes" ? (
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider px-1 block mb-2">Presets</span>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p, i) => (
                <PresetButton key={i} preset={p} onClick={() => onLoadPreset(p)} />
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider px-1 block mb-2">Saved</span>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot, i) => (
                <SlotButton
                  key={i}
                  index={i}
                  slot={slot}
                  onSave={() => onSaveSlot(i)}
                  onLoad={() => onLoadSlot(i)}
                  onClear={() => onClearSlot(i)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <BoardPreview />
      )}
      </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ThemeEditor({ onClose }: { onClose: () => void }) {
  const { authedPost } = useAuth();
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const cached = localStorage.getItem("cache:theme:v2");
      if (cached) {
        const parsed = parseCss(cached);
        if (parsed.length) return parsed;
      }
    } catch { /* storage unavailable */ }
    return parseCss(TEMPLATE);
  });
  const [savedCss, setSavedCss] = useState(() => {
    try { return localStorage.getItem("cache:theme:v2") ?? ""; } catch { return ""; }
  });
  const [status, setStatus] = useState<{ msg: string; error: boolean } | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const animateNextApply = useRef(false);
  const [actionsVisible, setActionsVisible] = useState(true);
  const [saveFlash, setSaveFlash] = useState(false);
  const [saveErrorFlash, setSaveErrorFlash] = useState(false);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActionsVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [slots, setSlots] = useState<(Record<string, string> | null)[]>(EMPTY_SLOTS);

  function flash(msg: string, error = false) {
    setStatus({ msg, error });
    setTimeout(() => setStatus(null), 2000);
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

  const [invalidDrafts, setInvalidDrafts] = useState<Set<string>>(new Set());
  const [draftResetKey, setDraftResetKey] = useState(0);

  function handleDraftChange(key: string, valid: boolean) {
    setInvalidDrafts((prev) => {
      if (valid === !prev.has(key)) return prev;
      const next = new Set(prev);
      valid ? next.delete(key) : next.add(key);
      return next;
    });
  }

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
    applyTheme(savedCss);
    onClose();
  }

  async function save() {
    if (invalidDrafts.size > 0) {
      setSaveErrorFlash(true);
      setTimeout(() => setSaveErrorFlash(false), 300);
      return;
    }
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 150);
    const css = serializeCss(entries);
    const data = await authedPost("/api/theme/save", { css });
    if (data.error) flash(data.error, true);
    else setSavedCss(css);
  }

  function reset() {
    animateNextApply.current = true;
    setEntries(parseCss(TEMPLATE));
    setDraftResetKey((k) => k + 1);
  }

  async function exportToClipboard() {
    await navigator.clipboard.writeText(serializeCss(entries));
    flash("Copied to clipboard!");
  }

  async function importFromClipboard() {
    const text = await navigator.clipboard.readText();
    const parsed = parseCss(text);
    if (!parsed.length) { flash("Nothing to import", true); return; }
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
                      <ColorRow key={entry.key} entry={entry} onChange={handleChange} onDraftChange={handleDraftChange} resetKey={draftResetKey} />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* right: tabbed card (desktop only) */}
            <SidebarCard
              slots={slots}
              onLoadPreset={loadPreset}
              onSaveSlot={handleSaveSlot}
              onLoadSlot={handleLoadSlot}
              onClearSlot={handleClearSlot}
            />
          </div>

          {/* actions */}
          <div ref={actionsRef} className="flex items-center gap-3 pt-2 border-t border-border-app/30">
            <button
              onClick={save}
              className={`px-4 py-2 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100 lg:opacity-100 lg:pointer-events-auto ${actionsVisible ? "opacity-100 delay-10" : "opacity-0 pointer-events-none"}`}
              style={saveFlash ? { background: "var(--success)" } : saveErrorFlash ? { background: "var(--error)" } : undefined}
            >
              Save
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-bg text-fg border border-border-app/60 shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none transition-all duration-100"
            >
              Reset
            </button>
            {status && <span className={`text-sm font-medium ${status.error ? "text-error" : "text-success"}`}>{status.msg}</span>}
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
          style={saveFlash ? { background: "var(--success)" } : saveErrorFlash ? { background: "var(--error)" } : undefined}
        >
          Save
        </button>
      </div>
    </div>
  );
}
