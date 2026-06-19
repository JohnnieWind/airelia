import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(configDir, "../..");
const sparkChatActionButton = path.resolve(webRoot, "src/features/spark/sparkChatActionButton.tsx");
const sparkChatRuntime = path.resolve(webRoot, "src/features/spark/sparkChatRuntime.tsx");
const sparkDesignRuntime = path.resolve(webRoot, "src/features/spark/sparkDesignRuntime.tsx");

function isSparkChatActionButtonImport(source: string, importer?: string): boolean {
  return Boolean(
    importer?.includes("@agentscope-ai/chat/lib/Sender/components") &&
      (source === "./ActionButton" || source === "../ActionButton")
  ) || Boolean(
    importer?.includes("@agentscope-ai/chat/lib/Sender/index") &&
      source === "./components/ActionButton"
  );
}

function isSparkChatParentImport(source: string, importer?: string): boolean {
  return Boolean(
    importer?.includes("@agentscope-ai/chat/lib") && (source === "./.." || source === "../..")
  );
}

function sparkChatRuntimePlugin() {
  return {
    name: "spark-chat-runtime-shim",
    enforce: "pre" as const,
    resolveId(source: string, importer?: string) {
      if (isSparkChatActionButtonImport(source, importer)) {
        return sparkChatActionButton;
      }

      return isSparkChatParentImport(source, importer) ? sparkChatRuntime : null;
    }
  };
}

function sparkChatOptimizeDeps() {
  return {
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
    { find: /^@agentscope-ai\/chat$/, replacement: sparkChatRuntime },
    { find: /^@agentscope-ai\/design$/, replacement: sparkDesignRuntime }
  ],
  optimizeDeps: sparkChatOptimizeDeps(),
  plugin: sparkChatRuntimePlugin()
};
