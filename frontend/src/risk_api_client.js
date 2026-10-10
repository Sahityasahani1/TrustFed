// Shared browser helper for Banks, Lenders, and Insurers tabs.
// The API key must never be placed in this file or sent from the browser.
// FLOW: UI -> risk_api_client.js -> risk_api.py (POST /api/assess) -> saved model -> Gemini -> risk_api_client.js -> UI

const CANDIDATE_BASES = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:8001",
  "http://127.0.0.1:8001"
];

let cachedWorkingBase = null;

async function getWorkingBase() {
  if (cachedWorkingBase) return cachedWorkingBase;
  for (const base of CANDIDATE_BASES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.models || data.status === 'ok')) {
          cachedWorkingBase = base;
          return base;
        }
      }
    } catch (_) {}
  }
  return CANDIDATE_BASES[0];
}

export async function checkBackendHealth() {
  for (const base of CANDIDATE_BASES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) {
        const data = await response.json();
        if (data && (data.models || data.status === 'ok')) {
          cachedWorkingBase = base;
          return { ...data, endpoint: base };
        }
      }
    } catch (_) {}
  }
  return { status: "offline", error: "Failed to connect to backend on localhost:8000 or 8001" };
}

export async function assessRisk(domain, userInput, includeAiReasoning = true) {
  const base = cachedWorkingBase || (await getWorkingBase());
  const startTime = performance.now();

  const response = await fetch(`${base}/api/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain, // "banks" | "lenders" | "insurers"
      user_input: userInput,
      include_ai_reasoning: includeAiReasoning,
    }),
  });

  const durationMs = Math.round(performance.now() - startTime);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || `Risk API returned ${response.status}`);
  }

  // Attach client-side round-trip telemetry
  return {
    ...result,
    telemetry: {
      endpoint: base,
      client_latency_ms: durationMs,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function assessBatchRisk(domain, records) {
  const base = cachedWorkingBase || (await getWorkingBase());
  const startTime = performance.now();

  const response = await fetch(`${base}/api/assess/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain,
      records,
    }),
  });

  const durationMs = Math.round(performance.now() - startTime);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || `Batch Risk API returned ${response.status}`);
  }

  return {
    ...result,
    telemetry: {
      endpoint: base,
      client_latency_ms: durationMs,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function uploadBatchFile(domain, file) {
  const base = cachedWorkingBase || (await getWorkingBase());
  const startTime = performance.now();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("domain", domain);

  const response = await fetch(`${base}/api/assess/upload`, {
    method: "POST",
    body: formData,
  });

  const durationMs = Math.round(performance.now() - startTime);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || `File upload screening returned ${response.status}`);
  }

  return {
    ...result,
    telemetry: {
      endpoint: base,
      client_latency_ms: durationMs,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function fetchSampleBatch(domain) {
  const base = cachedWorkingBase || (await getWorkingBase());
  const response = await fetch(`${base}/api/samples/${domain}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sample records for ${domain}`);
  }
  return await response.json();
}

export function getSampleDownloadUrl(filename) {
  const base = cachedWorkingBase || "http://localhost:8000";
  return `${base}/api/samples/download/${filename}`;
}

/**
 * Stream Gemini 2.5 Flash tokens in real-time using SSE (Server-Sent Events)
 * with low TTFT (< 300ms) and live typewriter feedback.
 */
export async function streamRiskAssessment(domain, userInput, callbacks = {}) {
  const { onToken, onMeta, onDone, onError, signal } = callbacks;
  const base = cachedWorkingBase || (await getWorkingBase());

  try {
    const response = await fetch(`${base}/api/assess/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain,
        user_input: userInput,
      }),
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || `Streaming failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      // Keep unfinished segment in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === "meta" && onMeta) {
              onMeta(parsed);
            } else if (parsed.type === "token" && onToken) {
              onToken(parsed.token);
            } else if (parsed.type === "done" && onDone) {
              onDone(parsed);
            }
          } catch (e) {
            console.warn("Failed to parse SSE line:", trimmed, e);
          }
        }
      }
    }

    if (onDone) {
      onDone({ done: true });
    }
  } catch (err) {
    if (signal?.aborted) return;
    if (onError) onError(err);
    else throw err;
  }
}

/**
 * Get instantaneous telemetry snapshot over HTTP.
 */
export async function getTelemetrySnapshot() {
  const base = cachedWorkingBase || (await getWorkingBase());
  try {
    const res = await fetch(`${base}/api/telemetry`);
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

/**
 * High-frequency WebSocket subscriber for live inference telemetry (P50/P95, throughput, SecAgg).
 */
export function connectTelemetryWebSocket(onTelemetry, onError) {
  let isClosed = false;
  let socket = null;
  let retryTimer = null;

  async function init() {
    if (isClosed) return;
    const base = cachedWorkingBase || (await getWorkingBase());
    const wsUrl = base.replace(/^http/, "ws") + "/ws/telemetry";

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        // Send initial ping to fetch instant snapshot
        socket.send("refresh");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onTelemetry) onTelemetry(data);
        } catch (_) {}
      };

      socket.onerror = (err) => {
        if (onError) onError(err);
      };

      socket.onclose = () => {
        if (!isClosed) {
          retryTimer = setTimeout(init, 3000);
        }
      };
    } catch (err) {
      if (!isClosed) {
        retryTimer = setTimeout(init, 3000);
      }
    }
  }

  init();

  return () => {
    isClosed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (socket) {
      try {
        socket.close();
      } catch (_) {}
    }
  };
}


