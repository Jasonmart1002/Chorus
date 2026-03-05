import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          tauri: [
            "@tauri-apps/api/core",
            "@tauri-apps/api/event",
            "@tauri-apps/plugin-dialog",
            "@tauri-apps/plugin-notification",
          ],
          markdown: [
            "react-markdown",
            "remark-gfm",
            "react-syntax-highlighter",
          ],
          icons: ["lucide-react"],
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
