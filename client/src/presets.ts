export type Preset = { name: string; vars: Record<string, string> };

// Change this to any preset name below to update the application default.
// Then run `npm run gen-theme` to regenerate theme.css.
export const DEFAULT_PRESET_NAME = "UCF Knights";

export const PRESETS: Preset[] = [
  // Purple / moody darks
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
  // Blue / cool darks
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
  // Warm / earthy darks
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
    name: "Kanagawa",
    vars: {
      "--bg": "#1f1f28", "--fg": "#dcd7ba", "--surface": "#2a2a37",
      "--border": "#54546d", "--muted": "#727169",
      "--tile-correct": "#76946a", "--tile-present": "#dca561", "--tile-absent": "#54546d",
      "--tile-text": "#dcd7ba", "--success": "#76946a", "--error": "#c34043",
      "--accent": "#7e9cd8", "--button-bg": "#2a2a37", "--button-fg": "#dcd7ba",
    },
  },
  // Solarized pair + light theme
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
    name: "Catppuccin Latte",
    vars: {
      "--bg": "#eff1f5", "--fg": "#4c4f69", "--surface": "#e6e9ef",
      "--border": "#ccd0da", "--muted": "#9ca0b0",
      "--tile-correct": "#40a02b", "--tile-present": "#df8e1d", "--tile-absent": "#ccd0da",
      "--tile-text": "#eff1f5", "--success": "#40a02b", "--error": "#d20f39",
      "--accent": "#1e66f5", "--button-bg": "#e6e9ef", "--button-fg": "#4c4f69",
    },
  },
  // Slate / terminal / special
  {
    name: "Ayu Mirage",
    vars: {
      "--bg": "#1f2430", "--fg": "#cbccc6", "--surface": "#242936",
      "--border": "#343f4c", "--muted": "#707a8c",
      "--tile-correct": "#a6cc70", "--tile-present": "#ffd173", "--tile-absent": "#343f4c",
      "--tile-text": "#1f2430", "--success": "#a6cc70", "--error": "#ff6666",
      "--accent": "#5ccfe6", "--button-bg": "#242936", "--button-fg": "#cbccc6",
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
    name: "UCF Knights",
    vars: {
      "--bg": "#0d0d0d", "--fg": "#ffffff", "--surface": "#1a1800",
      "--border": "#2e2900", "--muted": "#9a9080",
      "--tile-correct": "#ffffff", "--tile-present": "#ffc904", "--tile-absent": "#767676",
      "--tile-text": "#000000", "--success": "#ffc904", "--error": "#ff4444",
      "--accent": "#ffc904", "--button-bg": "#1a1800", "--button-fg": "#ffc904",
    },
  },
];

export function serializePresetCss(vars: Record<string, string>): string {
  const body = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  return `:root {\n${body}\n}\n`;
}

export function getDefaultPresetCss(): string {
  const preset = PRESETS.find((p) => p.name === DEFAULT_PRESET_NAME) ?? PRESETS[0];
  return serializePresetCss(preset.vars);
}
