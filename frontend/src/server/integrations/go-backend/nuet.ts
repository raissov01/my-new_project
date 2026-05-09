import { fetchBackendJson } from "./server";

export type NUETSection = "math" | "critical_thinking";

export type NUETTopic = {
  id: string;
  slug: string;
  section: NUETSection;
  title: string;
  description: string;
  explanation: string;
  difficulty: "beginner" | "medium" | "advanced";
  orderIndex: number;
};

export type NUETMaterial = {
  id: string;
  telegramPostId: number;
  caption: string;
  text: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  hasMedia: boolean;
  tags: string[];
  postDate: string;
};

export type NUETDashboard = {
  totalAttempts: number;
  completedAttempts: number;
  bestScoreMath: number;
  bestScoreCT: number;
  bestScoreTotal: number;
  recentAttempts: Array<Record<string, unknown>>;
  topicCount: number;
  materialCount: number;
  weakTopics?: NUETWeakTopic[];
  strongTopics?: NUETWeakTopic[];
};

export type NUETWeakTopic = {
  slug: string;
  title: string;
  section: "math" | "critical_thinking";
  total: number;
  correct: number;
  accuracy: number;
};

export type NUETPDFTest = {
  id: string;
  name: string;
  testType: "trial_test" | "mock_test";
  pdfPath: string;
  mathCount: number;
  ctCount: number;
  questionCount: number;
  answerKeyCount: number;
  isScorable: boolean;
};

export type NUETAttempt = {
  id: string;
  userId: string;
  attemptType: "full_mock" | "pdf_test" | "topic_practice" | "section_practice";
  pdfTestId?: string;
  pdfTestName?: string;
  topicId?: string;
  topicSlug?: string;
  topicTitle?: string;
  section: "full" | "math" | "critical_thinking";
  status: "in_progress" | "completed" | "abandoned";
  strictMode: boolean;
  answers?: string;
  questionSet?: string;
  results?: string;
  correctMath: number;
  correctCt: number;
  scoreMath: number;
  scoreCt: number;
  scoreTotal: number;
  timeTakenSecs: number;
  violationCount: number;
  startedAt: string;
  completedAt?: string;
  lastSavedAt?: string;
  createdAt: string;
  scoreAvailable: boolean;
  scoreReason?: string;
  evaluations?: Array<{
    question: number;
    questionId?: string;
    section: "math" | "critical_thinking";
    prompt?: string;
    explanation?: string;
    expected: string;
    received: string;
    correct: boolean;
  }>;
};

export type NUETQuestion = {
  id: string;
  topicId: string;
  section: "math" | "critical_thinking";
  difficulty: "beginner" | "medium" | "advanced";
  prompt: string;
  options: string[];
  answer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
};

export type NUETPracticeAnswerInput = {
  questionId: string;
  choice: "A" | "B" | "C" | "D" | "E";
};

export type NUETSimulatorQuestion = {
  id: string;
  number: number;
  section: "math" | "critical_thinking";
  difficulty: "beginner" | "medium" | "advanced";
  prompt: string;
  options: string[];
};

export type NUETSimulatorStartResponse = {
  attempt: NUETAttempt;
  questions: NUETSimulatorQuestion[];
  durationMinutes: number;
  strictMode: boolean;
};

export async function listNUETTopics(
  userId: string,
  section?: NUETSection
): Promise<{ items: NUETTopic[] }> {
  const qs = section ? `?section=${section}` : "";
  return fetchBackendJson<{ items: NUETTopic[] }>({
    path: `/api/v1/nuet/topics${qs}`,
    userId,
  });
}

export async function getNUETTopic(userId: string, slug: string): Promise<NUETTopic> {
  return fetchBackendJson<NUETTopic>({
    path: `/api/v1/nuet/topics/${encodeURIComponent(slug)}`,
    userId,
  });
}

export async function listNUETMaterials(
  userId: string,
  params: {
    section?: "math" | "critical_thinking";
    type?: "mock_test" | "trial_test" | "book" | "notes" | "formulas" | "solutions";
    topic?: string;
    withFile?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ items: NUETMaterial[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.section) qs.set("section", params.section);
  if (params.type) qs.set("type", params.type);
  if (params.topic) qs.set("topic", params.topic);
  if (params.withFile) qs.set("withFile", "true");
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));
  return fetchBackendJson<{ items: NUETMaterial[]; total: number }>({
    path: `/api/v1/nuet/materials?${qs.toString()}`,
    userId,
  });
}

export async function getNUETDashboard(userId: string): Promise<NUETDashboard> {
  return fetchBackendJson<NUETDashboard>({
    path: "/api/v1/nuet/dashboard",
    userId,
  });
}

export async function listNUETPDFTests(userId: string): Promise<{ items: NUETPDFTest[] }> {
  return fetchBackendJson<{ items: NUETPDFTest[] }>({
    path: "/api/v1/nuet/pdf-tests",
    userId,
  });
}

export async function getNUETPDFTest(userId: string, id: string): Promise<NUETPDFTest> {
  return fetchBackendJson<NUETPDFTest>({
    path: `/api/v1/nuet/pdf-tests/${encodeURIComponent(id)}`,
    userId,
  });
}

export async function listNUETQuestions(
  userId: string,
  params: {
    topicSlug?: string;
    topicId?: string;
    section?: "math" | "critical_thinking";
    limit?: number;
  } = {}
): Promise<{ items: NUETQuestion[]; topic?: NUETTopic }> {
  const qs = new URLSearchParams();
  if (params.topicSlug) qs.set("topicSlug", params.topicSlug);
  if (params.topicId) qs.set("topicId", params.topicId);
  if (params.section) qs.set("section", params.section);
  qs.set("limit", String(params.limit ?? 20));

  return fetchBackendJson<{ items: NUETQuestion[]; topic?: NUETTopic }>({
    path: `/api/v1/nuet/questions?${qs.toString()}`,
    userId,
  });
}

export async function listNUETAttempts(
  userId: string,
  params: {
    limit?: number;
    offset?: number;
    status?: "in_progress" | "completed" | "abandoned";
    attemptType?: "full_mock" | "pdf_test" | "topic_practice" | "section_practice";
  } = {}
): Promise<{ attempts: NUETAttempt[]; total: number; limit: number; offset: number }> {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 10));
  qs.set("offset", String(params.offset ?? 0));
  if (params.status) qs.set("status", params.status);
  if (params.attemptType) qs.set("attemptType", params.attemptType);

  return fetchBackendJson<{ attempts: NUETAttempt[]; total: number; limit: number; offset: number }>({
    path: `/api/v1/nuet/attempts?${qs.toString()}`,
    userId,
  });
}

export type NUETDailyChallenge = {
  date: string;
  questions: NUETQuestion[];
};

export async function getNUETDailyChallenge(
  userId: string,
  date?: string
): Promise<NUETDailyChallenge> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return fetchBackendJson<NUETDailyChallenge>({
    path: `/api/v1/nuet/daily-challenge${qs}`,
    userId,
  });
}

export async function getNUETAttempt(userId: string, id: string): Promise<NUETAttempt> {
  return fetchBackendJson<NUETAttempt>({
    path: `/api/v1/nuet/attempts/${encodeURIComponent(id)}`,
    userId,
  });
}

export type NUETSimulatorResume = {
  attempt: NUETAttempt;
  questions: NUETSimulatorQuestion[];
  durationMinutes: number;
  strictMode: boolean;
  responses: Record<string, string>;
  marked: string[];
  timeTakenSecs: number;
  timePerAnswer?: Record<string, number>;
};

export async function getNUETSimulatorResume(
  userId: string,
  attemptId: string
): Promise<NUETSimulatorResume> {
  return fetchBackendJson<NUETSimulatorResume>({
    path: `/api/v1/nuet/simulator/${encodeURIComponent(attemptId)}`,
    userId,
  });
}
