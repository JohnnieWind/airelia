import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import TestSessionContextPage from "./TestSessionContextPage";

describe("TestSessionContextPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and renders the fixed user session context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "application/json"
      },
      json: async () => [
        {
          id: "summary",
          name: "__compaction_summary__",
          role: "USER",
          content: [{ type: "text", text: "internal summary should stay hidden" }],
          metadata: {},
          timestamp: "2026-06-23 15:07:18.556",
          usage: null
        },
        {
          id: "assistant-1",
          name: "default",
          role: "ASSISTANT",
          content: [
            { type: "thinking", thinking: "先确认状态。", metadata: null },
            {
              type: "tool_use",
              id: "call_execute",
              name: "execute",
              input: { command: "pwd", timeout: 10 },
              content: "{\"command\":\"pwd\"}",
              metadata: {},
              state: "allowed"
            },
            { type: "text", text: "README 已写入。" }
          ],
          metadata: {},
          timestamp: "2026-06-23 15:05:58.471",
          usage: null
        },
        {
          id: "tool-1",
          name: "execute",
          role: "TOOL",
          content: [
            {
              type: "tool_result",
              id: "call_execute",
              name: "execute",
              output: [{ type: "text", text: "\"Exit code: 0\\n\\nREADME.md written\\n\"" }],
              metadata: {},
              state: "running"
            }
          ],
          metadata: {},
          timestamp: "2026-06-23 15:05:58.494",
          usage: null
        },
        {
          id: "assistant-2",
          name: "default",
          role: "ASSISTANT",
          content: [
            { type: "thinking", thinking: "继续确认用户信息。", metadata: null },
            { type: "text", text: "第二段回复。" }
          ],
          metadata: {},
          timestamp: "2026-06-23 15:06:12.102",
          usage: null
        },
        {
          id: "user-1",
          name: null,
          role: "USER",
          content: [{ type: "text", text: "搞定了吗" }],
          metadata: {},
          timestamp: "2026-06-23 15:06:29.407",
          usage: null
        }
      ]
    } as unknown as Response);

    render(<TestSessionContextPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/agent/agent/sessionContext?userId=WUZHENGYU458&sessionId=1",
        expect.anything()
      );
    });

    expect(await screen.findByText("README 已写入。")).toBeInTheDocument();
    expect(document.querySelectorAll('.ant-bubble[data-role="assistant"]')).toHaveLength(1);
    expect(screen.getAllByText("执行命令")).toHaveLength(1);
    expect(screen.getByText("第二段回复。")).toBeInTheDocument();
    expect(screen.getByText("pwd")).toBeInTheDocument();
    expect(screen.getByText("搞定了吗")).toBeInTheDocument();
    expect(screen.queryByText("internal summary should stay hidden")).not.toBeInTheDocument();
  });
});
