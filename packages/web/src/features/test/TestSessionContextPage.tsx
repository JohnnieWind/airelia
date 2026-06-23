import { ChatAnywhere, type ChatAnywhereRef, DefaultCards, type TMessage, uuid } from "@agentscope-ai/chat";
import { useCallback, useEffect, useRef } from "react";

import {
  fetchAgentSessionContext,
  sendAgentTestMessageStream,
  type AgentSessionContextMessage,
  type AgentStreamPart,
  type AgentTextBlock,
  type AgentThinkingBlock,
  type AgentToolCall
} from "../../api";
import { createAgentResponseCardsFromSnapshot } from "../agent-chat/agentResponseCards";

const sessionContextUserId = "WUZHENGYU458";
const sessionContextSessionId = "1";

type AssistantHistoryDraft = {
  id: string;
  thinkingBlocks: AgentThinkingBlock[];
  textBlocks: AgentTextBlock[];
  toolCalls: AgentToolCall[];
  parts: AgentStreamPart[];
};

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
  const normalizedMessages: TMessage[] = [];
  let pendingAssistant: AssistantHistoryDraft | undefined;

  const flushPendingAssistant = () => {
    if (!pendingAssistant) {
      return;
    }

    normalizedMessages.push(createAssistantHistoryMessage(pendingAssistant));
    pendingAssistant = undefined;
  };

  for (const message of contextMessages) {
    if (message.name === "__compaction_summary__") {
      continue;
    }

    if (message.role === "USER") {
      const content = extractTextContent(message.content);

      flushPendingAssistant();

      if (content) {
        normalizedMessages.push(createTextMessage(message, "user", content));
      }

      continue;
    }

    if (message.role === "ASSISTANT") {
      pendingAssistant ??= createAssistantHistoryDraft(message);
      appendAssistantHistoryBlocks(pendingAssistant, message);
      continue;
    }

    if (message.role === "TOOL") {
      pendingAssistant ??= createAssistantHistoryDraft(message);
      mergeToolResultCalls(pendingAssistant, extractToolResultCalls(message.content));
    }
  }

  flushPendingAssistant();

  return normalizedMessages;
}

function createTextMessage(message: AgentSessionContextMessage, role: "assistant" | "user", content: string): TMessage {
  return {
    id: message.id || uuid(),
    role,
    content,
    msgStatus: "finished"
  };
}

function createAssistantHistoryDraft(message: AgentSessionContextMessage): AssistantHistoryDraft {
  return {
    id: message.id || uuid(),
    thinkingBlocks: [],
    textBlocks: [],
    toolCalls: [],
    parts: []
  };
}

function createAssistantHistoryMessage(draft: AssistantHistoryDraft): TMessage {
  const content = draft.textBlocks.map((block) => block.content).join("\n\n").trim();
  const thinkingContent = draft.thinkingBlocks.map((block) => block.content).join("\n\n").trim();
  const cards = createAgentResponseCardsFromSnapshot(
    draft.id,
    {
      done: true,
      reply: content,
      thinking: thinkingContent,
      thinkingBlocks: draft.thinkingBlocks,
      textBlocks: draft.textBlocks,
      toolCalls: draft.toolCalls,
      operations: [],
      operateCards: [],
      ragCards: [],
      webSearchCards: [],
      todoCards: [],
      parts: draft.parts,
      events: []
    },
    "finished",
    content
  );

  return {
    id: draft.id,
    role: "assistant",
    content: "",
    cards,
    msgStatus: "finished"
  };
}

function appendAssistantHistoryBlocks(draft: AssistantHistoryDraft, message: AgentSessionContextMessage) {
  const messageId = message.id || uuid();
  let thinkingIndex = 0;
  let textIndex = 0;

  for (const block of message.content) {
    if (block.type === "thinking") {
      const content = typeof block.thinking === "string" ? block.thinking.trim() : "";

      if (content) {
        const thinkingBlock: AgentThinkingBlock = {
          id: `${messageId}:thinking:${thinkingIndex}`,
          content,
          loading: false
        };

        draft.thinkingBlocks.push(thinkingBlock);
        draft.parts.push({ type: "thinking", id: thinkingBlock.id });
      }

      thinkingIndex += 1;
      continue;
    }

    if (block.type === "tool_use") {
      const toolCall = createToolUseCall(block);

      if (toolCall) {
        mergeToolUseCall(draft, toolCall);
      }

      continue;
    }

    if (block.type === "text") {
      const content = typeof block.text === "string" ? block.text.trim() : "";

      if (content) {
        const textBlock: AgentTextBlock = {
          id: `${messageId}:text:${textIndex}`,
          content
        };

        draft.textBlocks.push(textBlock);
        draft.parts.push({ type: "text", id: textBlock.id });
      }

      textIndex += 1;
    }
  }
}

function createToolUseCall(block: Record<string, unknown>): AgentToolCall | undefined {
  if (block.type !== "tool_use") {
    return undefined;
  }

  const id = getStringValue(block.id) || uuid();
  const name = getStringValue(block.name) || "Call Tool";

  return {
    id,
    title: name,
    subTitle: id,
    input: isRecord(block.input) ? block.input : {},
    output: { status: getStringValue(block.state) || "allowed" },
    status: "done"
  };
}

function mergeToolUseCall(draft: AssistantHistoryDraft, toolCall: AgentToolCall) {
  const existingToolCall = draft.toolCalls.find((item) => item.id === toolCall.id);

  if (existingToolCall) {
    existingToolCall.title = toolCall.title || existingToolCall.title;
    existingToolCall.subTitle = toolCall.subTitle || existingToolCall.subTitle;
    existingToolCall.input = toolCall.input;
    return;
  }

  draft.toolCalls.push(toolCall);
  draft.parts.push({ type: "tool", id: toolCall.id });
}

function mergeToolResultCalls(draft: AssistantHistoryDraft, toolResultCalls: AgentToolCall[]) {
  for (const toolResultCall of toolResultCalls) {
    const existingToolCall = draft.toolCalls.find((toolCall) => toolCall.id === toolResultCall.id);

    if (!existingToolCall) {
      draft.toolCalls.push(toolResultCall);
      draft.parts.push({ type: "tool", id: toolResultCall.id });
      continue;
    }

    existingToolCall.title = toolResultCall.title || existingToolCall.title;
    existingToolCall.subTitle = toolResultCall.subTitle || existingToolCall.subTitle;
    existingToolCall.output = toolResultCall.output;
    existingToolCall.status = toolResultCall.status;
  }
}

function extractTextContent(contentBlocks: Record<string, unknown>[]): string {
  return contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => (typeof block.text === "string" ? block.text : ""))
    .join("")
    .trim();
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
