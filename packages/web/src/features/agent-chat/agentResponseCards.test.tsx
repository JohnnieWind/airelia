import { ConfigProvider, carbonTheme } from "@agentscope-ai/design";
import type { TMessage } from "@agentscope-ai/chat";
import { render, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it } from "vitest";

import { createAgentResponseCards, type AgentResponseCardMessage } from "./agentResponseCards";

describe("createAgentResponseCards", () => {
  it("hides runtime operation cards by default", () => {
    renderCards(createAgentResponseCards(createRuntimeOperationMessage()));

    expect(screen.queryByText("Agent 执行")).not.toBeInTheDocument();
    expect(screen.queryByText("模型调用")).not.toBeInTheDocument();
    expect(screen.getByText("读取文件")).toBeInTheDocument();
  });

  it("shows runtime operation cards when enabled", () => {
    renderCards(
      createAgentResponseCards({
        ...createRuntimeOperationMessage(),
        displayConfig: {
          showRuntimeOperations: true
        }
      })
    );

    expect(screen.getByText("Agent 执行")).toBeInTheDocument();
    expect(screen.getByText("模型调用")).toBeInTheDocument();
  });
});

function createRuntimeOperationMessage(): AgentResponseCardMessage {
  return {
    id: "assistant-1",
    content: "",
    status: "finished",
    operations: [
      {
        id: "agent-reply_root",
        title: "Agent 执行",
        description: "default",
        status: "done",
        rows: []
      },
      {
        id: "model-reply_model",
        title: "模型调用",
        description: "gpt-5",
        status: "done",
        rows: [{ label: "totalTokens", value: "10" }]
      }
    ],
    toolCalls: [
      {
        id: "call_1",
        title: "read_file",
        subTitle: "call_1",
        input: { path: "README.md" },
        output: { ok: true },
        status: "done"
      }
    ],
    parts: [
      { type: "operation", id: "agent-reply_root" },
      { type: "operation", id: "model-reply_model" },
      { type: "tool", id: "call_1" }
    ]
  };
}

function renderCards(cards: NonNullable<TMessage["cards"]>) {
  render(
    <ConfigProvider {...carbonTheme} prefix="spark-chat" prefixCls="spark-chat">
      <div>
        {cards.map((card) => {
          const Card = card.component as FC<{ data: unknown }>;

          return <Card key={card.id} data={card.data} />;
        })}
      </div>
    </ConfigProvider>
  );
}
