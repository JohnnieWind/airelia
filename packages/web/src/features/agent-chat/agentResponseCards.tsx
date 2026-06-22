import { Markdown, OperateCard, Rag, Thinking, TodoList, ToolCall, WebSearch } from "@agentscope-ai/chat";
import type { TMessage } from "@agentscope-ai/chat";
import { CheckCircle2, Clock3, TerminalSquare, XCircle } from "lucide-react";
import type { FC } from "react";

import type {
  AgentOperationCard,
  AgentRagCard,
  AgentStreamSnapshot,
  AgentTodoCard,
  AgentToolCall,
  AgentWebSearchCard
} from "../../api";

export type AgentResponseCardStatus = NonNullable<TMessage["msgStatus"]>;

export type AgentResponseCardMessage = {
  id: string;
  content: string;
  status?: AgentResponseCardStatus;
  thinking?: string;
  toolCalls?: AgentToolCall[];
  operations?: AgentOperationCard[];
  operateCards?: AgentOperationCard[];
  ragCards?: AgentRagCard[];
  webSearchCards?: AgentWebSearchCard[];
  todoCards?: AgentTodoCard[];
};

type AgentResponseCards = NonNullable<TMessage["cards"]>;
type OperationStatus = "idle" | "running" | "done" | "error";

type ThinkingCardData = {
  content: string;
};

type ToolCallCardData = AgentToolCall;

type OperationCardData = AgentOperationCard;

type RagCardData = AgentRagCard;

type WebSearchCardData = AgentWebSearchCard;

type TodoCardData = AgentTodoCard;

type MarkdownCardData = {
  content: string;
  generating: boolean;
};

export function createAgentResponseCards(message: AgentResponseCardMessage): AgentResponseCards {
  const cards: AgentResponseCards = [];

  if (message.thinking?.trim()) {
    cards.push({
      code: "Thinking",
      id: `${message.id}-thinking`,
      data: {
        content: message.thinking
      } satisfies ThinkingCardData,
      component: ThinkingCard as FC
    });
  }

  for (const operation of message.operations ?? []) {
    cards.push({
      code: "OperateCard",
      id: `${message.id}-${operation.id}`,
      data: operation satisfies OperationCardData,
      component: OperationCard as FC
    });
  }

  for (const toolCall of message.toolCalls ?? []) {
    cards.push({
      code: "ToolCall",
      id: `${message.id}-${toolCall.id}`,
      data: toolCall satisfies ToolCallCardData,
      component: ToolCallCard as FC
    });
  }

  for (const operateCard of message.operateCards ?? []) {
    cards.push({
      code: "OperateCard",
      id: `${message.id}-${operateCard.id}`,
      data: operateCard satisfies OperationCardData,
      component: OperationCard as FC
    });
  }

  for (const ragCard of message.ragCards ?? []) {
    cards.push({
      code: "Rag",
      id: `${message.id}-${ragCard.id}`,
      data: ragCard satisfies RagCardData,
      component: RagCard as FC
    });
  }

  for (const webSearchCard of message.webSearchCards ?? []) {
    cards.push({
      code: "WebSearch",
      id: `${message.id}-${webSearchCard.id}`,
      data: webSearchCard satisfies WebSearchCardData,
      component: WebSearchCard as FC
    });
  }

  for (const todoCard of message.todoCards ?? []) {
    cards.push({
      code: "TodoList",
      id: `${message.id}-${todoCard.id}`,
      data: todoCard satisfies TodoCardData,
      component: TodoCard as FC
    });
  }

  if (message.content || message.status === "generating") {
    cards.push({
      code: "Text",
      id: `${message.id}-markdown`,
      data: {
        content: message.content,
        generating: message.status === "generating"
      } satisfies MarkdownCardData,
      component: MarkdownCard as FC
    });
  }

  return cards;
}

export function createAgentResponseCardsFromSnapshot(
  messageId: string,
  snapshot: AgentStreamSnapshot,
  status: AgentResponseCardStatus,
  content = snapshot.reply
): AgentResponseCards {
  return createAgentResponseCards({
    id: messageId,
    content,
    status,
    thinking: snapshot.thinking,
    toolCalls: snapshot.toolCalls,
    operations: snapshot.operations,
    operateCards: snapshot.operateCards,
    ragCards: snapshot.ragCards,
    webSearchCards: snapshot.webSearchCards,
    todoCards: snapshot.todoCards
  });
}

export function OperationIcon({ status }: { status: OperationStatus }) {
  if (status === "running") {
    return <Clock3 className="h-4 w-4 text-[#3178c6]" />;
  }

  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-[#18a76f]" />;
  }

  if (status === "error") {
    return <XCircle className="h-4 w-4 text-[#cf3f3f]" />;
  }

  return <TerminalSquare className="h-4 w-4 text-[#77787c]" />;
}

function ThinkingCard({ data }: { data: ThinkingCardData }) {
  return <Thinking title="Deep thinking" subTitle="Agent reasoning stream" content={data.content} />;
}

function ToolCallCard({ data }: { data: ToolCallCardData }) {
  return <ToolCall title={data.title} subTitle={data.subTitle || data.status} input={data.input} output={data.output} />;
}

function OperationCard({ data }: { data: OperationCardData }) {
  const status = data.status ?? "running";

  return (
    <OperateCard
      header={{
        icon: <OperationIcon status={status} />,
        title: data.title,
        description: data.description
      }}
      body={{
        defaultOpen: Boolean(data.rows.length),
        children: (
          <OperateCard.LineBody>
            <div className="ml-4 grid gap-1.5 text-xs text-[#5c5d62]">
              {data.rows.map((row) => (
                <div key={`${row.label}-${row.value}`} className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                  <span className="font-semibold text-[#303135]">{row.label}</span>
                  <span className="min-w-0 break-words">{row.value}</span>
                </div>
              ))}
            </div>
          </OperateCard.LineBody>
        )
      }}
    />
  );
}

function RagCard({ data }: { data: RagCardData }) {
  return <Rag title={data.title} subTitle={data.subTitle} list={data.list} />;
}

function WebSearchCard({ data }: { data: WebSearchCardData }) {
  return <WebSearch title={data.title} subTitle={data.subTitle} list={data.list} />;
}

function TodoCard({ data }: { data: TodoCardData }) {
  return <TodoList title={data.title} defaultOpen={data.defaultOpen ?? true} list={data.list} />;
}

function MarkdownCard({ data }: { data: MarkdownCardData }) {
  return <Markdown content={data.content} allowHtml={false} disableImage={true} cursor={data.generating} />;
}
