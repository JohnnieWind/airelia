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
      ],
      parts: [
        { type: "thinking", id: "thinking" },
        { type: "tool", id: "call_1" },
        { type: "text", id: "reply" }
      ]
    });
  });

  it("keeps separate thinking blocks ordered by event id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () =>
        [
          'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","replyId":"reply_model_a","blockId":"plan","delta":"先制定计划。"}',
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","toolCallId":"call_1","toolCallName":"list_files"}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","toolCallId":"call_1","result":{"files":["packages"]}}',
          'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","replyId":"reply_model_b","blockId":"verify","delta":"再检查工具结果。"}',
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"当前目录包含 packages。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n")
    } as unknown as Response);

    await expect(sendAgentTestMessageStream("帮我查看当前文件夹有哪些文件")).resolves.toMatchObject({
      thinking: "先制定计划。再检查工具结果。",
      thinkingBlocks: [
        {
          id: "reply_model_a:plan",
          content: "先制定计划。"
        },
        {
          id: "reply_model_b:verify",
          content: "再检查工具结果。"
        }
      ],
      parts: [
        { type: "thinking", id: "reply_model_a:plan" },
        { type: "tool", id: "call_1" },
        { type: "thinking", id: "reply_model_b:verify" },
        { type: "text", id: "reply" }
      ]
    });
  });

  it("tracks thinking block loading from stream start and end events", async () => {
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

    const promise = sendAgentTestMessageStream("展示思考状态", {
      onUpdate(snapshot) {
        updates.push(snapshot);
      }
    });

    controller?.enqueue(
      encoder.encode(
        [
          'event:THINKING_BLOCK_START\ndata:{"type":"THINKING_BLOCK_START","replyId":"reply_model","blockId":"plan","title":"深度思考"}',
          'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","replyId":"reply_model","blockId":"plan","delta":"正在分析。"}'
        ].join("\n\n") + "\n\n"
      )
    );
    await flushPromises();

    expect(updates.at(-1)?.thinkingBlocks).toMatchObject([
      {
        id: "reply_model:plan",
        content: "正在分析。",
        loading: true
      }
    ]);

    controller?.enqueue(
      encoder.encode(
        [
          'event:THINKING_BLOCK_END\ndata:{"type":"THINKING_BLOCK_END","replyId":"reply_model","blockId":"plan"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n") + "\n\n"
      )
    );
    controller?.close();

    await expect(promise).resolves.toMatchObject({
      thinkingBlocks: [
        {
          id: "reply_model:plan",
          content: "正在分析。",
          loading: false
        }
      ]
    });
  });

  it("does not finish thinking block loading from the agent end event", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () =>
        [
          'event:THINKING_BLOCK_START\ndata:{"type":"THINKING_BLOCK_START","replyId":"reply_model","blockId":"plan"}',
          'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","replyId":"reply_model","blockId":"plan","delta":"正在分析。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n")
    } as unknown as Response);

    await expect(sendAgentTestMessageStream("展示思考状态")).resolves.toMatchObject({
      thinkingBlocks: [
        {
          id: "reply_model:plan",
          content: "正在分析。",
          loading: true
        }
      ]
    });
  });

  it("keeps separate text blocks ordered by event id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () =>
        [
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","replyId":"reply_text_a","blockId":"intro","delta":"第一段回复。"}',
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","toolCallId":"call_1","toolCallName":"execute"}',
          'event:TOOL_CALL_DELTA\ndata:{"type":"TOOL_CALL_DELTA","toolCallId":"call_1","delta":"{\\"command\\":\\"ls -la\\"}"}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","toolCallId":"call_1","result":{"exitCode":0}}',
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","replyId":"reply_text_b","blockId":"summary","delta":"第二段回复。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n")
    } as unknown as Response);

    await expect(sendAgentTestMessageStream("执行命令并总结")).resolves.toMatchObject({
      reply: "第一段回复。第二段回复。",
      textBlocks: [
        {
          id: "reply_text_a:intro",
          content: "第一段回复。"
        },
        {
          id: "reply_text_b:summary",
          content: "第二段回复。"
        }
      ],
      parts: [
        { type: "text", id: "reply_text_a:intro" },
        { type: "tool", id: "call_1" },
        { type: "text", id: "reply_text_b:summary" }
      ]
    });
  });

  it("normalizes the real AgentController test stream into AI response parts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () =>
        [
          'event:AGENT_START\ndata:{"type":"AGENT_START","id":"agent_1","replyId":"reply_root","name":"default","role":"assistant"}',
          'event:MODEL_CALL_START\ndata:{"type":"MODEL_CALL_START","id":"model_1","replyId":"reply_model"}',
          'event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","replyId":"reply_model","blockId":"thinking","delta":"先确认当前目录。"}',
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","replyId":"reply_model","toolCallId":"call_1","toolCallName":"list_files"}',
          'event:TOOL_CALL_DELTA\ndata:{"type":"TOOL_CALL_DELTA","replyId":"reply_model","toolCallId":"call_1","delta":"{\\"path\\": \\".\\"}"}',
          'event:TOOL_CALL_END\ndata:{"type":"TOOL_CALL_END","replyId":"reply_model","toolCallId":"call_1"}',
          'event:TOOL_RESULT_START\ndata:{"type":"TOOL_RESULT_START","replyId":"reply_tool","toolCallId":"call_1","toolCallName":"list_files"}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","replyId":"reply_tool","toolCallId":"call_1","state":"success"}',
          'event:MODEL_CALL_END\ndata:{"type":"MODEL_CALL_END","replyId":"reply_model","usage":{"inputTokens":9588,"outputTokens":83,"totalTokens":9671}}',
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","replyId":"reply_text","blockId":"text","delta":"当前文件夹包含 **packages** 和 docs。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END","replyId":"reply_root"}'
        ].join("\n\n")
    } as unknown as Response);

    await expect(sendAgentTestMessageStream("帮我查看当前文件夹有哪些文件")).resolves.toMatchObject({
      done: true,
      thinking: "先确认当前目录。",
      thinkingBlocks: [
        {
          id: "reply_model:thinking",
          content: "先确认当前目录。"
        }
      ],
      reply: "当前文件夹包含 **packages** 和 docs。",
      textBlocks: [
        {
          id: "reply_text:text",
          content: "当前文件夹包含 **packages** 和 docs。"
        }
      ],
      operations: [
        expect.objectContaining({
          id: "agent-reply_root",
          status: "done",
          title: "Agent 执行"
        }),
        expect.objectContaining({
          id: "model-reply_model",
          status: "done",
          title: "模型调用",
          rows: expect.arrayContaining([
            { label: "inputTokens", value: "9588" },
            { label: "outputTokens", value: "83" },
            { label: "totalTokens", value: "9671" }
          ])
        })
      ],
      toolCalls: [
        {
          id: "call_1",
          title: "list_files",
          subTitle: "call_1",
          input: { path: "." },
          output: { state: "success" },
          status: "done"
        }
      ],
      parts: [
        { type: "operation", id: "agent-reply_root" },
        { type: "operation", id: "model-reply_model" },
        { type: "thinking", id: "reply_model:thinking" },
        { type: "tool", id: "call_1" },
        { type: "text", id: "reply_text:text" }
      ]
    });
  });

  it("normalizes structured data blocks into AgentScope operation cards", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      text: async () =>
        [
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"rag","delta":"{\\"kind\\":\\"rag\\",\\"subTitle\\":\\"项目资料\\",\\"list\\":[{\\"title\\":\\"README\\",\\"content\\":\\"Airelia desktop app\\",\\"footer\\":\\"README.md\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"rag"}',
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"web-search","delta":"{\\"kind\\":\\"web_search\\",\\"subTitle\\":\\"Transformer 领域的重要研究\\",\\"list\\":[{\\"title\\":\\"Transformer 登上 Nature\\",\\"subTitle\\":\\"新闻\\",\\"link\\":\\"https://example.com/article\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"web-search"}',
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"todo","delta":"{\\"kind\\":\\"todo\\",\\"title\\":\\"Task List\\",\\"list\\":[{\\"title\\":\\"查看当前目录\\",\\"status\\":\\"done\\"},{\\"title\\":\\"总结文件\\",\\"status\\":\\"running\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"todo"}',
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"operate","delta":"{\\"kind\\":\\"operate\\",\\"title\\":\\"读取目录\\",\\"description\\":\\"list_files\\",\\"rows\\":[{\\"label\\":\\"path\\",\\"value\\":\\".\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"operate"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END","replyId":"reply_root"}'
        ].join("\n\n")
    } as unknown as Response);

    await expect(sendAgentTestMessageStream("查看资料")).resolves.toMatchObject({
      ragCards: [
        {
          id: "rag",
          subTitle: "项目资料",
          list: [{ title: "README", content: "Airelia desktop app", footer: "README.md" }]
        }
      ],
      webSearchCards: [
        {
          id: "web-search",
          subTitle: "Transformer 领域的重要研究",
          list: [
            {
              title: "Transformer 登上 Nature",
              subTitle: "新闻",
              link: "https://example.com/article",
              icon: "https://example.com/favicon.ico"
            }
          ]
        }
      ],
      todoCards: [
        {
          id: "todo",
          title: "Task List",
          list: [
            { title: "查看当前目录", status: "done" },
            { title: "总结文件", status: "running" }
          ]
        }
      ],
      operateCards: [
        {
          id: "operate",
          title: "读取目录",
          description: "list_files",
          rows: [{ label: "path", value: "." }]
        }
      ],
      parts: [
        { type: "rag", id: "rag" },
        { type: "webSearch", id: "web-search" },
        { type: "todo", id: "todo" },
        { type: "operate", id: "operate" }
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
