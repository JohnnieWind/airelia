import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // Tailwind v4 通过 Vite 插件接入，React 插件继续提供 JSX 与 Fast Refresh。
  plugins: [tailwindcss(), react()],
  server: {
    // 固定端口便于 Electron 主进程通过环境变量连接开发服务器。
    port: 5173,
    strictPort: true,
    proxy: {
      // 浏览器开发模式下把 API 请求代理到本地 Spring Boot 服务。
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  test: {
    // React Testing Library 需要浏览器式 DOM 环境。
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
