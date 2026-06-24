import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { applyTheme } from "./theme-apply";

const TEMPLATE = `:root {
  --bg: #1e1e2e;
  --fg: #cdd6f4;
  --surface: #313244;
  --border: #45475a;
  --muted: #928374;
  --tile-correct: #a6e3a1;
  --tile-present: #f9e2af;
  --tile-absent: #45475a;
  --tile-text: #1e1e2e;
  --success: #a6e3a1;
  --error: #f38ba8;
  --accent: #89b4fa;
  --button-bg: #313244;
  --button-fg: #cdd6f4;
}

`;

const SWATCHES = ["--tile-correct", "--tile-present", "--tile-absent", "--accent", "--error"];

export function ThemeEditor({ onClose }: { onClose: () => void }) {
  const { authedPost } = useAuth();
  const [css, setCss] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const data = await authedPost("/api/theme/get", {});
      setCss(data.css || TEMPLATE);
    })();
  }, [authedPost]);

  useEffect(() => { applyTheme(css); }, [css]);

  async function save() {
    const data = await authedPost("/api/theme/save", { css });
    setStatus(data.error ? data.error : "Saved!");
    setTimeout(() => setStatus(""), 2000);
  }

  function reset() {
    setCss("");
    applyTheme("");
    setStatus("Reset to default");
    setTimeout(() => setStatus(""), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-5 p-6 sm:p-8 rounded-2xl bg-surface border border-border-app/40">
        {/* header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-fg">Theme editor</h1>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-bg text-fg text-sm border border-border-app/60 hover:opacity-80 transition"
          >
            ← Back to game
          </button>
        </div>

        {/* editor */}
        <textarea
          value={css}
          onChange={(e) => setCss(e.target.value)}
          spellCheck={false}
          className="w-full min-h-80 p-4 rounded-xl bg-bg text-fg font-mono text-sm leading-relaxed
                     border border-border-app/60 focus:border-accent focus:outline-none
                     focus:ring-2 focus:ring-accent/30 resize-y transition"
        />

        {/* actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="px-4 py-2 rounded-lg bg-accent text-tiletext font-semibold hover:opacity-90 active:opacity-80 transition"
          >
            Save theme
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-bg text-fg border border-border-app/60 hover:opacity-80 transition"
          >
            Reset to default
          </button>
          {status && <span className="text-sm text-success font-medium">{status}</span>}
        </div>

        {/* swatch preview */}
        <div className="flex gap-3 pt-2 border-t border-border-app/30">
          {SWATCHES.map((v) => (
            <div key={v} className="flex flex-col items-center gap-1.5 pt-3">
              <div
                className="w-11 h-11 rounded-lg border border-border-app/40"
                style={{ background: `var(${v})` }}
              />
              <span className="text-[10px] text-muted">{v.replace("--", "")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
