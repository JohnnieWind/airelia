import { Markdown, OperateCard, TodoList, useProviderContext } from "@agentscope-ai/chat";
import type { TMessage } from "@agentscope-ai/chat";
import { CheckCircle2, Clock3, TerminalSquare, XCircle } from "lucide-react";
import type { FC } from "react";

import type {
  AgentOperationCard,
  AgentRagCard,
  AgentThinkingBlock,
  AgentStreamPart,
  AgentStreamSnapshot,
  AgentTextBlock,
  AgentTodoCard,
  AgentToolCall,
  AgentToolPayload,
  AgentWebSearchCard
} from "../../api";

export type AgentResponseCardStatus = NonNullable<TMessage["msgStatus"]>;

export type AgentResponseCardDisplayConfig = {
  showRuntimeOperations?: boolean;
};

export type AgentResponseCardMessage = {
  id: string;
  content: string;
  status?: AgentResponseCardStatus;
  displayConfig?: AgentResponseCardDisplayConfig;
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

type AgentResponseCards = NonNullable<TMessage["cards"]>;
type OperationStatus = "idle" | "running" | "done" | "error";
type ResolvedAgentResponseCardDisplayConfig = Required<AgentResponseCardDisplayConfig>;

const defaultAgentResponseCardDisplayConfig: ResolvedAgentResponseCardDisplayConfig = {
  showRuntimeOperations: false
};

const runtimeOperationTitles = new Set(["Agent 执行", "模型调用"]);
const executeCommandPreviewMaxLength = 36;

type ThinkingCardData = {
  id: string;
  content: string;
  title?: string;
  subTitle?: string;
  loading?: boolean;
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

type StreamLoadingCardData = {
  label: string;
};

export function createAgentResponseCards(message: AgentResponseCardMessage): AgentResponseCards {
  const displayConfig = resolveAgentResponseCardDisplayConfig(message.displayConfig);

  if (message.parts?.length) {
    return createAgentResponseCardsInEventOrder(message, displayConfig);
  }

  const cards: AgentResponseCards = [];

  appendThinkingCard(cards, message);

  for (const operation of message.operations ?? []) {
    if (shouldShowOperationCard(operation, displayConfig)) {
      appendOperationCard(cards, message.id, operation);
    }
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
  appendStreamLoadingCard(cards, message);

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
  if (!thinkingBlock.loading && !thinkingBlock.content.trim()) {
    return;
  }

  cards.push({
    code: "Thinking",
    id: `${messageId}-thinking-${thinkingBlock.id}`,
    data: {
      id: thinkingBlock.id,
      content: thinkingBlock.content,
      title: thinkingBlock.title,
      subTitle: thinkingBlock.subTitle ?? thinkingBlock.id,
      loading: thinkingBlock.loading
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
  if (message.textBlocks?.length) {
    for (const textBlock of message.textBlocks) {
      appendTextBlockCard(cards, message.id, textBlock, message.status);
    }

    return;
  }

  if (!message.content && message.status !== "generating") {
    return;
  }

  appendTextBlockCard(
    cards,
    message.id,
    {
      id: "reply",
      content: message.content
    },
    message.status
  );
}

function appendTextBlockCard(
  cards: AgentResponseCards,
  messageId: string,
  textBlock: AgentTextBlock,
  status?: AgentResponseCardStatus
) {
  if (!textBlock.content && status !== "generating") {
    return;
  }

  cards.push({
    code: "Text",
    id: `${messageId}-markdown-${textBlock.id}`,
    data: {
      content: textBlock.content,
      generating: status === "generating"
    } satisfies MarkdownCardData,
    component: MarkdownCard as FC
  });
}

function appendStreamLoadingCard(cards: AgentResponseCards, message: AgentResponseCardMessage) {
  if (message.status !== "generating") {
    return;
  }

  cards.push({
    code: "StreamLoading",
    id: `${message.id}-stream-loading`,
    data: {
      label: "AI 回复生成中"
    } satisfies StreamLoadingCardData,
    component: StreamLoadingCard as FC
  });
}

export function createAgentResponseCardsFromSnapshot(
  messageId: string,
  snapshot: AgentStreamSnapshot,
  status: AgentResponseCardStatus,
  content = snapshot.reply,
  displayConfig?: AgentResponseCardDisplayConfig
): AgentResponseCards {
  return createAgentResponseCards({
    id: messageId,
    content,
    status,
    displayConfig,
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
  });
}

function createAgentResponseCardsInEventOrder(
  message: AgentResponseCardMessage,
  displayConfig: ResolvedAgentResponseCardDisplayConfig
): AgentResponseCards {
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
      const textBlock = message.textBlocks?.find((item) => item.id === part.id);

      if (textBlock) {
        appendTextBlockCard(cards, message.id, textBlock, message.status);
      } else if (!message.textBlocks?.length && !cards.some((card) => card.id === `${message.id}-markdown-reply`)) {
        appendTextCard(cards, message);
      }

      continue;
    }

    if (part.type === "operation") {
      const operation = message.operations?.find((item) => item.id === part.id);

      if (operation && shouldShowOperationCard(operation, displayConfig)) {
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

  appendStreamLoadingCard(cards, message);

  return cards;
}

function resolveAgentResponseCardDisplayConfig(
  displayConfig?: AgentResponseCardDisplayConfig
): ResolvedAgentResponseCardDisplayConfig {
  return {
    ...defaultAgentResponseCardDisplayConfig,
    ...displayConfig
  };
}

function shouldShowOperationCard(
  operation: AgentOperationCard,
  displayConfig: ResolvedAgentResponseCardDisplayConfig
): boolean {
  return !isRuntimeOperationCard(operation) || displayConfig.showRuntimeOperations;
}

function isRuntimeOperationCard(operation: AgentOperationCard): boolean {
  return runtimeOperationTitles.has(operation.title);
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
  const status: OperationStatus = data.loading ? "running" : "done";

  return (
    <OperateCard
      header={{
        icon: <OperationIcon status={status} />,
        title: data.title ?? "深度思考",
        description: data.subTitle ?? data.id
      }}
      body={{
        defaultOpen: false,
        children: (
          <OperateCard.LineBody>
            <div className="ml-4 whitespace-pre-wrap break-words text-xs leading-5 text-[#5c5d62]">{data.content}</div>
          </OperateCard.LineBody>
        )
      }}
    />
  );
}

function formatToolCallTitle(toolCall: AgentToolCall): string {
  const displayName = getToolDisplayName(toolCall);

  return displayName ?? toolCall.title;
}

function formatToolCallSubTitle(toolCall: AgentToolCall): string {
  const command = isRecord(toolCall.input) && typeof toolCall.input.command === "string" ? toolCall.input.command : undefined;

  if (isExecuteToolCall(toolCall) && command) {
    return formatExecuteCommandPreview(command);
  }

  return toolCall.subTitle || toolCall.status;
}

function formatExecuteCommandPreview(command: string): string {
  // Keep command previews short so the localized tool title stays readable in compact cards.
  const compactCommand = command.trim().replace(/\s+/g, " ");

  if (compactCommand.length <= executeCommandPreviewMaxLength) {
    return compactCommand;
  }

  return `${compactCommand.slice(0, executeCommandPreviewMaxLength)}...`;
}

function isExecuteToolCall(toolCall: AgentToolCall): boolean {
  return toolCall.title.trim().toLowerCase() === "execute";
}

function getToolDisplayName(toolCall: AgentToolCall): string | undefined {
  const normalizedTitle = toolCall.title.trim().toLowerCase();

  if (normalizedTitle === "execute") {
    return "执行命令";
  }

  if (normalizedTitle === "read_file") {
    return "读取文件";
  }

  if (normalizedTitle === "write_file") {
    return "写入文件";
  }

  return undefined;
}

function ToolCallCard({ data }: { data: ToolCallCardData }) {
  return (
    <OperateCard
      header={{
        icon: <OperationIcon status={data.status} />,
        title: formatToolCallTitle(data),
        description: formatToolCallSubTitle(data)
      }}
      body={{
        defaultOpen: false,
        children: (
          <OperateCard.LineBody>
            <div className="ml-4 grid gap-2 text-xs text-[#5c5d62]">
              <ToolCallBlock title="Input" content={data.input} />
              <ToolCallBlock title="Output" content={data.output} />
            </div>
          </OperateCard.LineBody>
        )
      }}
    />
  );
}

function ToolCallBlock({ title, content }: { title: string; content: AgentToolPayload }) {
  return (
    <div className="rounded-md border border-[#e5e5e2] bg-[#fafafa] p-2">
      <div className="mb-1 text-[11px] font-semibold text-[#303135]">{title}</div>
      <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#5c5d62]">{stringifyCardPayload(content)}</pre>
    </div>
  );
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
        defaultOpen: false,
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
  return (
    <OperateCard
      header={{
        icon: <OperationIcon status="idle" />,
        title: data.title ?? "知识库检索",
        description: data.subTitle
      }}
      body={{
        defaultOpen: false,
        children: (
          <OperateCard.LineBody>
            <div className="ml-4 grid gap-2 text-xs text-[#5c5d62]">
              {data.list.map((item) => (
                <div key={`${item.title}-${item.footer}`} className="grid gap-1.5">
                  <div className="font-semibold text-[#303135]">{item.title}</div>
                  <Markdown content={item.content} allowHtml={false} disableImage={false} />
                  {item.link ? (
                    <a className="text-[#3178c6]" href={item.link} rel="noreferrer" target="_blank">
                      {item.footer}
                    </a>
                  ) : (
                    <div>{item.footer}</div>
                  )}
                </div>
              ))}
            </div>
          </OperateCard.LineBody>
        )
      }}
    />
  );
}

function WebSearchCard({ data }: { data: WebSearchCardData }) {
  return (
    <OperateCard
      header={{
        icon: <OperationIcon status="idle" />,
        title: data.title ?? "联网搜索",
        description: data.subTitle
      }}
      body={{
        defaultOpen: false,
        children: (
          <OperateCard.LineBody>
            <div className="ml-4 grid gap-2 text-xs text-[#5c5d62]">
              {data.list.map((item) => (
                <a
                  key={`${item.title}-${item.link}`}
                  className="grid gap-1 rounded-md border border-[#e5e5e2] bg-[#fafafa] p-2 text-[#303135]"
                  href={item.link}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="font-semibold">{item.title}</span>
                  {item.subTitle ? <span className="text-[#77787c]">{item.subTitle}</span> : null}
                </a>
              ))}
            </div>
          </OperateCard.LineBody>
        )
      }}
    />
  );
}

function TodoCard({ data }: { data: TodoCardData }) {
  return <TodoList title={data.title} defaultOpen={data.defaultOpen ?? false} list={data.list} />;
}

function MarkdownCard({ data }: { data: MarkdownCardData }) {
  return <Markdown content={data.content} allowHtml={false} disableImage={true} cursor={data.generating} />;
}

function StreamLoadingCard({ data }: { data: StreamLoadingCardData }) {
  const { getPrefixCls } = useProviderContext();
  const prefixCls = getPrefixCls("bubble-loading");

  return (
    <div aria-label={data.label} aria-live="polite" className={prefixCls} role="status">
      <div className={`${prefixCls}-dot1`} />
      <div className={`${prefixCls}-dot2`} />
      <div className={`${prefixCls}-dot3`} />
      <div className={`${prefixCls}-text`}>-</div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyCardPayload(value: AgentToolPayload): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
