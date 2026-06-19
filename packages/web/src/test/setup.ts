import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  // 每个测试结束后卸载 React 树，保持 DOM 环境干净。
  cleanup();
});
