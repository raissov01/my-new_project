import { Users } from "lucide-react";
import { AdminPageHeader, ComingSoon } from "../_components/coming-soon";

export const metadata = { title: "Users — Admin" };

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" />
      <ComingSoon
        icon={Users}
        body="Search and manage every account: change role, deactivate, grant superadmin. Backend endpoints already live."
      />
    </div>
  );
}
