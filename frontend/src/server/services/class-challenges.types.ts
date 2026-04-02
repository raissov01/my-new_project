export type OwnedGroup = {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
  createdAt: string;
};

export type AvailableClassChallengeSet = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
};

export type MyClassChallenge = {
  id: string;
  title: string;
  deadline: string | null;
  createdAt: string;
  groupName: string;
  setTitle: string;
  isOwner: boolean;
  joined: boolean;
  participantCount: number;
};
