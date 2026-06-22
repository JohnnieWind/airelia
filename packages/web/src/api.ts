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

export interface AgentOperationCardRow {
  label: string;
  value: string;
}

export interface AgentOperationCard {
  id: string;
  title: string;
  description?: string;
  status?: "idle" | "running" | "done" | "error";
  rows: AgentOperationCardRow[];
}

export interface AgentRagCard {
  id: string;
  title?: string;
  subTitle?: string;
  list: {
    title: string;
    content: string;
    footer: string;
    images?: string[];
    link?: string;
  }[];
}

export interface AgentWebSearchCard {
  id: string;
  title?: string;
  subTitle?: string;
  list: {
    title: string;
    subTitle?: string;
    link: string;
    icon: string;
  }[];
}

export interface AgentTodoCard {
  id: string;
  title?: string;
  defaultOpen?: boolean;
  list: {
    title: string;
    status: "done" | "todo" | "running";
  }[];
}

export interface AgentThinkingBlock {
  id: string;
  content: string;
  title?: string;
  subTitle?: string;
}

export interface AgentTextBlock {
  id: string;
  content: string;
}

export interface AgentStreamEvent {
  type: string;
  event?: string;
  data: unknown;
}

export type AgentStreamPart =
  | { type: "thinking"; id: string }
  | { type: "text"; id: string }
  | { type: "tool"; id: string }
  | { type: "operation"; id: string }
  | { type: "operate"; id: string }
  | { type: "rag"; id: string }
  | { type: "webSearch"; id: string }
  | { type: "todo"; id: string };

export interface AgentStreamSnapshot {
  done: boolean;
  reply: string;
  thinking: string;
  thinkingBlocks: AgentThinkingBlock[];
  textBlocks: AgentTextBlock[];
  toolCalls: AgentToolCall[];
  operations: AgentOperationCard[];
  operateCards: AgentOperationCard[];
  ragCards: AgentRagCard[];
  webSearchCards: AgentWebSearchCard[];
  todoCards: AgentTodoCard[];
  parts: AgentStreamPart[];
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
    thinkingBlocks: [],
    textBlocks: [],
    toolCalls: [],
    operations: [],
    operateCards: [],
    ragCards: [],
    webSearchCards: [],
    todoCards: [],
    parts: [],
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
  const operationBuffers = new Map<string, AgentOperationCard>();
  const dataBlockBuffers = new Map<string, string>();

  if (!response.body) {
    return readRawAgentEventStream(await response.text(), snapshot, toolBuffers, operationBuffers, dataBlockBuffers, handlers);
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
      publishSseBlock(block, snapshot, toolBuffers, operationBuffers, dataBlockBuffers, handlers);

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
    publishSseBlock(buffer, snapshot, toolBuffers, operationBuffers, dataBlockBuffers, handlers);
  }

  return cloneSnapshot(snapshot);
}

function readRawAgentEventStream(
  rawStream: string,
  snapshot: AgentStreamSnapshot,
  toolBuffers: Map<string, AgentToolBuffer>,
  operationBuffers: Map<string, AgentOperationCard>,
  dataBlockBuffers: Map<string, string>,
  handlers: AgentStreamHandlers
): AgentStreamSnapshot {
  rawStream
    .split(/\r?\n\r?\n/)
    .filter((block) => block.trim())
    .some((block) => {
      publishSseBlock(block, snapshot, toolBuffers, operationBuffers, dataBlockBuffers, handlers);

      return snapshot.done;
    });

  return cloneSnapshot(snapshot);
}

function publishSseBlock(
  block: string,
  snapshot: AgentStreamSnapshot,
  toolBuffers: Map<string, AgentToolBuffer>,
  operationBuffers: Map<string, AgentOperationCard>,
  dataBlockBuffers: Map<string, string>,
  handlers: AgentStreamHandlers
) {
  const event = parseSseBlock(block);

  if (!event) {
    return;
  }

  applyAgentStreamEvent(snapshot, event, toolBuffers, operationBuffers, dataBlockBuffers);

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

function applyAgentStreamEvent(
  snapshot: AgentStreamSnapshot,
  event: AgentStreamEvent,
  toolBuffers: Map<string, AgentToolBuffer>,
  operationBuffers: Map<string, AgentOperationCard>,
  dataBlockBuffers: Map<string, string>
) {
  snapshot.events.push(event);

  const eventType = event.type.toUpperCase();
  const delta = getStringField(event.data, "delta");

  applyOperationEvent(snapshot, event, operationBuffers);

  if (eventType.includes("DATA_BLOCK")) {
    applyDataBlockEvent(snapshot, event, dataBlockBuffers);
  }

  if (eventType.includes("THINKING") && delta) {
    applyThinkingEvent(snapshot, event, delta);
    return;
  }

  if (isAssistantTextDelta(eventType) && delta) {
    applyTextEvent(snapshot, event, delta);
    return;
  }

  if (eventType.includes("TOOL")) {
    applyToolEvent(snapshot, event, toolBuffers);
  }

  if (isAgentTerminalEvent(eventType)) {
    snapshot.done = true;
  }
}

function applyThinkingEvent(snapshot: AgentStreamSnapshot, event: AgentStreamEvent, delta: string) {
  const payload = isRecord(event.data) ? event.data : {};
  const thinkingId = getThinkingBlockId(payload);
  const thinkingBlock = getOrCreateThinkingBlock(snapshot, thinkingId, payload);

  appendPartOnce(snapshot, { type: "thinking", id: thinkingId });
  thinkingBlock.content += delta;
  snapshot.thinking += delta;
}

function applyTextEvent(snapshot: AgentStreamSnapshot, event: AgentStreamEvent, delta: string) {
  const payload = isRecord(event.data) ? event.data : {};
  const textId = getStreamBlockId(payload, "reply");
  const textBlock = getOrCreateTextBlock(snapshot, textId);

  appendPartOnce(snapshot, { type: "text", id: textId });
  textBlock.content += delta;
  snapshot.reply += delta;
}

function getThinkingBlockId(payload: Record<string, unknown>): string {
  return getStreamBlockId(payload, "thinking");
}

function getStreamBlockId(payload: Record<string, unknown>, fallbackId: string): string {
  const blockId = getFirstStringField(payload, ["blockId", "block_id", "id"]) ?? fallbackId;
  const replyId = getFirstStringField(payload, ["replyId", "reply_id"]);

  return replyId ? `${replyId}:${blockId}` : blockId;
}

function getOrCreateThinkingBlock(
  snapshot: AgentStreamSnapshot,
  id: string,
  payload: Record<string, unknown>
): AgentThinkingBlock {
  const existingBlock = snapshot.thinkingBlocks.find((block) => block.id === id);

  if (existingBlock) {
    return existingBlock;
  }

  const thinkingBlock: AgentThinkingBlock = {
    id,
    content: "",
    title: getStringField(payload, "title"),
    subTitle: getStringField(payload, "subTitle") ?? getStringField(payload, "subtitle")
  };

  snapshot.thinkingBlocks.push(thinkingBlock);

  return thinkingBlock;
}

function getOrCreateTextBlock(snapshot: AgentStreamSnapshot, id: string): AgentTextBlock {
  const existingBlock = snapshot.textBlocks.find((block) => block.id === id);

  if (existingBlock) {
    return existingBlock;
  }

  const textBlock: AgentTextBlock = {
    id,
    content: ""
  };

  snapshot.textBlocks.push(textBlock);

  return textBlock;
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

function applyOperationEvent(snapshot: AgentStreamSnapshot, event: AgentStreamEvent, operationBuffers: Map<string, AgentOperationCard>) {
  const payload = event.data;

  if (!isRecord(payload)) {
    return;
  }

  const eventType = event.type.toUpperCase();

  if (eventType === "AGENT_START") {
    const operation = upsertOperation(operationBuffers, getOperationId("agent", payload), "Agent 执行");
    appendPartOnce(snapshot, { type: "operation", id: operation.id });
    operation.status = "running";
    operation.description = getFirstStringField(payload, ["name", "role", "source"]) ?? "assistant";
    updateOperations(snapshot, operationBuffers);
    return;
  }

  if (eventType === "AGENT_END") {
    const operation = operationBuffers.get(getOperationId("agent", payload));

    if (operation) {
      operation.status = "done";
      updateOperations(snapshot, operationBuffers);
    }

    return;
  }

  if (eventType === "MODEL_CALL_START") {
    const operation = upsertOperation(operationBuffers, getOperationId("model", payload), "模型调用");
    appendPartOnce(snapshot, { type: "operation", id: operation.id });
    operation.status = "running";
    updateOperations(snapshot, operationBuffers);
    return;
  }

  if (eventType === "MODEL_CALL_END") {
    const operation = operationBuffers.get(getOperationId("model", payload));

    if (operation) {
      operation.status = "done";
      operation.rows = rowsFromUsage(payload.usage);
      updateOperations(snapshot, operationBuffers);
    }
  }
}

function getOperationId(prefix: string, payload: Record<string, unknown>): string {
  return `${prefix}-${getFirstStringField(payload, ["replyId", "id"]) ?? "current"}`;
}

function upsertOperation(operationBuffers: Map<string, AgentOperationCard>, id: string, title: string): AgentOperationCard {
  const existingOperation = operationBuffers.get(id);

  if (existingOperation) {
    return existingOperation;
  }

  const operation: AgentOperationCard = {
    id,
    title,
    status: "running",
    rows: []
  };

  operationBuffers.set(id, operation);

  return operation;
}

function updateOperations(snapshot: AgentStreamSnapshot, operationBuffers: Map<string, AgentOperationCard>) {
  snapshot.operations = Array.from(operationBuffers.values()).map((operation) => ({
    ...operation,
    rows: operation.rows.map((row) => ({ ...row }))
  }));
}

function rowsFromUsage(usage: unknown): AgentOperationCardRow[] {
  if (!isRecord(usage)) {
    return [];
  }

  return ["inputTokens", "outputTokens", "totalTokens", "time"]
    .filter((field) => usage[field] !== undefined && usage[field] !== null)
    .map((field) => ({
      label: field,
      value: String(usage[field])
    }));
}

function applyDataBlockEvent(snapshot: AgentStreamSnapshot, event: AgentStreamEvent, dataBlockBuffers: Map<string, string>) {
  const payload = event.data;

  if (!isRecord(payload)) {
    return;
  }

  const blockId = getFirstStringField(payload, ["blockId", "id"]) ?? `data-${dataBlockBuffers.size + 1}`;
  const eventType = event.type.toUpperCase();

  if (eventType === "DATA_BLOCK_DELTA" && typeof payload.delta === "string") {
    dataBlockBuffers.set(blockId, `${dataBlockBuffers.get(blockId) ?? ""}${payload.delta}`);
    return;
  }

  if (eventType !== "DATA_BLOCK_END") {
    return;
  }

  const parsedData = parsePossibleJson(dataBlockBuffers.get(blockId) ?? "");

  if (!isRecord(parsedData)) {
    dataBlockBuffers.delete(blockId);
    return;
  }

  appendStructuredDataCard(snapshot, blockId, parsedData);
  dataBlockBuffers.delete(blockId);
}

function appendStructuredDataCard(snapshot: AgentStreamSnapshot, blockId: string, data: Record<string, unknown>) {
  const kind = getFirstStringField(data, ["kind", "type", "code", "cardType"])?.toLowerCase().replaceAll("-", "_");

  if (kind === "rag" || kind === "knowledge" || kind === "knowledge_retrieval") {
    snapshot.ragCards.push(normalizeRagCard(blockId, data));
    appendPartOnce(snapshot, { type: "rag", id: blockId });
    return;
  }

  if (kind === "web_search" || kind === "search") {
    snapshot.webSearchCards.push(normalizeWebSearchCard(blockId, data));
    appendPartOnce(snapshot, { type: "webSearch", id: blockId });
    return;
  }

  if (kind === "todo" || kind === "todo_list" || kind === "task_list") {
    snapshot.todoCards.push(normalizeTodoCard(blockId, data));
    appendPartOnce(snapshot, { type: "todo", id: blockId });
    return;
  }

  if (kind === "operate" || kind === "operation" || kind === "operate_card") {
    snapshot.operateCards.push(normalizeOperateCard(blockId, data));
    appendPartOnce(snapshot, { type: "operate", id: blockId });
  }
}

function normalizeRagCard(id: string, data: Record<string, unknown>): AgentRagCard {
  return {
    id,
    title: getStringField(data, "title"),
    subTitle: getStringField(data, "subTitle") ?? getStringField(data, "subtitle"),
    list: toRecordArray(data.list).map((item) => ({
      title: getStringField(item, "title") ?? "未命名资料",
      content: getStringField(item, "content") ?? stringifyUnknown(item.content ?? ""),
      footer: getStringField(item, "footer") ?? getStringField(item, "source") ?? "",
      images: toStringArray(item.images),
      link: getStringField(item, "link")
    }))
  };
}

function normalizeWebSearchCard(id: string, data: Record<string, unknown>): AgentWebSearchCard {
  return {
    id,
    title: getStringField(data, "title"),
    subTitle: getStringField(data, "subTitle") ?? getStringField(data, "subtitle"),
    list: toRecordArray(data.list).map((item) => {
      const link = getStringField(item, "link") ?? getStringField(item, "url") ?? "";

      return {
        title: getStringField(item, "title") ?? link,
        subTitle: getStringField(item, "subTitle") ?? getStringField(item, "subtitle") ?? getStringField(item, "source"),
        link,
        icon: getStringField(item, "icon") ?? faviconFromLink(link)
      };
    })
  };
}

function normalizeTodoCard(id: string, data: Record<string, unknown>): AgentTodoCard {
  return {
    id,
    title: getStringField(data, "title"),
    defaultOpen: typeof data.defaultOpen === "boolean" ? data.defaultOpen : true,
    list: toRecordArray(data.list).map((item) => ({
      title: getStringField(item, "title") ?? stringifyUnknown(item),
      status: normalizeTodoStatus(getStringField(item, "status"))
    }))
  };
}

function normalizeOperateCard(id: string, data: Record<string, unknown>): AgentOperationCard {
  return {
    id,
    title: getStringField(data, "title") ?? "AI 操作",
    description: getStringField(data, "description") ?? getStringField(data, "subTitle") ?? getStringField(data, "subtitle"),
    status: normalizeOperationStatus(getStringField(data, "status")),
    rows: toOperationRows(data.rows ?? data.body ?? data.data)
  };
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
  appendPartOnce(snapshot, { type: "tool", id: toolId });

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
    } else if (eventType.includes("END")) {
      const state = getFirstStringField(payload, ["state", "status"]);

      if (state) {
        buffer.tool.output = { state };
      }
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
    thinkingBlocks: [],
    textBlocks: [],
    toolCalls: [],
    operations: [],
    operateCards: [],
    ragCards: [],
    webSearchCards: [],
    todoCards: [],
    parts: [],
    events: []
  };
}

function cloneSnapshot(snapshot: AgentStreamSnapshot): AgentStreamSnapshot {
  return {
    done: snapshot.done,
    reply: snapshot.reply,
    thinking: snapshot.thinking,
    thinkingBlocks: snapshot.thinkingBlocks.map((block) => ({ ...block })),
    textBlocks: snapshot.textBlocks.map((block) => ({ ...block })),
    toolCalls: snapshot.toolCalls.map((toolCall) => ({ ...toolCall })),
    operations: snapshot.operations.map((operation) => ({
      ...operation,
      rows: operation.rows.map((row) => ({ ...row }))
    })),
    operateCards: snapshot.operateCards.map((operation) => ({
      ...operation,
      rows: operation.rows.map((row) => ({ ...row }))
    })),
    ragCards: snapshot.ragCards.map((card) => ({
      ...card,
      list: card.list.map((item) => ({ ...item, images: item.images ? [...item.images] : undefined }))
    })),
    webSearchCards: snapshot.webSearchCards.map((card) => ({
      ...card,
      list: card.list.map((item) => ({ ...item }))
    })),
    todoCards: snapshot.todoCards.map((card) => ({
      ...card,
      list: card.list.map((item) => ({ ...item }))
    })),
    parts: snapshot.parts.map((part) => ({ ...part })),
    events: snapshot.events.map((event) => ({ ...event }))
  };
}

function appendPartOnce(snapshot: AgentStreamSnapshot, part: AgentStreamPart) {
  if (snapshot.parts.some((currentPart) => currentPart.type === part.type && currentPart.id === part.id)) {
    return;
  }

  snapshot.parts.push(part);
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === "string");

  return strings.length ? strings : undefined;
}

function toOperationRows(value: unknown): AgentOperationCardRow[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }

      const label = getStringField(item, "label") ?? getStringField(item, "name") ?? getStringField(item, "key");
      const rawValue = item.value ?? item.content ?? item.data;

      if (!label) {
        return [];
      }

      return [{ label, value: stringifyUnknown(rawValue) }];
    });
  }

  if (isRecord(value)) {
    return Object.entries(value).map(([label, rowValue]) => ({
      label,
      value: stringifyUnknown(rowValue)
    }));
  }

  return [];
}

function normalizeTodoStatus(status?: string): "done" | "todo" | "running" {
  if (status === "done" || status === "running") {
    return status;
  }

  return "todo";
}

function normalizeOperationStatus(status?: string): "idle" | "running" | "done" | "error" | undefined {
  if (status === "idle" || status === "running" || status === "done" || status === "error") {
    return status;
  }

  if (status === "success") {
    return "done";
  }

  if (status === "failed") {
    return "error";
  }

  return undefined;
}

function faviconFromLink(link: string): string {
  try {
    const url = new URL(link);

    return `${url.origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
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
