import { Cpu, Layers3, RadioTower, SendHorizontal, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AgentEchoResponse, HealthResponse, RuntimeResponse, fetchHealth, fetchRuntime, sendAgentEcho } from "./api";

type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

function App() {
  const [health, setHealth] = useState<LoadState<HealthResponse>>({ status: "loading" });
  const [runtime, setRuntime] = useState<LoadState<RuntimeResponse>>({ status: "loading" });
  const [message, setMessage] = useState("Hello from Airelia");
  const [echo, setEcho] = useState<AgentEchoResponse | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((data) => setHealth({ status: "ready", data }))
      .catch((error: Error) => setHealth({ status: "error", message: error.message }));

    fetchRuntime()
      .then((data) => setRuntime({ status: "ready", data }))
      .catch((error: Error) => setRuntime({ status: "error", message: error.message }));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await sendAgentEcho(message);
    setEcho(response);
  }

  return (
    <main className="min-h-screen bg-shell text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
              <Sparkles className="h-4 w-4 text-signal" />
              Desktop agent scaffold
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-ink">Airelia</h1>
          </div>
          <div className="rounded-md border border-ink/15 bg-white px-4 py-3 text-sm shadow-sm">
            Electron + React + Spring Boot + AgentScope
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
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
          <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
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

          <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Runtime Details</h2>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink/50">{label}</dt>
      <dd className="break-words font-mono text-xs">{value}</dd>
    </div>
  );
}

export default App;

