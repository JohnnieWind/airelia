import { ConfigProvider } from "@agentscope-ai/design";
import { Accordion } from "@agentscope-ai/chat/lib/Accordion";
import DeepThinking from "@agentscope-ai/chat/lib/Accordion/DeepThinking";
import Attachments from "@agentscope-ai/chat/lib/Attachments";
import Bubble from "@agentscope-ai/chat/lib/Bubble";
import ChatAnywhere, {
  useChatAnywhere,
  useInput,
  useMessages,
  useSessionList,
  uuid
} from "@agentscope-ai/chat/lib/ChatAnywhere";
import Conversations from "@agentscope-ai/chat/lib/Conversations";
import * as SparkDefaultCards from "@agentscope-ai/chat/lib/DefaultCards";
import Disclaimer from "@agentscope-ai/chat/lib/Disclaimer";
import OperateCard from "@agentscope-ai/chat/lib/OperateCard";
import SparkMarkdown, { type MarkdownProps as SparkMarkdownProps } from "@agentscope-ai/chat/lib/Markdown";
import Sender from "@agentscope-ai/chat/lib/Sender";
import sleep from "@agentscope-ai/chat/lib/Util/sleep";
import { Rag, Thinking, TodoList, ToolCall, WebSearch } from "@agentscope-ai/chat/lib/OperateCard/preset";
import React, { createContext, useContext, useMemo } from "react";
import type { ChatAnywhereRef, TMessage, TSession } from "@agentscope-ai/chat/lib/ChatAnywhere";

// Spark Chat 子模块会从父级入口读取 Provider/Markdown 等运行时对象；这里提供最小可用实现。
interface SparkChatProviderProps {
  children: React.ReactNode;
  cardConfig?: Record<string, React.ComponentType<any> | React.ReactNode>;
  markdown?: {
    baseFontSize?: number;
  };
}

interface BeforeUIContainerProps {
  leftChildren?: React.ReactNode;
  rightChildren?: React.ReactNode;
}

type ChatInputType = typeof Sender & {
  BeforeUIContainer: (props: BeforeUIContainerProps) => React.ReactElement;
};

const CustomCardsContext = createContext<SparkChatProviderProps["cardConfig"]>({});
const GlobalContext = createContext<Pick<SparkChatProviderProps, "markdown">>({});

function CustomCardsProvider({
  cardConfig,
  children
}: {
  cardConfig?: SparkChatProviderProps["cardConfig"];
  children: React.ReactNode;
}) {
  return <CustomCardsContext.Provider value={cardConfig}>{children}</CustomCardsContext.Provider>;
}

// 保留 Spark Chat 的上下文形状，让 Bubble/Sender/Welcome 可以按官方组件方式运行。
function SparkChatProvider({ children, cardConfig = {}, markdown }: SparkChatProviderProps) {
  return (
    <GlobalContext.Provider value={{ markdown }}>
      <CustomCardsProvider cardConfig={cardConfig}>{children}</CustomCardsProvider>
    </GlobalContext.Provider>
  );
}

function useProviderContext() {
  // 复用 Spark Design/AntD 的 ConfigContext，确保 Chat 组件拿到同一套 prefix 和主题。
  return useContext(ConfigProvider.ConfigContext);
}

function useCustomCardsContext() {
  const cardConfig = useContext(CustomCardsContext);

  return useMemo(() => ({ ...SparkDefaultCards, ...cardConfig }), [cardConfig]);
}

function useGlobalContext() {
  return useContext(GlobalContext);
}


function Markdown({ allowHtml = false, disableImage = true, ...props }: SparkMarkdownProps) {
  return <SparkMarkdown {...props} allowHtml={allowHtml} disableImage={disableImage} />;
}

function Mermaid({ content }: { content?: string }) {
  return content ? <pre>{content}</pre> : null;
}

const DefaultCards = SparkDefaultCards;
const ChatInput = Sender as ChatInputType;

ChatInput.BeforeUIContainer = function BeforeUIContainer({
  leftChildren,
  rightChildren
}: BeforeUIContainerProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-1 text-xs font-medium text-[#686a70]">
      <div className="min-w-0">{leftChildren}</div>
      <div className="min-w-0">{rightChildren}</div>
    </div>
  );
};

export default SparkChatProvider;
export type { ChatAnywhereRef, TMessage, TSession };
export {
  Accordion,
  Attachments,
  Bubble,
  ChatInput,
  ChatAnywhere,
  Conversations,
  CustomCardsContext,
  CustomCardsProvider,
  DefaultCards,
  DeepThinking,
  DeepThinking as DeepThink,
  Disclaimer,
  GlobalContext,
  Markdown,
  Mermaid,
  OperateCard,
  Rag,
  SparkChatProvider,
  Sender,
  Thinking,
  TodoList,
  ToolCall,
  WebSearch,
  sleep,
  useChatAnywhere,
  useCustomCardsContext,
  useGlobalContext,
  useInput,
  useMessages,
  useProviderContext,
  useSessionList,
  uuid
};
