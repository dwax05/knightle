import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { applyTheme } from "./theme-apply";

const TEMPLATE = `:root {
  --bg: #1a1b26;
  --fg: #c0caf5;
  --surface: #24283b;
  --border: #414868;
  --tile-correct: #9ece6a;
  --tile-present: #e0af68;
  --tile-absent: #565f89;
  --tile-text: #1a1b26;
  --success: #9ece6a;
  --error: #f7768e;
  --accent: #7aa2f7;
  --button-bg: #24283b;
  --button-fg: #c0caf5;
}`;

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

  // live preview as they type
  useEffect(() => {
    applyTheme(css);
  }, [css]);

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
    <div style={{ maxWidth: 600, margin: "2rem auto", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Theme editor</h2>
        <button onClick={onClose}>← Back to game</button>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
        Paste your pywal <code>colors.css</code> or edit the variables below.
        Only <code>--name: value</code> pairs are applied; everything else is ignored.
      </p>

      <textarea
        value={css}
        onChange={(e) => setCss(e.target.value)}
        spellCheck={false}
        style={{
          width: "100%",
          minHeight: 320,
          fontFamily: "monospace",
          fontSize: 13,
          padding: 12,
          background: "var(--surface)",
          color: "var(--fg)",
          border: "1px solid var(--border)",
          borderRadius: 6,
        }}
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={save}>Save theme</button>
        <button onClick={reset}>Reset to default</button>
        {status && <span style={{ color: "var(--success)" }}>{status}</span>}
      </div>

      {/* swatch preview */}
      <div style={{ display: "flex", gap: 6 }}>
        {["--tile-correct", "--tile-present", "--tile-absent", "--accent", "--error"].map((v) => (
          <div key={v} style={{ textAlign: "center", fontSize: 10 }}>
            <div style={{ width: 44, height: 44, background: `var(${v})`, borderRadius: 4, border: "1px solid var(--border)" }} />
            {v.replace("--", "")}
          </div>
        ))}
      </div>
    </div>
  );
}
