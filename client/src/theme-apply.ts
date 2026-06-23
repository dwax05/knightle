// Pull only valid CSS custom-property declarations out of arbitrary input.
export function sanitizeThemeCss(raw: string): string {
  const decls: string[] = [];
  // match: --some-name : value   (value = anything up to ; or })
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    const name = m[1];
    const value = m[2].trim();

    // reject values containing anything script-ish or fetch-ish
    if (/url\s*\(|expression|javascript:|@import|<|>/i.test(value)) continue;
    if (value.length > 200) continue;

    decls.push(`  ${name}: ${value};`);
  }

  if (decls.length === 0) return "";
  return `:root {\n${decls.join("\n")}\n}`;
}

// Inject (or replace) the user's theme as a <style> tag in <head>.
export function applyTheme(raw: string) {
  const clean = sanitizeThemeCss(raw);
  let tag = document.getElementById("user-theme") as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "user-theme";
    document.head.appendChild(tag);
  }
  tag.textContent = clean;
}
