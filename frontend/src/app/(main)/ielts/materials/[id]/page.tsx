import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { ReaderClient } from "./client";

type Material = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  type: string;
  difficulty: string;
  filePath: string;
};

export default async function MaterialReaderPage(props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await props.params;

  let material: Material;
  try {
    material = await fetchBackendJson<Material>({
      path: `/api/v1/ielts/materials/${id}`,
      userId: user.id,
    });
  } catch {
    redirect("/ielts/materials");
  }

  return <ReaderClient material={material} userId={user.id} />;
}
