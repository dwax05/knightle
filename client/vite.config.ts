import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: { "/api": "http://localhost:3500" },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes("node_modules/react") || id.includes("node_modules/react-dom")
            ? "vendor"
            : undefined,
      },
    },
  },
});
