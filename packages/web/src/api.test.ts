import { afterEach, describe, expect, it, vi } from "vitest";

import { sendAgentTestMessage, sendAgentTestMessageStream, type AgentStreamSnapshot } from "./api";

describe("api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts fixed agent identity and aggregates SSE text deltas", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () => [
        'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"当前目录包含 README.md、"}',
        'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"packages 和 docs。"}'
      ].join("\n\n")
    } as unknown as Response);

    await expect(sendAgentTestMessage("查看当前目录文件")).resolves.toEqual({
      reply: "当前目录包含 README.md、packages 和 docs。"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent/test",
      expect.objectContaining({
        body: JSON.stringify({
          sessionId: "1",
          userId: "user001",
          message: "查看当前目录文件"
        }),
        method: "POST"
      })
    );
  });

  it("explains the missing test model key when the agent endpoint returns 503", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      headers: {
        get: () => "application/json"
      },
      json: async () => ({
        error: "Service Unavailable",
        path: "/api/agent/test",
        status: 503
      })
    } as unknown as Response);

    await expect(sendAgentTestMessage("查看当前目录文件")).rejects.toThrow(
      "测试模型 API Key 未配置，请设置 AIRELIA_AGENT_TEST_API_KEY 后重启后端服务。"
    );
  });

  it("emits streaming snapshots for thinking, tool calls, and text deltas", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const encoder = new TextEncoder();
    const updates: AgentStreamSnapshot[] = [];

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
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

    const promise = sendAgentTestMessageStream("查看当前目录文件", {
      onUpdate(snapshot) {
        updates.push(snapshot);
      }
    });

    controller?.enqueue(
      encoder.encode('event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","blockId":"thinking","delta":"先确认目录。"}\n\n')
    );
    await flushPromises();

    expect(updates.at(-1)?.thinking).toBe("先确认目录。");
    expect(updates.at(-1)?.reply).toBe("");

    controller?.enqueue(
      encoder.encode(
        [
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","toolCallId":"call_1","toolCallName":"list_files"}',
          'event:TOOL_CALL_DELTA\ndata:{"type":"TOOL_CALL_DELTA","toolCallId":"call_1","delta":"{\\"path\\":\\".\\"}"}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","toolCallId":"call_1","result":{"files":["README.md"]}}'
        ].join("\n\n") + "\n\n"
      )
    );
    await flushPromises();

    expect(updates.at(-1)?.toolCalls).toEqual([
      {
        id: "call_1",
        title: "list_files",
        subTitle: "call_1",
        input: { path: "." },
        output: { files: ["README.md"] },
        status: "done"
      }
    ]);

    controller?.enqueue(
      encoder.encode(
        [
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"当前目录包含 "}',
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"README.md。"}'
        ].join("\n\n") + "\n\n"
      )
    );
    controller?.close();

    await expect(promise).resolves.toMatchObject({
      thinking: "先确认目录。",
      reply: "当前目录包含 README.md。",
      toolCalls: [
        {
          id: "call_1",
          title: "list_files",
          input: { path: "." },
          output: { files: ["README.md"] },
          status: "done"
        }
      ]
    });
  });

  it("uses structured tool result data deltas as ToolCall output", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () =>
        [
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","toolCallId":"call_2","toolCallName":"read_file"}',
          'event:TOOL_CALL_DELTA\ndata:{"type":"TOOL_CALL_DELTA","toolCallId":"call_2","delta":"{\\"path\\":\\"README.md\\"}"}',
          'event:TOOL_RESULT_DATA_DELTA\ndata:{"type":"TOOL_RESULT_DATA_DELTA","toolCallId":"call_2","data":{"kind":"text","text":"hello"}}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","toolCallId":"call_2"}'
        ].join("\n\n")
    } as unknown as Response);

    await expect(sendAgentTestMessageStream("读取 README")).resolves.toMatchObject({
      toolCalls: [
        {
          id: "call_2",
          title: "read_file",
          input: { path: "README.md" },
          output: { kind: "text", text: "hello" },
          status: "done"
        }
      ]
    });
  });

  it("resolves the stream when the agent sends an end event even if the HTTP stream stays open", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const encoder = new TextEncoder();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
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

    const promise = sendAgentTestMessageStream("结束后停止");

    controller?.enqueue(
      encoder.encode(
        [
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"已经完成。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n") + "\n\n"
      )
    );

    await expect(promise).resolves.toMatchObject({
      done: true,
      reply: "已经完成。"
    });
  });
});

async function flushPromises() {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
