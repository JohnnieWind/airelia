import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Airelia workbench landing page", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Airelia 你的桌面智能工作台/i })).toBeInTheDocument();
    expect(screen.queryByText("本地 Agent 已连接")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建任务" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "日常办公" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders content pages full screen without an outer frame", () => {
    render(<App />);

    const appContent = screen.getByTestId("app-content");

    expect(appContent.className).toContain("h-screen");
    expect(appContent.className).toContain("p-0");
    expect(appContent.className).not.toContain("px-4");
    expect(appContent.className).not.toContain("py-3");
    expect(screen.queryByText("本地 Agent 已连接")).not.toBeInTheDocument();
  });

  it("renders sidebar tasks and spaces", () => {
    render(<App />);

    expect(screen.getByText("任务 (5)")).toBeInTheDocument();
    expect(screen.getByText("继续完成未完成任务")).toBeInTheDocument();
    expect(screen.getByText("空间 (1)")).toBeInTheDocument();
    expect(screen.getByText("项目新手指引")).toBeInTheDocument();
  });

  it("keeps sidebar menu horizontal spacing tight", () => {
    render(<App />);

    const sidebar = screen.getByRole("complementary");
    const primaryNavigation = screen.getByRole("navigation", { name: "主导航" });
    const newTaskButton = within(primaryNavigation).getByRole("button", { name: "新建任务" });
    const taskButton = screen.getByRole("button", { name: /继续完成未完成任务/ });

    expect(sidebar.className).toContain("px-1.5");
    expect(sidebar.className).toContain("sm:px-2.5");
    expect(sidebar.className).not.toContain("px-2.5 py");
    expect(sidebar.className).not.toContain("sm:px-5");
    expect(newTaskButton.className).toContain("px-1");
    expect(newTaskButton.className).not.toContain("px-2.5");
    expect(taskButton.className).toContain("px-1");
    expect(taskButton.className).not.toContain("px-2 ");
  });

  it("aligns sidebar list interactions and space typography", () => {
    render(<App />);

    const taskButton = screen.getByRole("button", { name: /继续完成未完成任务/ });
    const guideButton = screen.getByRole("button", { name: /项目新手指引/ });
    const guideLabel = within(guideButton).getByTestId("space-guide-label");
    const generatedIntro = screen.getByText("生成项目功能介绍");
    const taskTitle = within(taskButton).getByTestId("recent-task-title");
    const taskTime = within(taskButton).getByText("2天前");
    const taskList = taskButton.parentElement;

    expect(taskList?.className).toContain("gap-0");
    expect(taskList?.className).not.toContain("gap-2");
    expect(taskButton.className).toContain("cursor-pointer");
    expect(taskButton.className).toContain("gap-0");
    expect(taskButton.className).toContain("py-1");
    expect(taskButton.className).not.toContain("gap-1.5");
    expect(taskButton.className).not.toContain("sm:gap-2");
    expect(taskButton.className).toContain("hover:bg-[#e7e7e5]");
    expect(taskTitle.className).toContain("text-[12px]");
    expect(taskTime.className).toContain("text-[12px]");
    expect(guideLabel.className).toBe(generatedIntro.className);
  });

  it("keeps the primary sidebar navigation compact on desktop", () => {
    render(<App />);

    const primaryNavigation = screen.getByRole("navigation", { name: "主导航" });
    const newTaskButton = within(primaryNavigation).getByRole("button", { name: "新建任务" });
    const newTaskLabel = within(newTaskButton).getByTestId("primary-nav-label");

    expect(primaryNavigation.className).toContain("gap-px");
    expect(primaryNavigation.className).not.toContain("gap-0");
    expect(primaryNavigation.className).not.toContain("gap-1");
    expect(newTaskButton.className).toContain("min-h-7");
    expect(newTaskButton.className).toContain("grid-cols-[14px_minmax(0,1fr)_auto]");
    expect(newTaskButton.className).toContain("gap-2");
    expect(newTaskButton.className).toContain("px-1");
    expect(newTaskButton.className).toContain("leading-none");
    expect(newTaskLabel.className).toContain("text-[14px]");
    expect(newTaskLabel.className).toContain("font-normal");
    expect(newTaskLabel.className).toContain("leading-none");
    expect(newTaskLabel.className).not.toContain("text-[7px]");
    expect(newTaskButton.className).not.toContain("font-semibold");
    expect(newTaskButton.className).not.toContain("sm:text-xs");
  });

  it("renders the composer and best-practice examples", () => {
    render(<App />);

    ["日常办公", "代码开发", "设计创意", "文档处理", "资料调研", "项目推进"].forEach((label) => {
      expect(screen.getByRole("button", { name: label }).className).toContain("text-[13px]");
    });

    expect(screen.getByPlaceholderText("今天帮你做些什么？ @ 引用对话文件，/ 调用技能与指令")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择工作空间" }).className).toContain("text-[10px]");
    expect(screen.getByRole("region", { name: "不知道做什么，试试最佳实践案例" })).toBeInTheDocument();
    expect(screen.getByText("工作总结日报")).toBeInTheDocument();
    expect(screen.getByText("行业研报精读摘要")).toBeInTheDocument();
    expect(screen.getByText("项目数据分析仪表盘")).toBeInTheDocument();
  });

  it("opens the assistant chat from the sidebar and sends messages to the test agent API", async () => {
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
        }
      })
    } as unknown as Response);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "助理" }));

    expect(screen.getByRole("heading", { name: "助理对话" })).toBeInTheDocument();
    expect(screen.queryByText("Spark Design Chat")).not.toBeInTheDocument();
    expect(screen.getByText("等待输入")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("今天想让助理做什么？");
    fireEvent.change(input, { target: { value: "查看当前目录文件" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/agent/test",
        expect.objectContaining({
          body: JSON.stringify({
            sessionId: "1",
            userId: "WUZHENGYU458",
            message: "查看当前目录文件"
          }),
          method: "POST"
        })
      );
    });

    expect(screen.getAllByText("查看当前目录文件").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("正在调用本地测试 Agent")).toBeInTheDocument();

    streamController?.enqueue(
      encoder.encode('event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","blockId":"thinking","delta":"先确认目录结构。"}\n\n')
    );

    expect(await screen.findByText("深度思考")).toBeInTheDocument();
    expect(screen.queryByText("先确认目录结构。")).not.toBeInTheDocument();

    streamController?.enqueue(
      encoder.encode('event:THINKING_BLOCK_DELTA\ndata:{"type":"THINKING_BLOCK_DELTA","blockId":"thinking","delta":"继续读取文件列表。"}\n\n')
    );

    expect(screen.queryByText("先确认目录结构。继续读取文件列表。")).not.toBeInTheDocument();

    streamController?.enqueue(
      encoder.encode(
        [
          'event:TOOL_CALL_START\ndata:{"type":"TOOL_CALL_START","toolCallId":"call_1","toolCallName":"read_file"}',
          'event:TOOL_CALL_DELTA\ndata:{"type":"TOOL_CALL_DELTA","toolCallId":"call_1","delta":"{\\"path\\":\\"README.md\\"}"}',
          'event:TOOL_RESULT_END\ndata:{"type":"TOOL_RESULT_END","toolCallId":"call_1","result":{"files":["README.md","packages","docs"]}}'
        ].join("\n\n") + "\n\n"
      )
    );

    expect(await screen.findByText("读取文件")).toBeInTheDocument();
    expect(await screen.findByText("call_1")).toBeInTheDocument();
    expect(screen.queryByText("Input")).not.toBeInTheDocument();
    expect(screen.queryByText("Output")).not.toBeInTheDocument();
    expect(screen.queryByText("README.md")).not.toBeInTheDocument();

    streamController?.enqueue(
      encoder.encode(
        [
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"当前目录包含 **README.md**、"}',
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"packages 和 docs。<script>bad()</script>"}'
        ].join("\n\n") + "\n\n"
      )
    );
    streamController?.close();

    expect(await screen.findByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("README.md").tagName).toBe("STRONG");
    expect(screen.getByText(/packages 和 docs/)).toBeInTheDocument();
    expect(document.querySelector("script")).not.toBeInTheDocument();
    expect(screen.getByText("完成")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("keeps assistant chat content scrollable while the composer stays fixed", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "助理" }));

    const chatPanel = screen.getByTestId("agent-chat-panel");
    const scrollRegion = screen.getByTestId("agent-chat-scroll-region");
    const scrollList = document.querySelector("#agent-chat-scroll-list");
    const composer = screen.getByTestId("agent-chat-composer");

    expect(screen.getByTestId("agent-chat-page").className).toContain("max-w-none");
    expect(chatPanel.className).toContain("min-h-0");
    expect(chatPanel.className).toContain("overflow-hidden");
    expect(chatPanel.className).not.toContain("rounded");
    expect(chatPanel.className).not.toContain("border ");
    expect(scrollRegion.className).toContain("min-h-0");
    expect(scrollRegion.className).toContain("flex-1");
    expect(scrollRegion.className).toContain("overflow-hidden");
    expect(scrollList?.className).toContain("h-full");
    expect(scrollList?.className).toContain("overflow-y-auto");
    expect(composer.className).toContain("sticky");
    expect(composer.className).toContain("bottom-0");
    expect(composer.className).toContain("shrink-0");
    expect(scrollRegion.contains(composer)).toBe(false);
  });

  it("stops generating when the agent end event arrives before the HTTP stream closes", async () => {
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
        }
      })
    } as unknown as Response);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "助理" }));

    const input = screen.getByPlaceholderText("今天想让助理做什么？");
    fireEvent.change(input, { target: { value: "结束后停止" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await screen.findByText("正在调用本地测试 Agent");

    streamController?.enqueue(
      encoder.encode(
        [
          'event:TEXT_BLOCK_DELTA\ndata:{"type":"TEXT_BLOCK_DELTA","delta":"已经完成。"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n") + "\n\n"
      )
    );

    expect(await screen.findByText("已经完成。")).toBeInTheDocument();
    expect(await screen.findByText("完成")).toBeInTheDocument();
    await waitFor(() => {
      expect(input).not.toHaveAttribute("disabled");
    });
  });

  it("renders structured AgentScope response cards from the agent stream", async () => {
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/event-stream;charset=UTF-8"
      },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
        }
      })
    } as unknown as Response);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "助理" }));

    const input = screen.getByPlaceholderText("今天想让助理做什么？");
    fireEvent.change(input, { target: { value: "展示结构化回复" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await screen.findByText("正在调用本地测试 Agent");

    streamController?.enqueue(
      encoder.encode(
        [
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"rag","delta":"{\\"kind\\":\\"rag\\",\\"subTitle\\":\\"项目资料\\",\\"list\\":[{\\"title\\":\\"README\\",\\"content\\":\\"Airelia desktop app\\",\\"footer\\":\\"README.md\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"rag"}',
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"web","delta":"{\\"kind\\":\\"web_search\\",\\"list\\":[{\\"title\\":\\"Transformer 登上 Nature\\",\\"subTitle\\":\\"新闻\\",\\"link\\":\\"https://example.com/article\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"web"}',
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"todo","delta":"{\\"kind\\":\\"todo\\",\\"title\\":\\"Task List\\",\\"list\\":[{\\"title\\":\\"查看当前目录\\",\\"status\\":\\"done\\"},{\\"title\\":\\"总结文件\\",\\"status\\":\\"running\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"todo"}',
          'event:DATA_BLOCK_DELTA\ndata:{"type":"DATA_BLOCK_DELTA","blockId":"operate","delta":"{\\"kind\\":\\"operate\\",\\"title\\":\\"读取目录\\",\\"description\\":\\"list_files\\",\\"rows\\":[{\\"label\\":\\"path\\",\\"value\\":\\".\\"}]}"}',
          'event:DATA_BLOCK_END\ndata:{"type":"DATA_BLOCK_END","blockId":"operate"}',
          'event:AGENT_END\ndata:{"type":"AGENT_END"}'
        ].join("\n\n") + "\n\n"
      )
    );

    expect(await screen.findByText("知识库检索")).toBeInTheDocument();
    expect(await screen.findByText("联网搜索")).toBeInTheDocument();
    expect(await screen.findByText("Task List")).toBeInTheDocument();
    expect(await screen.findByText("读取目录")).toBeInTheDocument();
    expect(screen.queryByText("README")).not.toBeInTheDocument();
    expect(screen.queryByText("Airelia desktop app")).not.toBeInTheDocument();
    expect(screen.queryByText("Transformer 登上 Nature")).not.toBeInTheDocument();
    expect(screen.queryByText("查看当前目录")).not.toBeInTheDocument();
    expect(screen.queryByText("path")).not.toBeInTheDocument();
  });

  it("does not globally override button font-size utilities", () => {
    const styles = readFileSync("src/styles.css", "utf8");

    expect(styles).toContain("font-family: inherit;");
    expect(styles).not.toContain("font: inherit;");
  });
});
