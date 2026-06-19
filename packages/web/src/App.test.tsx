import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith("/api/health")) {
          return Promise.resolve(jsonResponse({ status: "ok", service: "airelia-server", timestamp: "now" }));
        }

        if (url.endsWith("/api/runtime")) {
          return Promise.resolve(
            jsonResponse({
              agentRuntime: "agentscope-harness",
              javaVersion: "17.0.7",
              agentScopeHarnessAvailable: true,
              harnessProbeClass: "io.agentscope.harness.agent.HarnessAgent"
            })
          );
        }

        if (url.endsWith("/api/agent/echo") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({ reply: "Airelia agent scaffold received: test", agent: "scaffold-agent", timestamp: "now" }));
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      })
    );
  });

  it("renders backend and runtime status", async () => {
    render(<App />);

    expect(await screen.findByText("airelia-server: ok")).toBeInTheDocument();
    expect(await screen.findByText("agentscope-harness: ready")).toBeInTheDocument();
  });

  it("sends an agent echo message", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Agent message"), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("Airelia agent scaffold received: test")).toBeInTheDocument();
    });
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

