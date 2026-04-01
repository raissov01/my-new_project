const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_MAX_UPLOAD_MB = 20;

export type AIConfig = {
  provider: "openai" | "gemini";
  apiKey: string;
  model: string;
  maxUploadBytes: number;
};

function parseMaxUploadMb(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_MB;
  }
  return parsed;
}

export function getAIConfig(): AIConfig {
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const openaiModel = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const maxUploadMb = parseMaxUploadMb(process.env.AI_MAX_UPLOAD_MB);

  if (openaiApiKey) {
    return {
      provider: "openai",
      apiKey: openaiApiKey,
      model: openaiModel,
      maxUploadBytes: maxUploadMb * 1024 * 1024,
    };
  }

  if (!geminiApiKey) {
    throw new Error("AI_CONFIG_MISSING_API_KEY");
  }

  return {
    provider: "gemini",
    apiKey: geminiApiKey,
    model: geminiModel,
    maxUploadBytes: maxUploadMb * 1024 * 1024,
  };
}

export function getAIConfigSafe() {
  try {
    return getAIConfig();
  } catch {
    return null;
  }
}
