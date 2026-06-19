import { Cpu, Layers3, RadioTower, SendHorizontal, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AgentEchoResponse, HealthResponse, RuntimeResponse, fetchHealth, fetchRuntime, sendAgentEcho } from "./api";
import Ferrofluid from "./features/backgrounds/Ferrofluid";
import SparkSurface from "./features/spark/SparkSurface";

// 用联合类型表达异步数据的三种状态，避免界面读取未完成的数据。
type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

function App() {
  // 页面启动后分别加载后端健康状态和 Agent 运行时状态。
  const [health, setHealth] = useState<LoadState<HealthResponse>>({ status: "loading" });
  const [runtime, setRuntime] = useState<LoadState<RuntimeResponse>>({ status: "loading" });
  // echo 表单保留一条默认消息，方便首次打开就能直接验证链路。
  const [message, setMessage] = useState("Hello from Airelia");
  const [echo, setEcho] = useState<AgentEchoResponse | null>(null);

  useEffect(() => {
    // 两个状态请求彼此独立，任一失败只影响对应卡片的展示。
    fetchHealth()
      .then((data) => setHealth({ status: "ready", data }))
      .catch((error: Error) => setHealth({ status: "error", message: error.message }));

    fetchRuntime()
      .then((data) => setRuntime({ status: "ready", data }))
      .catch((error: Error) => setRuntime({ status: "error", message: error.message }));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 提交到后端 echo 端点，成功后在表单下方展示 Agent 回复。
    const response = await sendAgentEcho(message);
    setEcho(response);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07100f] text-ink">
      {/* 背景层只负责视觉氛围，禁用指针事件并从辅助技术中隐藏。 */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true" data-testid="ferrofluid-background">
        <Ferrofluid
          colors={["#ffffff", "#ffffff", "#ffffff"]}
          speed={0.5}
          scale={1.6}
          turbulence={1}
          fluidity={0.1}
          rimWidth={0.2}
          sharpness={2.5}
          shimmer={1.5}
          glow={2}
          flowDirection="down"
          opacity={1}
          mouseInteraction
          mouseStrength={1}
          mouseRadius={0.35}
        />
      </div>
      {/* 半透明遮罩提高前景卡片的可读性，同时保留 Ferrofluid 的运动感。 */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,244,238,0.18),transparent_34%),linear-gradient(180deg,rgba(7,16,15,0.12),rgba(7,16,15,0.72))]" />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/70">
              <Sparkles className="h-4 w-4 text-signal" />
              Desktop agent scaffold
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white">Airelia</h1>
          </div>
          <div className="rounded-md border border-white/25 bg-white/85 px-4 py-3 text-sm shadow-sm backdrop-blur">
            Electron + React + Spring Boot + AgentScope
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {/* 三个状态卡片分别覆盖后端 API、Agent 运行时和 Electron 壳。 */}
          <StatusPanel
            icon={<RadioTower className="h-5 w-5" />}
            title="Backend API"
            state={health}
            render={(data) => `${data.service}: ${data.status}`}
          />
          <StatusPanel
            icon={<Cpu className="h-5 w-5" />}
            title="Agent Runtime"
            state={runtime}
            render={(data) => `${data.agentRuntime}: ${data.agentScopeHarnessAvailable ? "ready" : "missing"}`}
          />
          <StatusPanel
            icon={<Layers3 className="h-5 w-5" />}
            title="Desktop Shell"
            state={{ status: "ready", data: window.airelia?.apiUrl ?? "browser dev mode" }}
            render={(data) => data}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-md border border-white/40 bg-white/88 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold">Agent Echo</h2>
            <form className="flex gap-3" onSubmit={handleSubmit}>
              <input
                className="min-w-0 flex-1 rounded-md border border-ink/15 px-3 py-2 outline-none transition focus:border-ink"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-label="Agent message"
              />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/90"
                type="submit"
              >
                <SendHorizontal className="h-4 w-4" />
                Send
              </button>
            </form>
            {echo ? (
              <div className="mt-4 rounded-md bg-mint/20 p-4 text-sm">
                <div className="font-semibold">{echo.agent}</div>
                <div>{echo.reply}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-white/40 bg-white/88 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold">Runtime Details</h2>
            {/* 运行时详情只在后端状态加载完成后展示，避免访问空数据。 */}
            {runtime.status === "ready" ? (
              <dl className="space-y-3 text-sm">
                <Detail label="Java" value={runtime.data.javaVersion} />
                <Detail label="Probe" value={runtime.data.harnessProbeClass} />
              </dl>
            ) : (
              <p className="text-sm text-ink/60">Waiting for runtime status...</p>
            )}
          </div>
        </section>

        <SparkSurface />
      </section>
    </main>
  );
}

interface StatusPanelProps<T> {
  icon: React.ReactNode;
  title: string;
  state: LoadState<T>;
  render: (data: T) => string;
}

// 通用状态卡片：把 loading/error/ready 的展示逻辑收拢在一个组件里。
function StatusPanel<T>({ icon, title, state, render }: StatusPanelProps<T>) {
  const label =
    state.status === "loading" ? "Checking..." : state.status === "error" ? state.message : render(state.data);

  return (
    <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-ink/70">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      </div>
      <p className="text-lg font-semibold">{label}</p>
    </div>
  );
}

// 键值详情项，用于展示运行时的长字符串信息。
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink/50">{label}</dt>
      <dd className="break-words font-mono text-xs">{value}</dd>
    </div>
  );
}

export default App;
