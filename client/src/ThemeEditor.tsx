import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { applyTheme } from "./theme-apply";

const TEMPLATE = `:root {
  --bg: #282828;           
  --fg: #ebdbb2;           
  --surface: #3c3836;      
  --border: #504945;       
  --border-active: #665c54;
  --muted: #928374;        
  --tile-correct: #98971a; 
  --tile-present: #d79921; 
  --tile-absent: #504945;  
  --tile-text: #ebdbb2;    
  --success: #b8bb26;      
  --error: #fb4934;        
  --error-bg: #3c3836;     
  --success-bg: #3c3836;   
  --accent: #83a598;       
  --button-bg: #3c3836;    
  --button-fg: #ebdbb2;    
}`

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
