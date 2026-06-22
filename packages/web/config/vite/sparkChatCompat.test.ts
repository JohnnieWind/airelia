import { describe, expect, it } from "vitest";

import { sparkChatCompat } from "./sparkChatCompat";

describe("sparkChatCompat", () => {
  // 这些测试锁定第三方包解析边界，避免升级 Vite 或 AgentScope 后警告回流。
  it("routes bare Spark Chat imports through the runtime adapter", () => {
    const chatAlias = sparkChatCompat.alias.find(({ find }) => find.toString().includes("@agentscope-ai\\/chat"));

    expect(chatAlias?.replacement).toMatch(/src[/\\]features[/\\]spark[/\\]sparkChatRuntime\.tsx$/);
    expect(sparkChatCompat.optimizeDeps.exclude).toContain("@agentscope-ai/chat");
  });

  it("routes bare Spark Design imports through the narrow runtime shim", () => {
    const designAlias = sparkChatCompat.alias.find(({ find }) => find.toString().includes("@agentscope-ai\\/design"));

    expect(designAlias?.replacement).toMatch(/src[/\\]features[/\\]spark[/\\]sparkDesignRuntime\.tsx$/);
  });

  it("routes Spark Chat action buttons through the ref-compatible shim", () => {
    const resolvedId = sparkChatCompat.plugin.resolveId(
      "./ActionButton",
      "/workspace/node_modules/@agentscope-ai/chat/lib/Sender/components/SendButton.js"
    );

    expect(resolvedId).toMatch(/src[/\\]features[/\\]spark[/\\]sparkChatActionButton\.tsx$/);
  });

  it("routes Spark Chat sender context imports through the ref-compatible shim", () => {
    const resolvedId = sparkChatCompat.plugin.resolveId(
      "./components/ActionButton",
      "/workspace/node_modules/@agentscope-ai/chat/lib/Sender/index.js"
    );

    expect(resolvedId).toMatch(/src[/\\]features[/\\]spark[/\\]sparkChatActionButton\.tsx$/);
  });

  it("routes deep Spark Chat parent imports through the runtime adapter", () => {
    const resolvedId = sparkChatCompat.plugin.resolveId(
      "../../..",
      "/workspace/node_modules/@agentscope-ai/chat/lib/Markdown/Markdown/defaultComponents/CodeBlock.js"
    );

    expect(resolvedId).toMatch(/src[/\\]features[/\\]spark[/\\]sparkChatRuntime\.tsx$/);
  });

  it("routes rc-util CommonJS deep imports to their ESM files", () => {
    const resolvedId = sparkChatCompat.plugin.resolveId(
      "rc-util/lib/pickAttrs",
      "/workspace/node_modules/@agentscope-ai/chat/lib/Conversations/Item.js"
    );

    expect(resolvedId).toMatch(/node_modules[/\\]rc-util[/\\]es[/\\]pickAttrs\.js$/);
  });

  it("routes @rc-component/util CommonJS deep imports to their ESM files", () => {
    const resolvedId = sparkChatCompat.plugin.resolveId(
      "@rc-component/util/lib/hooks/useMergedState",
      "/workspace/node_modules/@agentscope-ai/design/lib/components/commonComponents/Tabs/index.js"
    );

    expect(resolvedId).toMatch(/node_modules[/\\]@rc-component[/\\]util[/\\]es[/\\]hooks[/\\]useMergedState\.js$/);
  });

  it("routes html-react-parser to the ESM entry for browser dev", () => {
    const htmlParserAlias = sparkChatCompat.alias.find(({ find }) => find.toString().includes("html-react-parser"));

    expect(htmlParserAlias?.replacement).toMatch(/node_modules[/\\]html-react-parser[/\\]esm[/\\]index\.mjs$/);
  });

  it("pre-bundles CommonJS dependencies imported by Spark Chat ESM modules", () => {
    expect(sparkChatCompat.optimizeDeps.include).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });
});
