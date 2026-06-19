import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { sparkChatCompat } from "./config/vite/sparkChatCompat";

// https://vite.dev/config/
export default defineConfig({
  plugins: [sparkChatCompat.plugin, tailwindcss(), react()],
  resolve: {
    alias: sparkChatCompat.alias
  },
  optimizeDeps: sparkChatCompat.optimizeDeps,
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});
