export const AI_REQUEST_TIMEOUT_MS = 60_000;

export class AIClientRequestError extends Error {
  constructor(
    message: string,
    public code: "AI_REQUEST_TIMEOUT" | "AI_REQUEST_FAILED"
  ) {
    super(message);
  }
}

export async function requestAIGeneration(formData: FormData) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
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
