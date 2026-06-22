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

/** 测试 Agent 接口的请求体，前端对话页保持固定 session/user 以匹配当前后端契约。 */
export interface AgentTestRequest {
  sessionId: string;
  userId: string;
  message: string;
}

/** 测试 Agent 接口返回结构暂不固定，保留原始 JSON 交给页面做兼容展示。 */
export type AgentTestResponse = Record<string, unknown>;

export type AgentToolPayload = string | Record<string, unknown>;

export interface AgentToolCall {
  id: string;
  title: string;
  subTitle: string;
  input: AgentToolPayload;
  output: AgentToolPayload;
  status: "running" | "done" | "error";
}

export interface AgentStreamEvent {
  type: string;
  event?: string;
  data: unknown;
}

export interface AgentStreamSnapshot {
  done: boolean;
  reply: string;
  thinking: string;
  toolCalls: AgentToolCall[];
  events: AgentStreamEvent[];
}

export interface AgentStreamHandlers {
  onEvent?: (event: AgentStreamEvent, snapshot: AgentStreamSnapshot) => void;
  onUpdate?: (snapshot: AgentStreamSnapshot) => void;
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

/** 向本地测试 Agent 发送一条消息。 */
export async function sendAgentTestMessage(message: string): Promise<AgentTestResponse> {
  const response = await postAgentTestMessage(message);

  if (!response.ok) {
    throw new Error(await getAgentTestErrorMessage(response));
  }

  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";

  if (contentType.includes("text/event-stream")) {
    const snapshot = await readAgentEventStream(response);

    return {
      reply: snapshot.reply.trim() || "Agent 已完成执行，但没有返回可展示文本。"
    };
  }

  return response.json() as Promise<AgentTestResponse>;
}

/** 向本地测试 Agent 发送消息，并在 SSE 每个事件到达时推送快照。 */
export async function sendAgentTestMessageStream(message: string, handlers: AgentStreamHandlers = {}): Promise<AgentStreamSnapshot> {
  const response = await postAgentTestMessage(message);

  if (!response.ok) {
    throw new Error(await getAgentTestErrorMessage(response));
  }

  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";

  if (contentType.includes("text/event-stream")) {
    return readAgentEventStream(response, handlers);
  }

  const payload = (await response.json()) as AgentTestResponse;
  const snapshot: AgentStreamSnapshot = {
    done: true,
    reply: extractAgentReplyFromJson(payload),
    thinking: "",
    toolCalls: [],
    events: []
  };

  handlers.onUpdate?.(cloneSnapshot(snapshot));

  return snapshot;
}

function postAgentTestMessage(message: string): Promise<Response> {
  const request: AgentTestRequest = {
    sessionId: "1",
    userId: "user001",
    message
  };

  return fetch(`${apiBaseUrl}/api/agent/test`, {
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST",
    body: JSON.stringify(request)
  });
}

async function getAgentTestErrorMessage(response: Response): Promise<string> {
  if (response.status === 503) {
    return "测试模型 API Key 未配置，请设置 AIRELIA_AGENT_TEST_API_KEY 后重启后端服务。";
  }

  return `Request failed with ${response.status}`;
}

async function readAgentEventStream(response: Response, handlers: AgentStreamHandlers = {}): Promise<AgentStreamSnapshot> {
  const snapshot = createEmptySnapshot();
  const toolBuffers = new Map<string, AgentToolBuffer>();

  if (!response.body) {
    return readRawAgentEventStream(await response.text(), snapshot, toolBuffers, handlers);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    buffer += decoder.decode(value, { stream: !done });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      publishSseBlock(block, snapshot, toolBuffers, handlers);

      if (snapshot.done) {
        await reader.cancel();
        return cloneSnapshot(snapshot);
      }
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    publishSseBlock(buffer, snapshot, toolBuffers, handlers);
  }

  return cloneSnapshot(snapshot);
}

function readRawAgentEventStream(
  rawStream: string,
  snapshot: AgentStreamSnapshot,
  toolBuffers: Map<string, AgentToolBuffer>,
  handlers: AgentStreamHandlers
): AgentStreamSnapshot {
  rawStream
    .split(/\r?\n\r?\n/)
    .filter((block) => block.trim())
    .some((block) => {
      publishSseBlock(block, snapshot, toolBuffers, handlers);

      return snapshot.done;
    });

  return cloneSnapshot(snapshot);
}

function publishSseBlock(
  block: string,
  snapshot: AgentStreamSnapshot,
  toolBuffers: Map<string, AgentToolBuffer>,
  handlers: AgentStreamHandlers
) {
  const event = parseSseBlock(block);

  if (!event) {
    return;
  }

  applyAgentStreamEvent(snapshot, event, toolBuffers);

  const nextSnapshot = cloneSnapshot(snapshot);
  handlers.onEvent?.(event, nextSnapshot);
  handlers.onUpdate?.(nextSnapshot);
}

function parseSseBlock(block: string): AgentStreamEvent | null {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];
  let eventName: string | undefined;

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  const rawData = dataLines.join("\n");
  const data = parsePossibleJson(rawData);
  const type = isRecord(data) && typeof data.type === "string" ? data.type : eventName || "message";

  return {
    type,
    event: eventName,
    data
  };
}

function applyAgentStreamEvent(snapshot: AgentStreamSnapshot, event: AgentStreamEvent, toolBuffers: Map<string, AgentToolBuffer>) {
  snapshot.events.push(event);

  const eventType = event.type.toUpperCase();
  const delta = getStringField(event.data, "delta");

  if (eventType.includes("THINKING") && delta) {
    snapshot.thinking += delta;
    return;
  }

  if (isAssistantTextDelta(eventType) && delta) {
    snapshot.reply += delta;
    return;
  }

  if (eventType.includes("TOOL")) {
    applyToolEvent(snapshot, event, toolBuffers);
  }

  if (isAgentTerminalEvent(eventType)) {
    snapshot.done = true;
  }
}

function isAgentTerminalEvent(eventType: string): boolean {
  return eventType === "AGENT_END" || eventType === "REQUEST_STOP" || eventType === "EXCEED_MAX_ITERS";
}

function isAssistantTextDelta(eventType: string): boolean {
  if (!eventType.includes("DELTA")) {
    return false;
  }

  if (eventType.includes("THINKING") || eventType.includes("TOOL")) {
    return false;
  }

  return eventType.includes("TEXT") || eventType.includes("MESSAGE") || eventType.includes("CONTENT");
}

interface AgentToolBuffer {
  inputText: string;
  outputText: string;
  tool: AgentToolCall;
}

function applyToolEvent(snapshot: AgentStreamSnapshot, event: AgentStreamEvent, toolBuffers: Map<string, AgentToolBuffer>) {
  const payload = event.data;

  if (!isRecord(payload)) {
    return;
  }

  const eventType = event.type.toUpperCase();
  const toolId = getFirstStringField(payload, ["toolCallId", "tool_call_id", "callId", "id"]) ?? `tool-${toolBuffers.size + 1}`;
  const toolName = getFirstStringField(payload, ["toolCallName", "tool_name", "toolName", "functionName", "name"]);
  const buffer = getOrCreateToolBuffer(toolBuffers, toolId, toolName);

  if (toolName) {
    buffer.tool.title = toolName;
  }

  if (eventType.includes("START")) {
    buffer.tool.status = "running";
    buffer.tool.input = readToolValue(payload, ["input", "arguments", "args", "params"], buffer.tool.input);
  }

  if (eventType.includes("CALL") && typeof payload.delta === "string") {
    buffer.inputText += payload.delta;
    buffer.tool.input = parsePossibleJson(buffer.inputText) as AgentToolPayload;
  }

  if (eventType.includes("RESULT") || eventType.includes("OUTPUT")) {
    if (typeof payload.delta === "string") {
      buffer.outputText += payload.delta;
      buffer.tool.output = parsePossibleJson(buffer.outputText) as AgentToolPayload;
    } else if (hasAnyField(payload, ["result", "output", "content", "data"])) {
      buffer.tool.output = readToolValue(payload, ["result", "output", "content", "data"], payload);
    }
  }

  if (eventType.includes("END")) {
    const state = getFirstStringField(payload, ["state", "status"])?.toLowerCase();
    buffer.tool.status = state === "error" || state === "failed" ? "error" : "done";
  }

  snapshot.toolCalls = Array.from(toolBuffers.values()).map((toolBuffer) => ({ ...toolBuffer.tool }));
}

function getOrCreateToolBuffer(toolBuffers: Map<string, AgentToolBuffer>, toolId: string, toolName?: string): AgentToolBuffer {
  const existingTool = toolBuffers.get(toolId);

  if (existingTool) {
    return existingTool;
  }

  const toolBuffer: AgentToolBuffer = {
    inputText: "",
    outputText: "",
    tool: {
      id: toolId,
      title: toolName || "Call Tool",
      subTitle: toolId,
      input: {},
      output: {
        status: "running"
      },
      status: "running"
    }
  };

  toolBuffers.set(toolId, toolBuffer);

  return toolBuffer;
}

function readToolValue(record: Record<string, unknown>, fields: string[], fallback: unknown): AgentToolPayload {
  for (const field of fields) {
    const value = record[field];

    if (value !== undefined && value !== null) {
      return normalizeToolPayload(value);
    }
  }

  return normalizeToolPayload(fallback);
}

function normalizeToolPayload(value: unknown): AgentToolPayload {
  if (typeof value === "string") {
    return parsePossibleJson(value) as AgentToolPayload;
  }

  if (isRecord(value)) {
    return value;
  }

  return {
    value
  };
}

function createEmptySnapshot(): AgentStreamSnapshot {
  return {
    done: false,
    reply: "",
    thinking: "",
    toolCalls: [],
    events: []
  };
}

function cloneSnapshot(snapshot: AgentStreamSnapshot): AgentStreamSnapshot {
  return {
    done: snapshot.done,
    reply: snapshot.reply,
    thinking: snapshot.thinking,
    toolCalls: snapshot.toolCalls.map((toolCall) => ({ ...toolCall })),
    events: snapshot.events.map((event) => ({ ...event }))
  };
}

function extractAgentReplyFromJson(response: AgentTestResponse): string {
  const knownTextFields = ["reply", "message", "content", "output", "result"];

  for (const field of knownTextFields) {
    const value = response[field];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return extractTextFragments(response).join("").trim() || JSON.stringify(response, null, 2);
}

function extractTextFragments(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractTextFragments);
  }

  const record = value as Record<string, unknown>;
  const directTextFields = ["delta", "content", "message", "reply", "text", "output"];

  for (const field of directTextFields) {
    const fieldValue = record[field];

    if (typeof fieldValue === "string" && fieldValue) {
      return [fieldValue];
    }
  }

  return ["data", "payload", "message", "content"]
    .flatMap((field) => extractTextFragments(record[field]))
    .filter(Boolean);
}

function parsePossibleJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function getFirstStringField(value: unknown, fields: string[]): string | undefined {
  for (const field of fields) {
    const fieldValue = getStringField(value, field);

    if (fieldValue) {
      return fieldValue;
    }
  }

  return undefined;
}

function hasAnyField(value: unknown, fields: string[]): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  return fields.some((field) => value[field] !== undefined && value[field] !== null);
}

function getStringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldValue = value[field];

  return typeof fieldValue === "string" ? fieldValue : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
