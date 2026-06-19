import { defineConfig } from "vitest/config";

import { sparkChatCompat } from "./config/vite/sparkChatCompat";

export default defineConfig({
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
        inline: [/@agentscope-ai\//, /@ant-design\//, /antd-style/]
      }
    }
  }
});
