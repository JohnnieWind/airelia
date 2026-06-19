/** 后端健康检查接口返回的数据结构。 */
export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

/** 运行时探测接口返回的数据结构，用于确认 Java 和 AgentScope Harness 状态。 */
export interface RuntimeResponse {
  agentRuntime: string;
  javaVersion: string;
  agentScopeHarnessAvailable: boolean;
  harnessProbeClass: string;
}

/** 临时 echo Agent 的响应结构，后续可替换为真正的 Agent 执行结果。 */
export interface AgentEchoResponse {
  reply: string;
  agent: string;
  timestamp: string;
}

// Electron preload 会注入 API 地址；浏览器开发模式下走 Vite proxy。
const apiBaseUrl = window.airelia?.apiUrl ?? "";

// 统一封装 JSON 请求，集中处理基础地址、请求头和 HTTP 错误。
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  // fetch 只有网络错误才会 reject，这里把 4xx/5xx 也转为异常交给界面处理。
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** 获取后端服务的健康状态。 */
export function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/api/health");
}

/** 获取本地 Agent 运行时探测信息。 */
export function fetchRuntime(): Promise<RuntimeResponse> {
  return requestJson<RuntimeResponse>("/api/runtime");
}

/** 向脚手架 Agent 发送一条消息并接收 echo 响应。 */
export function sendAgentEcho(message: string): Promise<AgentEchoResponse> {
  return requestJson<AgentEchoResponse>("/api/agent/echo", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}
