import { ConfigProvider } from "@agentscope-ai/design";
import React, { createContext, useContext, useMemo } from "react";

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
  onInput: (_value: string) => undefined
};

function SparkChatProvider({ children, cardConfig = {}, markdown }: SparkChatProviderProps) {
  return (
    <GlobalContext.Provider value={{ markdown }}>
      <CustomCardsContext.Provider value={cardConfig}>{children}</CustomCardsContext.Provider>
    </GlobalContext.Provider>
  );
}

function useProviderContext() {
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
