const DEFAULT_AI_REQUEST_TIMEOUT_MS = 420_000;
const MIN_AI_REQUEST_TIMEOUT_MS = 300_000;
const MAX_AI_REQUEST_TIMEOUT_MS = 600_000;

export function estimateAIRequestTimeoutMs(fileSizeBytes: number) {
  const fileSizeMb = Math.max(1, Math.ceil(fileSizeBytes / (1024 * 1024)));
  const computedTimeout = DEFAULT_AI_REQUEST_TIMEOUT_MS + (fileSizeMb - 1) * 15_000;

  return Math.min(MAX_AI_REQUEST_TIMEOUT_MS, Math.max(MIN_AI_REQUEST_TIMEOUT_MS, computedTimeout));
}

export class AIClientRequestError extends Error {
  constructor(
    message: string,
    public code: "AI_REQUEST_TIMEOUT" | "AI_REQUEST_FAILED"
  ) {
    super(message);
  }
}

export async function requestAIGeneration(
  formData: FormData,
  options?: { timeoutMs?: number }
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_AI_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const rawText = await response.text().catch(() => "");
    let data: {
      error?: string;
      detail?: string;
      cards?: Array<Record<string, unknown>>;
      meta?: Record<string, unknown> | null;
      warnings?: string[];
    } | null = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      const gatewayTimeout =
        response.status === 504 || /504\s+Gateway Time-?out/i.test(rawText);
      const upstreamFailure =
        response.status >= 500 || /50[234]\s+(Bad Gateway|Gateway Time-?out)/i.test(rawText);

      data = {
        error: gatewayTimeout
          ? "UPSTREAM_TIMEOUT"
          : upstreamFailure
            ? "UPSTREAM_ERROR"
            : "NON_JSON_ERROR",
        detail: gatewayTimeout
          ? `Server returned ${response.status || 504} Gateway Time-out.`
          : upstreamFailure
            ? `Server returned ${response.status} while processing the AI request.`
            : rawText.slice(0, 400) || `Server returned ${response.status}`,
      };
    }

    return { response, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIClientRequestError(
        "The AI request took too long and was cancelled.",
        "AI_REQUEST_TIMEOUT"
      );
    }

    throw new AIClientRequestError(
      error instanceof Error ? error.message : "Unknown network failure",
      "AI_REQUEST_FAILED"
    );
  } finally {
    clearTimeout(timeout);
  }
}
