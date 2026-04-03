"use client";

export type IELTSQuestion = {
  id: string;
  section: "reading" | "writing" | "speaking" | "listening";
  questionType:
    | "task1"
    | "task2"
    | "part1"
    | "part2"
    | "part3"
    | "multiple_choice"
    | "fill_blank"
    | "true_false"
    | "matching";
  difficulty: "easy" | "medium" | "hard";
  mockType: "original" | "predictions" | "cambridge_style";
  topic: string;
  examSet: string;
  questionGroup: string;
  title: string;
  prompt: string;
  content?: string;
  audioScript?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  bandTarget?: string;
  sortOrder: number;
};

export type IELTSQuestionFilters = {
  sections?: string[];
  types?: string[];
  mockTypes?: string[];
  difficulties?: string[];
  topics?: string[];
  bands?: string[];
  examSets?: string[];
};

export type IELTSMockSection = {
  key: "reading" | "listening" | "writing" | "speaking";
  title: string;
  instructions: string;
  durationMinutes: number;
  questions: IELTSQuestion[];
};

export type IELTSMockExam = {
  mockType: "predictions" | "cambridge_style";
  section: "full" | "reading" | "listening" | "writing" | "speaking";
  bandTarget?: string;
  examSet?: string;
  sections: IELTSMockSection[];
  generatedByAI: boolean;
};

function getPublicApiBaseUrl() {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApiUrl) {
    return publicApiUrl.replace(/\/+$/, "");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/+$/, "")}/api/v1`;
  }

  return "/api/v1";
}

async function fetchPublicJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getPublicApiBaseUrl()}${path}`, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "IELTS request failed"
    );
  }

  return data as T;
}

export async function fetchIELTSQuestions(params: {
  section?: string;
  type?: string;
  mockType?: string;
  difficulty?: string;
  topic?: string;
  band?: string;
  examSet?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    qs.set(key, String(value));
  }

  return fetchPublicJson<{
    items: IELTSQuestion[];
    filters?: IELTSQuestionFilters;
  }>(`/ielts/questions${qs.size > 0 ? `?${qs.toString()}` : ""}`);
}

export async function fetchIELTSMockExam(params: {
  mockType: "predictions" | "cambridge_style";
  section: "full" | "reading" | "listening" | "writing" | "speaking";
  band: string;
  examSet?: string;
}) {
  const qs = new URLSearchParams({
    mockType: params.mockType,
    section: params.section,
    band: params.band,
  });

  if (params.examSet) {
    qs.set("examSet", params.examSet);
  }

  return fetchPublicJson<IELTSMockExam>(`/ielts/mock?${qs.toString()}`);
}
