import { ChallengeDirectory } from "./challenge-directory";

export async function Leaderboard({
  variant = "full",
}: {
  variant?: "preview" | "full";
}) {
  return <ChallengeDirectory variant={variant} />;
}
