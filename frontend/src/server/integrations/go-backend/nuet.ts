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
  topicId?: string;
  section: "full" | "math" | "critical_thinking";
  status: "in_progress" | "completed" | "abandoned";
  answers?: string;
  correctMath: number;
  correctCt: number;
  scoreMath: number;
  scoreCt: number;
  scoreTotal: number;
  timeTakenSecs: number;
  violationCount: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  scoreAvailable: boolean;
  scoreReason?: string;
  evaluations?: Array<{
    question: number;
    section: "math" | "critical_thinking";
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
  explanation: string;
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
