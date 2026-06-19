import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(configDir, "../..");
const sparkChatActionButton = path.resolve(webRoot, "src/features/spark/sparkChatActionButton.tsx");
const sparkChatRuntime = path.resolve(webRoot, "src/features/spark/sparkChatRuntime.tsx");
const sparkDesignRuntime = path.resolve(webRoot, "src/features/spark/sparkDesignRuntime.tsx");

function isSparkChatActionButtonImport(source: string, importer?: string): boolean {
  // Chat Sender 内部有三种相对路径会触达原始 ActionButton，需要全部重定向到本地 ref 兼容版。
  return Boolean(
    importer?.includes("@agentscope-ai/chat/lib/Sender/components") &&
      (source === "./ActionButton" || source === "../ActionButton")
  ) || Boolean(
    importer?.includes("@agentscope-ai/chat/lib/Sender/index") &&
      source === "./components/ActionButton"
  );
}

function isSparkChatParentImport(source: string, importer?: string): boolean {
  // Bubble 等子模块会用 "./.." 读取 chat 入口；这里改到最小运行时，避开 AGUI/Copilot 入口问题。
  return Boolean(
    importer?.includes("@agentscope-ai/chat/lib") && (source === "./.." || source === "../..")
  );
}

function sparkChatRuntimePlugin() {
  return {
    name: "spark-chat-runtime-shim",
    enforce: "pre" as const,
    resolveId(source: string, importer?: string) {
      // Vite 和 Vitest 都复用这个插件，确保开发、测试、构建解析一致。
      if (isSparkChatActionButtonImport(source, importer)) {
        return sparkChatActionButton;
      }

      return isSparkChatParentImport(source, importer) ? sparkChatRuntime : null;
    }
  };
}

function sparkChatOptimizeDeps() {
  return {
    // Chat 顶层入口依赖 AGUI/Copilot 导出，预构建时只包含当前页面实际用到的子组件。
    exclude: ["@agentscope-ai/chat"],
    include: [
      "@agentscope-ai/chat/lib/Bubble",
      "@agentscope-ai/chat/lib/Sender",
      "@agentscope-ai/chat/lib/Welcome"
    ],
    rolldownOptions: {
      plugins: [sparkChatRuntimePlugin()]
    }
  };
}

export const sparkChatCompat = {
  alias: [
    // 裸包导入统一走本地 runtime，避免 @agentscope-ai/design 整包副作用。
    { find: /^@agentscope-ai\/chat$/, replacement: sparkChatRuntime },
    { find: /^@agentscope-ai\/design$/, replacement: sparkDesignRuntime }
  ],
  optimizeDeps: sparkChatOptimizeDeps(),
  plugin: sparkChatRuntimePlugin()
};
