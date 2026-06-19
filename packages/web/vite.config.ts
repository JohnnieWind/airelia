import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

const sparkChatRuntime = path.resolve(__dirname, "src/features/spark/sparkChatRuntime.tsx");

export default defineConfig({
  // Tailwind v4 通过 Vite 插件接入，React 插件继续提供 JSX 与 Fast Refresh。
  plugins: [
    {
      name: "spark-chat-runtime-shim",
      enforce: "pre",
      resolveId(source, importer) {
        if (!importer?.includes("@agentscope-ai/chat/lib")) {
          return null;
        }

        return source === "./.." || source === "../.." ? sparkChatRuntime : null;
      }
    },
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: [
      // Keep accidental Spark Chat root imports away from the AGUI/CopilotKit barrel during dev pre-bundling.
      { find: /^@agentscope-ai\/chat$/, replacement: sparkChatRuntime },
      // AgentScope Spark Design publishes ESM through "module" only; the explicit alias keeps Vite/Vitest resolution stable.
      { find: /^@agentscope-ai\/design$/, replacement: "@agentscope-ai/design/lib/index.js" }
    ]
  },
  optimizeDeps: {
    exclude: ["@agentscope-ai/chat"],
    include: [
      "@agentscope-ai/chat/lib/Bubble",
      "@agentscope-ai/chat/lib/Sender",
      "@agentscope-ai/chat/lib/Welcome"
    ],
    esbuildOptions: {
      plugins: [
        {
          name: "spark-chat-runtime-shim",
          setup(build) {
            build.onResolve({ filter: /^\.{1,2}\/\.\.?$/ }, (args) => {
              if (!args.importer.includes("@agentscope-ai/chat/lib")) {
                return null;
              }

              return { path: sparkChatRuntime };
            });
          }
        }
      ]
    }
  },
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
    setupFiles: "./src/test/setup.ts",
    deps: {
      web: {
        transformCss: true
      }
    },
    server: {
      deps: {
        inline: [/@agentscope-ai\//, /@ant-design\//, /antd-style/]
      }
    }
  }
});
