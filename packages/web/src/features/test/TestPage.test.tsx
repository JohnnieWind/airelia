import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import TestPage from "./TestPage";

describe("TestPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends ChatAnywhere messages to the real agent test endpoint", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () =>
        [
          'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","blockId":"thinking","delta":"先查看当前目录。"}',
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","toolCallId":"call_1","toolCallName":"list_files"}',
          'event:TOOL_CALL_DELTA\ndata:{"type":"TOOL_CALL_DELTA","toolCallId":"call_1","delta":"{\\"path\\":\\".\\"}"}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","toolCallId":"call_1","state":"success"}',
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"当前目录包含 **packages**。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n")
    } as unknown as Response);

    render(<TestPage />);

    const input = screen.getByPlaceholderText("Ask ChatAnywhere");
    fireEvent.change(input, { target: { value: "帮我查看当前文件夹有哪些文件" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/agent/test",
        expect.objectContaining({
          body: JSON.stringify({
            sessionId: "1",
            userId: "user001",
            message: "帮我查看当前文件夹有哪些文件"
          }),
          method: "POST"
        })
      );
    });

    expect(await screen.findByText((_, element) => element?.textContent === "当前目录包含 packages。")).toBeInTheDocument();
    expect(await screen.findByText("packages")).toBeInTheDocument();
    expect(screen.queryByText("assistant content")).not.toBeInTheDocument();
    expect(consoleErrorMock.mock.calls.flat().join("\n")).not.toContain('unique "key" prop');
  });
});
