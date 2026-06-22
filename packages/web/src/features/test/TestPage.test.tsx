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

  it("renders thinking, tool calls, and text as stream chunks arrive", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const encoder = new TextEncoder();
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      body: new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
        }
      })
    } as unknown as Response);

    render(<TestPage />);

    const input = screen.getByPlaceholderText("Ask ChatAnywhere");
    fireEvent.change(input, { target: { value: "帮我查看当前文件夹有哪些文件" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    controller?.enqueue(
      encoder.encode(
        [
          'event:AGENT_START\ndata:{"type":"AGENT_START","id":"agent_1","replyId":"reply_root","name":"default","role":"assistant"}',
          'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","blockId":"thinking","delta":"先确认当前目录。"}'
        ].join("\n\n") + "\n\n"
      )
    );

    expect(await screen.findByText("先确认当前目录。")).toBeInTheDocument();
    expect(screen.queryByText((_, element) => element?.textContent === "当前目录包含 packages。")).not.toBeInTheDocument();

    controller?.enqueue(
      encoder.encode(
        [
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","toolCallId":"call_1","toolCallName":"list_files"}',
          'event:TOOL_CALL_DELTA\ndata:{"type":"TOOL_CALL_DELTA","toolCallId":"call_1","delta":"{\\"path\\":\\".\\"}"}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","toolCallId":"call_1","result":{"files":["packages"]}}'
        ].join("\n\n") + "\n\n"
      )
    );

    expect(await screen.findByText("list_files")).toBeInTheDocument();
    expect(await screen.findByText(/packages/)).toBeInTheDocument();

    controller?.enqueue(
      encoder.encode(
        'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","blockId":"verify","delta":"再检查工具结果。"}\n\n'
      )
    );

    expect(await screen.findByText("再检查工具结果。")).toBeInTheDocument();

    controller?.enqueue(
      encoder.encode(
        [
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"当前目录包含 "}',
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"**packages**。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END","replyId":"reply_root"}'
        ].join("\n\n") + "\n\n"
      )
    );
    controller?.close();

    const operationCard = await screen.findByText("Agent 执行");
    const firstThinkingCard = await screen.findByText("先确认当前目录。");
    const secondThinkingCard = await screen.findByText("再检查工具结果。");
    const toolCallCard = await screen.findByText("list_files");
    const answerCard = await screen.findByText((_, element) => element?.textContent === "当前目录包含 packages。");

    expect(answerCard).toBeInTheDocument();
    expect(await screen.findByText("thinking")).toBeInTheDocument();
    expect(await screen.findByText("verify")).toBeInTheDocument();
    expect(screen.getAllByText("Deep thinking")).toHaveLength(2);
    expectBefore(operationCard, firstThinkingCard);
    expectBefore(firstThinkingCard, toolCallCard);
    expectBefore(toolCallCard, secondThinkingCard);
    expectBefore(secondThinkingCard, answerCard);
    expect(consoleErrorMock.mock.calls.flat().join("\n")).not.toContain('unique "key" prop');
  });
});

function expectBefore(left: HTMLElement, right: HTMLElement) {
  expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}
