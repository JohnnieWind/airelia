import { Bubble, OperateCard, Sender as ChatInput } from "@agentscope-ai/chat";
import { ConfigProvider, carbonTheme } from "@agentscope-ai/design";
import { Bot, UserRound } from "lucide-react";
import { type ReactElement, type ReactNode, useMemo, useState } from "react";

import {
  sendAgentTestMessageStream,
  type AgentOperationCard,
  type AgentRagCard,
  type AgentThinkingBlock,
  type AgentStreamPart,
  type AgentTextBlock,
  type AgentTodoCard,
  type AgentToolCall,
  type AgentWebSearchCard
} from "../../api";
import { createAgentResponseCards, OperationIcon } from "./agentResponseCards";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  status?: "error" | "finished" | "generating";
  thinking?: string;
  thinkingBlocks?: AgentThinkingBlock[];
  textBlocks?: AgentTextBlock[];
  toolCalls?: AgentToolCall[];
  operations?: AgentOperationCard[];
  operateCards?: AgentOperationCard[];
  ragCards?: AgentRagCard[];
  webSearchCards?: AgentWebSearchCard[];
  todoCards?: AgentTodoCard[];
  parts?: AgentStreamPart[];
};

type OperationState = {
  id: string;
  input: string;
  status: "idle" | "running" | "done" | "error";
  detail: string;
};

const initialAssistantMessage: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content: "你好，我是 Airelia 助理。可以直接让我查看目录、分析项目或执行本地 Agent 任务。",
  status: "finished"
};

const initialOperation: OperationState = {
  id: "initial-operation",
  input: "POST /api/agent/test",
  status: "idle",
  detail: "等待输入"
};

const ChatBeforeUIContainer = (
  ChatInput as typeof ChatInput & {
    BeforeUIContainer: (props: { leftChildren?: ReactNode; rightChildren?: ReactNode }) => ReactElement;
  }
).BeforeUIContainer;

function AgentChatPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [operation, setOperation] = useState<OperationState>(initialOperation);

  const bubbleItems = useMemo(
    () =>
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: "",
        cards: message.role === "assistant" ? createAgentResponseCards(message) : undefined,
        msgStatus: message.status ?? "finished",
        avatar:
          message.role === "assistant"
            ? {
                children: <Bot className="h-4 w-4" />,
                style: { background: "#191a1d", color: "#ffffff" }
              }
            : {
                children: <UserRound className="h-4 w-4" />,
                style: { background: "#dff7ef", color: "#191a1d" }
              }
      })),
    [messages]
  );

  async function handleSubmit(value: string) {
    const message = value.trim();

    if (!message || loading) {
      return;
    }

    const operationId = `operation-${Date.now()}`;
    setInput("");
    setLoading(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${operationId}`,
        role: "user",
        content: message,
        status: "finished"
      },
      {
        id: `assistant-${operationId}`,
        role: "assistant",
        content: "",
        status: "generating"
      }
    ]);
    setOperation({
      id: operationId,
      input: message,
      status: "running",
      detail: "正在调用本地测试 Agent"
    });

    try {
      const assistantMessageId = `assistant-${operationId}`;
      const finalSnapshot = await sendAgentTestMessageStream(message, {
        onUpdate(snapshot) {
          setMessages((currentMessages) =>
            currentMessages.map((currentMessage) =>
              currentMessage.id === assistantMessageId
                ? {
                    ...currentMessage,
                    content: snapshot.reply,
                    status: "generating",
                    thinking: snapshot.thinking,
                    thinkingBlocks: snapshot.thinkingBlocks,
                    textBlocks: snapshot.textBlocks,
                    toolCalls: snapshot.toolCalls,
                    operations: snapshot.operations,
                    operateCards: snapshot.operateCards,
                    ragCards: snapshot.ragCards,
                    webSearchCards: snapshot.webSearchCards,
                    todoCards: snapshot.todoCards,
                    parts: snapshot.parts
                  }
                : currentMessage
            )
          );
        }
      });
      const reply = finalSnapshot.reply.trim() || "Agent 已完成执行，但没有返回可展示文本。";

      setOperation({
        id: operationId,
        input: message,
        status: "done",
        detail: "完成"
      });
      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === assistantMessageId
            ? {
                ...currentMessage,
                content: reply,
                status: "finished",
                thinking: finalSnapshot.thinking,
                thinkingBlocks: finalSnapshot.thinkingBlocks,
                textBlocks: finalSnapshot.textBlocks,
                toolCalls: finalSnapshot.toolCalls,
                operations: finalSnapshot.operations,
                operateCards: finalSnapshot.operateCards,
                ragCards: finalSnapshot.ragCards,
                webSearchCards: finalSnapshot.webSearchCards,
                todoCards: finalSnapshot.todoCards,
                parts: finalSnapshot.parts
              }
            : currentMessage
        )
      );
    } catch (error) {
      setOperation({
        id: operationId,
        input: message,
        status: "error",
        detail: "调用失败"
      });
      setMessages((currentMessages) => [
        ...currentMessages.filter((currentMessage) => currentMessage.id !== `assistant-${operationId}`),
        {
          id: `assistant-error-${operationId}`,
          role: "assistant",
          content: error instanceof Error ? error.message : "Agent 调用失败，请稍后重试。",
          status: "error"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfigProvider {...carbonTheme} prefix="spark-chat" prefixCls="spark-chat">
      <section
        aria-labelledby="assistant-chat-title"
        className="mx-auto flex h-full min-h-0 w-full max-w-[980px] flex-1 flex-col pb-3 pt-4"
      >
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#e6e7e5] bg-white px-3 py-1 text-xs font-bold text-[#55565a]">
              <Bot className="h-3.5 w-3.5" />
              Spark Design Chat
            </div>
            <h1 id="assistant-chat-title" className="text-[clamp(24px,3vw,34px)] font-extrabold leading-tight tracking-normal">
              助理对话
            </h1>
          </div>
          <div className="rounded-full border border-[#dff0e9] bg-[#f2fbf7] px-3 py-1 text-xs font-bold text-[#16845f]">
            sessionId 1 · user001
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_286px]">
          <div
            className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#e5e5e2] bg-white"
            data-testid="agent-chat-panel"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fafafa]" data-testid="agent-chat-scroll-region">
              <Bubble.List
                id="agent-chat-scroll-list"
                items={bubbleItems}
                classNames={{
                  wrapper: "h-full min-h-0 max-h-full flex-1 overflow-y-auto bg-[#fafafa]",
                  list: "px-4 py-5"
                }}
                style={{ minHeight: 0 }}
              />
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-[#ececea] bg-white px-4 py-3" data-testid="agent-chat-composer">
              <ChatBeforeUIContainer
                leftChildren={<span>测试专家</span>}
                rightChildren={<span>{loading ? "执行中" : "Enter 发送"}</span>}
              />
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                loading={loading}
                placeholder="今天想让助理做什么？"
                initialRows={2}
                submitType="enter"
              />
            </div>
          </div>

          <aside className="grid content-start gap-3">
            <OperateCard
              key={operation.id}
              header={{
                icon: <OperationIcon status={operation.status} />,
                title: operation.detail,
                description: operation.input
              }}
              body={{
                defaultOpen: operation.status !== "idle",
                children: (
                  <OperateCard.LineBody>
                    <div className="ml-4 grid gap-1.5 text-xs text-[#5c5d62]">
                      <span>sessionId: 1</span>
                      <span>userId: user001</span>
                      <span>message: {operation.input}</span>
                    </div>
                  </OperateCard.LineBody>
                )
              }}
            />
          </aside>
        </div>
      </section>
    </ConfigProvider>
  );
}

export default AgentChatPage;
