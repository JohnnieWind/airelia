import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(configDir, "../..");
const sparkChatActionButton = path.resolve(webRoot, "src/features/spark/sparkChatActionButton.tsx");
const sparkChatRuntime = path.resolve(webRoot, "src/features/spark/sparkChatRuntime.tsx");
const sparkDesignRuntime = path.resolve(webRoot, "src/features/spark/sparkDesignRuntime.tsx");
const htmlReactParserEsm = path.resolve(webRoot, "../../node_modules/html-react-parser/esm/index.mjs");
const nodeModulesRoot = path.resolve(webRoot, "../../node_modules");
const sparkChatLibMarker = "/@agentscope-ai/chat/lib";
const cjsUtilDeepImportPattern = /^(@?rc-(?:component\/)?util)\/lib\/(.+)$/;

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

function isSparkChatParentRuntimeImport(source: string, importer?: string): boolean {
  if (!importer || !source.startsWith(".")) {
    return false;
  }

  const normalizedImporter = importer.replaceAll("\\", "/");
  const markerIndex = normalizedImporter.indexOf(sparkChatLibMarker);

  if (markerIndex === -1) {
    return false;
  }

  const importerPathInChatLib = normalizedImporter.slice(markerIndex + sparkChatLibMarker.length).replace(/^\/+/, "");
  const importerDir = path.posix.dirname(importerPathInChatLib);
  const resolvedPath = path.posix.normalize(path.posix.join(importerDir, source));

  return resolvedPath === "." || resolvedPath === "";
}

function resolveUtilEsmDeepImport(source: string): string | null {
  const match = source.match(cjsUtilDeepImportPattern);

  if (!match) {
    return null;
  }

  const [, packageName, subpath] = match;

  return path.resolve(nodeModulesRoot, packageName, "es", `${subpath.replace(/\.js$/, "")}.js`);
}

function sparkChatRuntimePlugin() {
  return {
    name: "spark-chat-runtime-compat",
    enforce: "pre" as const,
    resolveId(source: string, importer?: string) {
      // Vite 和 Vitest 都复用这个插件，确保开发、测试、构建解析一致。
      const utilEsmDeepImport = resolveUtilEsmDeepImport(source);

      if (utilEsmDeepImport) {
        return utilEsmDeepImport;
      }

      if (isSparkChatActionButtonImport(source, importer)) {
        return sparkChatActionButton;
      }

      if (isSparkChatParentRuntimeImport(source, importer)) {
        return sparkChatRuntime;
      }

      return null;
    }
  };
}

function sparkChatOptimizeDeps() {
  return {
    exclude: ["@agentscope-ai/chat"],
    include: [
      "@agentscope-ai/chat/lib/Bubble",
      "@agentscope-ai/chat/lib/ChatAnywhere",
      "@agentscope-ai/chat/lib/Markdown",
      "@agentscope-ai/chat/lib/OperateCard",
      "@agentscope-ai/chat/lib/Sender",
      "@agentscope-ai/chat/lib/Welcome",
      "prop-types",
      "prop-types/checkPropTypes",
      "rc-util",
      "react-is",
      "react-transition-group",
      "scheduler"
    ],
    rolldownOptions: {
      plugins: [sparkChatRuntimePlugin()]
    }
  };
}

export const sparkChatCompat = {
  alias: [
    { find: /^@agentscope-ai\/chat$/, replacement: sparkChatRuntime },
    { find: /^@agentscope-ai\/design$/, replacement: sparkDesignRuntime },
    { find: /^html-react-parser$/, replacement: htmlReactParserEsm }
  ],
  optimizeDeps: sparkChatOptimizeDeps(),
  plugin: sparkChatRuntimePlugin()
};
