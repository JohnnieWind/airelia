import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders the Airelia workbench landing page", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Airelia 你的桌面智能工作台/i })).toBeInTheDocument();
    expect(screen.getByText("本地 Agent 已连接")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建任务" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "日常办公" })).toHaveAttribute("aria-pressed", "true");
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

    expect(screen.getByPlaceholderText("今天帮你做些什么？ @ 引用对话文件，/ 调用技能与指令")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择工作空间" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "不知道做什么，试试最佳实践案例" })).toBeInTheDocument();
    expect(screen.getByText("工作总结日报")).toBeInTheDocument();
    expect(screen.getByText("行业研报精读摘要")).toBeInTheDocument();
    expect(screen.getByText("项目数据分析仪表盘")).toBeInTheDocument();
  });
});
