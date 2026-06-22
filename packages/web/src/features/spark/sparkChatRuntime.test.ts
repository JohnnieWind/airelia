import { describe, expect, it } from "vitest";
import React from "react";

import SparkChatProvider, {
  ChatAnywhere,
  DefaultCards,
  Rag,
  SparkChatProvider as NamedSparkChatProvider,
  sleep,
  TodoList,
  WebSearch,
  uuid
} from "./sparkChatRuntime";

describe("sparkChatRuntime", () => {
  it("keeps the local Spark Chat entry compatible with ChatAnywhere imports", () => {
    expect(React.createElement(ChatAnywhere)).toEqual(expect.objectContaining({ type: ChatAnywhere }));
    expect(uuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(sleep(0)).toBeInstanceOf(Promise);
    expect(DefaultCards).toEqual(expect.any(Object));
    expect(Rag).toEqual(expect.any(Function));
    expect(TodoList).toEqual(expect.any(Function));
    expect(WebSearch).toEqual(expect.any(Function));
    expect(SparkChatProvider).toBe(NamedSparkChatProvider);
  });
});
