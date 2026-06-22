import { ChatAnywhere, type ChatAnywhereRef, DefaultCards, sleep, type TMessage, uuid } from "@agentscope-ai/chat";
import { useAsyncEffect } from "ahooks";
import { useCallback, useRef } from "react";

function TestPage() {
  const ref = useRef<ChatAnywhereRef>(null);

  const onSubmit = useCallback(async ({ query }: { query: string }) => {
    const userMessage: TMessage = {
      id: uuid(),
      role: "user",
      content: query
    };

    ref.current?.updateMessage(userMessage);
    await sleep(100);

    ref.current?.updateMessage({
      id: uuid(),
      role: "assistant",
      content: "assistant content",
      msgStatus: "finished"
    });
  }, []);

  const onStop = useCallback(() => {
    ref.current?.setLoading(false);
  }, []);

  useAsyncEffect(async () => {
    await sleep(0);

    ref.current?.updateMessage({
      id: uuid(),
      role: "user",
      content: "I want to View page PV data",
      msgStatus: "finished"
    });
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-[#e4e4e2] bg-white">
      <ChatAnywhere
        cardConfig={DefaultCards}
        onInput={{
          onSubmit,
          placeholder: "Ask ChatAnywhere"
        }}
        onStop={onStop}
        ref={ref}
        uiConfig={{
          background: "#ffffff",
          disclaimer: "ChatAnywhere test page",
          header: <div className="px-4 py-3 text-sm font-semibold text-[#191a1d]">ChatAnywhere Test</div>
        }}
      />
    </div>
  );
}

export default TestPage;
