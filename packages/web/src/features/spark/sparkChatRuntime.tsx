import { ConfigProvider } from "@agentscope-ai/design";
import React, { createContext, useContext, useMemo } from "react";

// Spark Chat 子模块会从父级入口读取 Provider/Markdown 等运行时对象；这里提供最小可用实现。
interface SparkChatProviderProps {
  children: React.ReactNode;
  cardConfig?: Record<string, React.ComponentType<any> | React.ReactNode>;
  markdown?: {
    baseFontSize?: number;
  };
}

interface MarkdownProps {
  content?: React.ReactNode;
  cursor?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CustomCardsContext = createContext<SparkChatProviderProps["cardConfig"]>({});
const GlobalContext = createContext<Pick<SparkChatProviderProps, "markdown">>({});
const chatAnywhereContext = {
  // 当前页面只做本地预览，不接入 ChatAnywhere 输入总线，保留空实现满足组件依赖。
  onInput: (_value: string) => undefined
};

// 保留 Spark Chat 的上下文形状，让 Bubble/Sender/Welcome 可以按官方组件方式运行。
function SparkChatProvider({ children, cardConfig = {}, markdown }: SparkChatProviderProps) {
  return (
    <GlobalContext.Provider value={{ markdown }}>
      <CustomCardsContext.Provider value={cardConfig}>{children}</CustomCardsContext.Provider>
    </GlobalContext.Provider>
  );
}

function useProviderContext() {
  // 复用 Spark Design/AntD 的 ConfigContext，确保 Chat 组件拿到同一套 prefix 和主题。
  return useContext(ConfigProvider.ConfigContext);
}

function useCustomCardsContext() {
  const cardConfig = useContext(CustomCardsContext);

  return useMemo(() => cardConfig ?? {}, [cardConfig]);
}

function useGlobalContext() {
  return useContext(GlobalContext);
}

function useChatAnywhere<T>(selector?: (value: typeof chatAnywhereContext) => T) {
  return selector ? selector(chatAnywhereContext) : chatAnywhereContext;
}

function Markdown({ className, content, cursor, style }: MarkdownProps) {
  // 默认 Markdown 组件会注入较重样式；本页预览只需要纯文本和生成光标。
  return (
    <span className={className} style={style}>
      {content}
      {cursor ? " ..." : null}
    </span>
  );
}

const DefaultCards = {};

export default SparkChatProvider;
export {
  CustomCardsContext,
  DefaultCards,
  GlobalContext,
  Markdown,
  SparkChatProvider,
  useChatAnywhere,
  useCustomCardsContext,
  useGlobalContext,
  useProviderContext
};
