import { Button, ConfigProvider, Tag, carbonTheme } from "@agentscope-ai/design";
import Bubble from "@agentscope-ai/chat/lib/Bubble";
import Sender from "@agentscope-ai/chat/lib/Sender";
import Welcome from "@agentscope-ai/chat/lib/Welcome";
import { Bot, Sparkles } from "lucide-react";
import { useState } from "react";

const starterPrompt = "Create a concise plan for the next Airelia agent workflow.";

function SparkSurface() {
  const [draft, setDraft] = useState(starterPrompt);
  const [lastPrompt, setLastPrompt] = useState(starterPrompt);

  function handleSubmit(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    setLastPrompt(trimmedValue);
    setDraft("");
  }

  function handleSparkAction() {
    const nextPrompt = "Review runtime state, propose the smallest useful agent action, and keep the operator in control.";

    setLastPrompt(nextPrompt);
    setDraft(nextPrompt);
  }

  return (
    <ConfigProvider {...carbonTheme}>
      <section
        className="rounded-md border border-white/40 bg-white/90 p-5 text-ink shadow-sm backdrop-blur"
        data-testid="spark-ui-surface"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Tag color="teal">Spark Design</Tag>
              <Tag color="blue">Spark Chat</Tag>
            </div>
            <h2 className="text-xl font-semibold">Spark Chat preview</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink/62">
              AgentScope Spark components are now part of the Airelia operator surface.
            </p>
          </div>
          <Button type="primary" size="middle" onClick={handleSparkAction}>
            Spark Design action
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-ink/10 bg-white p-4">
            <Welcome
              title="Airelia Spark Desk"
              desc="A typed Spark Design shell with a Spark Chat preview for agent-facing interaction."
              logo={
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
              }
              style={{ padding: 0 }}
            />
          </div>

          <div className="flex min-h-[260px] flex-col gap-3 rounded-md border border-ink/10 bg-[#f7f8fb] p-4">
            <Bubble
              avatar={{ children: <Bot className="h-4 w-4" />, style: { background: "#07100f", color: "#ffffff" } }}
              content="Spark Chat is ready inside the React TypeScript app."
              msgStatus="finished"
            />
            <Bubble
              avatar={{ children: "U", style: { background: "#dff7ef", color: "#07100f" } }}
              content={lastPrompt}
              msgStatus="finished"
              styles={{
                content: {
                  background: "#07100f",
                  color: "#ffffff"
                }
              }}
            />
            <div className="mt-auto">
              <Sender
                value={draft}
                onChange={setDraft}
                onSubmit={handleSubmit}
                placeholder="Ask Spark Chat for the next operator step"
                submitType="enter"
                initialRows={2}
              />
            </div>
          </div>
        </div>
      </section>
    </ConfigProvider>
  );
}

export default SparkSurface;
