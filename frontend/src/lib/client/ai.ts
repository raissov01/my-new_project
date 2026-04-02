const DEFAULT_AI_REQUEST_TIMEOUT_MS = 180_000;
const MIN_AI_REQUEST_TIMEOUT_MS = 120_000;
const MAX_AI_REQUEST_TIMEOUT_MS = 300_000;

/**
 * Resolves the API base URL for client-side requests.
 *
 * - When NEXT_PUBLIC_API_URL is unset: uses "/api/v1" through the reverse proxy.
 * - When NEXT_PUBLIC_API_URL is set: uses that backend URL directly
 *   (for example "https://api.studywithraissov.com/api/v1").
 *
 * This keeps the frontend deployable behind the same domain or against a
 * separate backend host without code changes.
 */
function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
}

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
    const response = await fetch(`${getApiBase()}/ai/generate`, {
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
      data = {
        error: "NON_JSON_ERROR",
        detail: rawText.slice(0, 400) || `Server returned ${response.status}`,
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
