export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface RuntimeResponse {
  agentRuntime: string;
  javaVersion: string;
  agentScopeHarnessAvailable: boolean;
  harnessProbeClass: string;
}

export interface AgentEchoResponse {
  reply: string;
  agent: string;
  timestamp: string;
}

const apiBaseUrl = window.airelia?.apiUrl ?? "";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/api/health");
}

export function fetchRuntime(): Promise<RuntimeResponse> {
  return requestJson<RuntimeResponse>("/api/runtime");
}

export function sendAgentEcho(message: string): Promise<AgentEchoResponse> {
  return requestJson<AgentEchoResponse>("/api/agent/echo", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

