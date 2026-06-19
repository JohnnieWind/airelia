import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { sparkChatCompat } from "./config/vite/sparkChatCompat";

// https://vite.dev/config/
export default defineConfig({
  // Spark 兼容插件必须排在 React 之前，让第三方包相对导入先被重写。
  plugins: [sparkChatCompat.plugin, tailwindcss(), react()],
  resolve: {
    alias: sparkChatCompat.alias
  },
  optimizeDeps: sparkChatCompat.optimizeDeps,
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 浏览器开发模式下前端仍使用相对 /api，由 Vite 代理到 Spring Boot。
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});
