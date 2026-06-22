import { Markdown, OperateCard, Rag, Thinking, TodoList, ToolCall, WebSearch } from "@agentscope-ai/chat";
import type { TMessage } from "@agentscope-ai/chat";
import { CheckCircle2, Clock3, TerminalSquare, XCircle } from "lucide-react";
import type { FC } from "react";

import type {
  AgentOperationCard,
  AgentRagCard,
  AgentThinkingBlock,
  AgentStreamPart,
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
  thinkingBlocks?: AgentThinkingBlock[];
  toolCalls?: AgentToolCall[];
  operations?: AgentOperationCard[];
  operateCards?: AgentOperationCard[];
  ragCards?: AgentRagCard[];
  webSearchCards?: AgentWebSearchCard[];
  todoCards?: AgentTodoCard[];
  parts?: AgentStreamPart[];
};

type AgentResponseCards = NonNullable<TMessage["cards"]>;
type OperationStatus = "idle" | "running" | "done" | "error";

type ThinkingCardData = {
  id: string;
  content: string;
  title?: string;
  subTitle?: string;
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
  if (message.parts?.length) {
    return createAgentResponseCardsInEventOrder(message);
  }

  const cards: AgentResponseCards = [];

  appendThinkingCard(cards, message);

  for (const operation of message.operations ?? []) {
    appendOperationCard(cards, message.id, operation);
  }

  for (const toolCall of message.toolCalls ?? []) {
    appendToolCallCard(cards, message.id, toolCall);
  }

  for (const operateCard of message.operateCards ?? []) {
    appendOperationCard(cards, message.id, operateCard);
  }

  for (const ragCard of message.ragCards ?? []) {
    appendRagCard(cards, message.id, ragCard);
  }

  for (const webSearchCard of message.webSearchCards ?? []) {
    appendWebSearchCard(cards, message.id, webSearchCard);
  }

  for (const todoCard of message.todoCards ?? []) {
    appendTodoCard(cards, message.id, todoCard);
  }

  appendTextCard(cards, message);

  return cards;
}

function appendThinkingCard(cards: AgentResponseCards, message: AgentResponseCardMessage) {
  if (message.thinkingBlocks?.length) {
    for (const thinkingBlock of message.thinkingBlocks) {
      appendThinkingBlockCard(cards, message.id, thinkingBlock);
    }

    return;
  }

  if (!message.thinking?.trim()) {
    return;
  }

  appendThinkingBlockCard(cards, message.id, {
    id: "thinking",
    content: message.thinking,
    subTitle: "Agent reasoning stream"
  });
}

function appendThinkingBlockCard(cards: AgentResponseCards, messageId: string, thinkingBlock: AgentThinkingBlock) {
  if (!thinkingBlock.content.trim()) {
    return;
  }

  cards.push({
    code: "Thinking",
    id: `${messageId}-thinking-${thinkingBlock.id}`,
    data: {
      id: thinkingBlock.id,
      content: thinkingBlock.content,
      title: thinkingBlock.title,
      subTitle: thinkingBlock.subTitle ?? thinkingBlock.id
    } satisfies ThinkingCardData,
    component: ThinkingCard as FC
  });
}

function appendOperationCard(cards: AgentResponseCards, messageId: string, operation: AgentOperationCard) {
  cards.push({
    code: "OperateCard",
    id: `${messageId}-${operation.id}`,
    data: operation satisfies OperationCardData,
    component: OperationCard as FC
  });
}

function appendToolCallCard(cards: AgentResponseCards, messageId: string, toolCall: AgentToolCall) {
  cards.push({
    code: "ToolCall",
    id: `${messageId}-${toolCall.id}`,
    data: toolCall satisfies ToolCallCardData,
    component: ToolCallCard as FC
  });
}

function appendRagCard(cards: AgentResponseCards, messageId: string, ragCard: AgentRagCard) {
  cards.push({
    code: "Rag",
    id: `${messageId}-${ragCard.id}`,
    data: ragCard satisfies RagCardData,
    component: RagCard as FC
  });
}

function appendWebSearchCard(cards: AgentResponseCards, messageId: string, webSearchCard: AgentWebSearchCard) {
  cards.push({
    code: "WebSearch",
    id: `${messageId}-${webSearchCard.id}`,
    data: webSearchCard satisfies WebSearchCardData,
    component: WebSearchCard as FC
  });
}

function appendTodoCard(cards: AgentResponseCards, messageId: string, todoCard: AgentTodoCard) {
  cards.push({
    code: "TodoList",
    id: `${messageId}-${todoCard.id}`,
    data: todoCard satisfies TodoCardData,
    component: TodoCard as FC
  });
}

function appendTextCard(cards: AgentResponseCards, message: AgentResponseCardMessage) {
  if (!message.content && message.status !== "generating") {
    return;
  }

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
    thinkingBlocks: snapshot.thinkingBlocks,
    toolCalls: snapshot.toolCalls,
    operations: snapshot.operations,
    operateCards: snapshot.operateCards,
    ragCards: snapshot.ragCards,
    webSearchCards: snapshot.webSearchCards,
    todoCards: snapshot.todoCards,
    parts: snapshot.parts
  });
}

function createAgentResponseCardsInEventOrder(message: AgentResponseCardMessage): AgentResponseCards {
  const cards: AgentResponseCards = [];

  for (const part of message.parts ?? []) {
    if (part.type === "thinking") {
      const thinkingBlock = message.thinkingBlocks?.find((item) => item.id === part.id);

      if (thinkingBlock) {
        appendThinkingBlockCard(cards, message.id, thinkingBlock);
      } else if (!message.thinkingBlocks?.length && !cards.some((card) => card.id === `${message.id}-thinking-thinking`)) {
        appendThinkingCard(cards, message);
      }

      continue;
    }

    if (part.type === "text") {
      appendTextCard(cards, message);
      continue;
    }

    if (part.type === "operation") {
      const operation = message.operations?.find((item) => item.id === part.id);

      if (operation) {
        appendOperationCard(cards, message.id, operation);
      }

      continue;
    }

    if (part.type === "tool") {
      const toolCall = message.toolCalls?.find((item) => item.id === part.id);

      if (toolCall) {
        appendToolCallCard(cards, message.id, toolCall);
      }

      continue;
    }

    if (part.type === "operate") {
      const operateCard = message.operateCards?.find((item) => item.id === part.id);

      if (operateCard) {
        appendOperationCard(cards, message.id, operateCard);
      }

      continue;
    }

    if (part.type === "rag") {
      const ragCard = message.ragCards?.find((item) => item.id === part.id);

      if (ragCard) {
        appendRagCard(cards, message.id, ragCard);
      }

      continue;
    }

    if (part.type === "webSearch") {
      const webSearchCard = message.webSearchCards?.find((item) => item.id === part.id);

      if (webSearchCard) {
        appendWebSearchCard(cards, message.id, webSearchCard);
      }

      continue;
    }

    if (part.type === "todo") {
      const todoCard = message.todoCards?.find((item) => item.id === part.id);

      if (todoCard) {
        appendTodoCard(cards, message.id, todoCard);
      }
    }
  }

  return cards;
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
  return <Thinking title={data.title ?? "Deep thinking"} subTitle={data.subTitle ?? data.id} content={data.content} />;
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
