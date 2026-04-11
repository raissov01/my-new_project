import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { LessonClient } from "./client";

export default async function LessonPage(props: { params: Promise<{ lessonId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { lessonId } = await props.params;
  return <LessonClient lessonId={lessonId} />;
}
