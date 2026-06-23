import { ChatAnywhere, type ChatAnywhereRef, DefaultCards, type TMessage, uuid } from "@agentscope-ai/chat";
import { useCallback, useRef } from "react";

import { sendAgentTestMessageStream } from "../../api";
import { createAgentResponseCardsFromSnapshot } from "../agent-chat/agentResponseCards";

function TestPage() {
  const ref = useRef<ChatAnywhereRef>(null);

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

export default TestPage;
