import { ScrollText } from "lucide-react";
import { AdminPageHeader, ComingSoon } from "../_components/coming-soon";

export const metadata = { title: "Audit log — Admin" };

export default function AdminAuditLogPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Audit log" />
      <ComingSoon
        icon={ScrollText}
        body="Every admin action — role changes, quiz hides, deactivations — recorded with actor, before/after state, and IP."
      />
    </div>
  );
}
