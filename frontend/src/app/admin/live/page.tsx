import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { AdminPageHeader } from "../_components/coming-soon";
import { LiveFeedClient } from "./LiveFeedClient";

export const metadata = { title: "Live activity — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Live activity"
        description="Last 5 minutes of quiz events, refreshed every 10 seconds."
      />
      <LiveFeedClient />
    </div>
  );
}
