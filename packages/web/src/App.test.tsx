import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    // 每个用例重新安装 fetch mock，避免请求计数或实现互相污染。
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        // 模拟后端健康检查接口。
        if (url.endsWith("/api/health")) {
          return Promise.resolve(jsonResponse({ status: "ok", service: "airelia-server", timestamp: "now" }));
        }

        // 模拟 Agent 运行时探测接口。
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

        // 模拟 echo Agent 接口，并确认表单提交使用 POST。
        if (url.endsWith("/api/agent/echo") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({ reply: "Airelia agent scaffold received: test", agent: "scaffold-agent", timestamp: "now" }));
        }

        // 未覆盖的 URL 返回 404，帮助测试暴露意外请求。
        return Promise.resolve(new Response(null, { status: 404 }));
      })
    );
  });

  it("renders backend and runtime status", async () => {
    render(<App />);

    // 首屏应能展示后端和运行时两个异步状态卡片。
    expect(await screen.findByText("airelia-server: ok")).toBeInTheDocument();
    expect(await screen.findByText("agentscope-harness: ready")).toBeInTheDocument();
  });

  it("renders the ferrofluid background as decorative UI", () => {
    render(<App />);

    const background = screen.getByTestId("ferrofluid-background");

    expect(background).toBeInTheDocument();
    expect(background).toHaveAttribute("aria-hidden", "true");
  });

  it("sends an agent echo message", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Agent message"), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    // 表单提交后应展示后端返回的 Agent 回复内容。
    await waitFor(() => {
      expect(screen.getByText("Airelia agent scaffold received: test")).toBeInTheDocument();
    });
  });
});

// 构造带 JSON 响应头的 Response，复用在多个接口 mock 中。
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
