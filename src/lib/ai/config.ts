const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_UPLOAD_MB = 20;

export type AIConfig = {
  geminiApiKey: string;
  geminiModel: string;
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
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const maxUploadMb = parseMaxUploadMb(process.env.AI_MAX_UPLOAD_MB);

  if (!geminiApiKey) {
    throw new Error("AI_CONFIG_MISSING_API_KEY");
  }

  return {
    geminiApiKey,
    geminiModel,
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
