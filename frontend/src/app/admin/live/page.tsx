import { Activity } from "lucide-react";
import { AdminPageHeader, ComingSoon } from "../_components/coming-soon";

export const metadata = { title: "Live activity — Admin" };

export default function AdminLivePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Live activity" />
      <ComingSoon
        icon={Activity}
        body="A real-time feed of who is currently on the site, opening quizzes, and answering questions. Auto-refreshes every 10 seconds."
      />
    </div>
  );
}
