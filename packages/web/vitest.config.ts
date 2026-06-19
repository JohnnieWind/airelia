import { defineConfig } from "vitest/config";

import { sparkChatCompat } from "./config/vite/sparkChatCompat";

export default defineConfig({
  // 测试环境复用 Vite 的 Spark 兼容解析，防止测试通过但开发启动报警。
  plugins: [sparkChatCompat.plugin],
  resolve: {
    alias: sparkChatCompat.alias
  },
  optimizeDeps: sparkChatCompat.optimizeDeps,
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    deps: {
      web: {
        transformCss: true
      }
    },
    server: {
      deps: {
        // AgentScope/AntD 依赖包含 CSS-in-JS 和 ESM 代码，测试时需要内联转换。
        inline: [/@agentscope-ai\//, /@ant-design\//, /antd-style/]
      }
    }
  }
});
