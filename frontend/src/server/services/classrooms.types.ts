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

export type TeacherClassroomDetail = {
  group: TeacherClassroomGroup;
  members: TeacherClassroomMember[];
  assignments: TeacherClassroomAssignment[];
  challenges: TeacherClassroomChallenge[];
  progress: TeacherClassroomProgress[];
};
