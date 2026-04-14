export type TeacherDashboardGroup = {
  id: string;
  name: string;
  joinCode: string;
  createdAt: string;
  membersCount: number;
  assignmentsCount: number;
  challengesCount: number;
};

export type DashboardTopStudent = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  accuracy: number;
  completionTime: number;
  mistakes: number;
  attempts: number;
};

export type TeacherDashboardSummary = {
  groups: TeacherDashboardGroup[];
  totalStudents: number;
  totalAssignments: number;
  totalChallenges: number;
  topStudents: DashboardTopStudent[];
};

export type StudentDashboardClass = {
  id: string;
  name: string;
  joinedAt: string;
};

export type StudentDashboardAssignment = {
  id: string;
  groupId: string;
  groupName: string;
  setId: string;
  setTitle: string;
  deadline: string | null;
};

export type StudentDashboardChallenge = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  deadline: string | null;
  joined: boolean;
};

export type StudentDashboardSummary = {
  classes: StudentDashboardClass[];
  assignments: StudentDashboardAssignment[];
  challenges: StudentDashboardChallenge[];
};

export type TeacherClassroomGroup = {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
  createdAt: string;
};

export type TeacherClassroomMember = {
  userId: string;
  role: "owner" | "student";
  joinedAt: string;
  username: string;
  avatarUrl: string | null;
  profileRole: "student" | "teacher";
};

export type TeacherClassroomAssignment = {
  id: string;
  setId: string;
  setTitle: string;
  deadline: string | null;
  createdAt: string;
};

export type TeacherClassroomChallenge = {
  id: string;
  title: string;
  setId: string;
  setTitle: string;
  deadline: string | null;
  createdAt: string;
};

export type TeacherClassroomProgress = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  studiedCards: number;
  assignedSetsStarted: number;
  accuracy: number;
  mistakes: number;
};

export type TeacherClassroomQuizAssignment = {
  id: string;
  quizId: string;
  quizTitle: string;
  questionCount: number;
  deadline: string | null;
  createdAt: string;
  completedCount: number;
  totalStudents: number;
  averagePercent: number;
};

export type TeacherClassroomDetail = {
  group: TeacherClassroomGroup;
  members: TeacherClassroomMember[];
  assignments: TeacherClassroomAssignment[];
  quizAssignments: TeacherClassroomQuizAssignment[];
  challenges: TeacherClassroomChallenge[];
  progress: TeacherClassroomProgress[];
};

export type StudentQuizAssignment = {
  id: string;
  groupId: string;
  groupName: string;
  quizId: string;
  quizTitle: string;
  questionCount: number;
  deadline: string | null;
  createdAt: string;
  bestPercentage: number | null;
  attemptsCount: number;
  lastAttemptAt: string | null;
  status: "not_started" | "completed" | "overdue" | "late";
};

export type QuizLeaderboardRow = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  bestPercentage: number | null;
  bestScore: number | null;
  totalQuestions: number | null;
  bestTimeSpent: number | null;
  attemptsCount: number;
  completedAt: string | null;
  late: boolean;
};

export type QuizLeaderboard = {
  quizId: string;
  quizTitle: string;
  groupId: string;
  groupName: string;
  deadline: string | null;
  totalStudents: number;
  rows: QuizLeaderboardRow[];
};

export type QuizQuestionStats = {
  questionId: string;
  questionText: string;
  orderIndex: number;
  attempts: number;
  correct: number;
  incorrect: number;
  skipped: number;
  errorRate: number;
  correctOption: string;
};

export type QuizTeacherStats = {
  quizId: string;
  quizTitle: string;
  groupId: string;
  groupName: string;
  deadline: string | null;
  totalStudents: number;
  completedCount: number;
  averagePercent: number;
  questions: QuizQuestionStats[];
};

export type RecentQuizActivity = {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  percentage: number;
  completedAt: string;
};
