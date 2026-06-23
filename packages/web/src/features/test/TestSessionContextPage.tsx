import { ChatAnywhere, type ChatAnywhereRef, DefaultCards, type TMessage, uuid } from "@agentscope-ai/chat";
import { useCallback, useEffect, useRef } from "react";

import {
  fetchAgentSessionContext,
  sendAgentTestMessageStream,
  type AgentSessionContextMessage,
  type AgentToolCall
} from "../../api";
import { createAgentResponseCardsFromSnapshot } from "../agent-chat/agentResponseCards";

const sessionContextUserId = "user001";
const sessionContextSessionId = "1";

function TestSessionContextPage() {
  const ref = useRef<ChatAnywhereRef>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionContext() {
      ref.current?.setLoading(true);

      try {
        const contextMessages = await fetchAgentSessionContext(sessionContextUserId, sessionContextSessionId);

        if (cancelled) {
          return;
        }

        for (const message of normalizeSessionContextMessages(contextMessages)) {
          ref.current?.updateMessage(message);
        }
      } catch (error) {
        if (!cancelled) {
          ref.current?.updateMessage({
            id: "session-context-load-error",
            role: "assistant",
            content: error instanceof Error ? error.message : "会话历史加载失败，请稍后重试。",
            msgStatus: "error"
          });
        }
      } finally {
        if (!cancelled) {
          ref.current?.setLoading(false);
        }
      }
    }

    void loadSessionContext();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = useCallback(async ({ query }: { query: string }) => {
    const message = query.trim();

    if (!message) {
      return;
    }

    const userMessage: TMessage = {
      id: uuid(),
      role: "user",
      content: message,
      msgStatus: "finished"
    };
    const assistantMessageId = uuid();
    const assistantMessage: TMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      cards: [],
      msgStatus: "generating"
    };

    ref.current?.updateMessage(userMessage);
    ref.current?.updateMessage(assistantMessage);
    ref.current?.setLoading(true);

    try {
      const finalSnapshot = await sendAgentTestMessageStream(message, {
        onUpdate(snapshot) {
          ref.current?.updateMessage({
            ...assistantMessage,
            cards: createAgentResponseCardsFromSnapshot(assistantMessageId, snapshot, "generating"),
            content: "",
            msgStatus: "generating"
          });
        }
      });
      const reply = finalSnapshot.reply.trim() || "Agent 已完成执行，但没有返回可展示文本。";

      ref.current?.updateMessage({
        ...assistantMessage,
        cards: createAgentResponseCardsFromSnapshot(assistantMessageId, finalSnapshot, "finished", reply),
        content: "",
        msgStatus: "finished"
      });
    } catch (error) {
      ref.current?.updateMessage({
        ...assistantMessage,
        content: error instanceof Error ? error.message : "Agent 调用失败，请稍后重试。",
        msgStatus: "error"
      });
    } finally {
      ref.current?.setLoading(false);
    }
  }, []);

  const onStop = useCallback(() => {
    ref.current?.setLoading(false);
  }, []);

  return (
    <div className="h-full min-h-0 flex-1 overflow-hidden bg-white" data-testid="test-page">
      <ChatAnywhere
        cardConfig={DefaultCards}
        onInput={{
          onSubmit,
          placeholder: "今天帮你做些什么？"
        }}
        onStop={onStop}
        ref={ref}
        uiConfig={{
          background: "#ffffff",
          disclaimer: "内容由AI生成，请注意甄别",
          header: <div className="px-4 py-3 text-sm font-semibold text-[#191a1d]">艾瑞莉娅Agent</div>
        }}
      />
    </div>
  );
}

function normalizeSessionContextMessages(contextMessages: AgentSessionContextMessage[]): TMessage[] {
  return contextMessages
    .filter((message) => message.name !== "__compaction_summary__")
    .flatMap((message) => normalizeSessionContextMessage(message));
}

function normalizeSessionContextMessage(message: AgentSessionContextMessage): TMessage[] {
  if (message.role === "USER") {
    const content = extractTextContent(message.content);

    return content ? [createTextMessage(message, "user", content)] : [];
  }

  if (message.role === "ASSISTANT") {
    return [createAssistantHistoryMessage(message)];
  }

  if (message.role === "TOOL") {
    return [createToolResultHistoryMessage(message)];
  }

  return [];
}

function createTextMessage(message: AgentSessionContextMessage, role: "assistant" | "user", content: string): TMessage {
  return {
    id: message.id || uuid(),
    role,
    content,
    msgStatus: "finished"
  };
}

function createAssistantHistoryMessage(message: AgentSessionContextMessage): TMessage {
  const content = extractTextContent(message.content);
  const thinkingContent = extractThinkingContent(message.content);
  const toolCalls = extractToolUseCalls(message.content);
  const cards = createAgentResponseCardsFromSnapshot(
    message.id || uuid(),
    {
      done: true,
      reply: content,
      thinking: thinkingContent,
      thinkingBlocks: thinkingContent
        ? [
            {
              id: `${message.id}:thinking`,
              content: thinkingContent,
              loading: false
            }
          ]
        : [],
      textBlocks: content ? [{ id: `${message.id}:text`, content }] : [],
      toolCalls,
      operations: [],
      operateCards: [],
      ragCards: [],
      webSearchCards: [],
      todoCards: [],
      parts: [
        ...(thinkingContent ? ([{ type: "thinking", id: `${message.id}:thinking` }] as const) : []),
        ...toolCalls.map((toolCall) => ({ type: "tool" as const, id: toolCall.id })),
        ...(content ? ([{ type: "text", id: `${message.id}:text` }] as const) : [])
      ],
      events: []
    },
    "finished",
    content
  );

  return {
    id: message.id || uuid(),
    role: "assistant",
    content: "",
    cards,
    msgStatus: "finished"
  };
}

function createToolResultHistoryMessage(message: AgentSessionContextMessage): TMessage {
  const toolCalls = extractToolResultCalls(message.content);
  const cards = createAgentResponseCardsFromSnapshot(
    message.id || uuid(),
    {
      done: true,
      reply: "",
      thinking: "",
      thinkingBlocks: [],
      textBlocks: [],
      toolCalls,
      operations: [],
      operateCards: [],
      ragCards: [],
      webSearchCards: [],
      todoCards: [],
      parts: toolCalls.map((toolCall) => ({ type: "tool" as const, id: toolCall.id })),
      events: []
    },
    "finished"
  );

  return {
    id: message.id || uuid(),
    role: "assistant",
    content: "",
    cards,
    msgStatus: "finished"
  };
}

function extractTextContent(contentBlocks: Record<string, unknown>[]): string {
  return contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => (typeof block.text === "string" ? block.text : ""))
    .join("")
    .trim();
}

function extractThinkingContent(contentBlocks: Record<string, unknown>[]): string {
  return contentBlocks
    .filter((block) => block.type === "thinking")
    .map((block) => (typeof block.thinking === "string" ? block.thinking : ""))
    .join("")
    .trim();
}

function extractToolUseCalls(contentBlocks: Record<string, unknown>[]): AgentToolCall[] {
  return contentBlocks.flatMap((block): AgentToolCall[] => {
    if (block.type !== "tool_use") {
      return [];
    }

    const id = getStringValue(block.id) || uuid();
    const name = getStringValue(block.name) || "Call Tool";

    return [
      {
        id,
        title: name,
        subTitle: id,
        input: isRecord(block.input) ? block.input : {},
        output: { status: getStringValue(block.state) || "allowed" },
        status: "done"
      }
    ];
  });
}

function extractToolResultCalls(contentBlocks: Record<string, unknown>[]): AgentToolCall[] {
  return contentBlocks.flatMap((block): AgentToolCall[] => {
    if (block.type !== "tool_result") {
      return [];
    }

    const id = getStringValue(block.id) || uuid();
    const name = getStringValue(block.name) || "Call Tool";

    return [
      {
        id,
        title: name,
        subTitle: id,
        input: {},
        output: {
          result: extractToolResultText(block.output)
        },
        status: normalizeToolResultStatus(getStringValue(block.state))
      }
    ];
  });
}

function extractToolResultText(output: unknown): string {
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .map((item) => (isRecord(item) && typeof item.text === "string" ? item.text : ""))
    .join("")
    .trim();
}

function normalizeToolResultStatus(state?: string): AgentToolCall["status"] {
  return state === "error" || state === "failed" ? "error" : "done";
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default TestSessionContextPage;
