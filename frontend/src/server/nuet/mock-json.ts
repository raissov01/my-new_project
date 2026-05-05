import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

export type NUETParsedMockSummary = {
  source_file: string;
  json_file: string;
  test_type: "trial_test" | "mock_test";
  question_count: number;
  answer_count: number;
  warnings: string[];
};

export type NUETParsedMockQuestion = {
  number: number;
  prompt: string;
  options: Array<{
    label: string;
    text: string;
  }>;
  answer: string | null;
  raw_answer: string | null;
  warnings: string[];
};

export type NUETParsedMock = {
  source_file: string;
  name: string;
  test_type: "trial_test" | "mock_test";
  parser: string;
  question_count: number;
  answer_count: number;
  warnings: string[];
  questions: NUETParsedMockQuestion[];
};

const JSON_DIR = path.join(process.cwd(), "..", "backend", "nuet-materials", "json");

async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function listNUETParsedMocks(): Promise<NUETParsedMockSummary[]> {
  const indexPath = path.join(JSON_DIR, "index.json");
  const data = await readJSON<NUETParsedMockSummary[]>(indexPath);
  return Array.isArray(data) ? data : [];
}

export async function getNUETParsedMockByJSONFile(jsonFile: string): Promise<NUETParsedMock | null> {
  const filePath = path.join(JSON_DIR, jsonFile);
  return readJSON<NUETParsedMock>(filePath);
}

export async function getNUETParsedMockByName(name: string): Promise<NUETParsedMock | null> {
  const index = await listNUETParsedMocks();
  const match = index.find((item) => path.basename(item.source_file, ".pdf") === name);
  if (!match) return null;
  return getNUETParsedMockByJSONFile(match.json_file);
}
