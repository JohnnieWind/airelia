import { describe, expect, it } from "vitest";

import { sparkChatCompat } from "./sparkChatCompat";

describe("sparkChatCompat", () => {
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
});
