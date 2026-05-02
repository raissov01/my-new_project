package models

import "time"

// AdminAuditLog records every superadmin mutation for forensic review.
// Inserts MUST be best-effort: a failure to log must not break the action.
type AdminAuditLog struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AdminUserID  string    `gorm:"type:uuid;not null;index:idx_admin_audit_log_admin_created,priority:1" json:"adminUserId"`
	Action       string    `gorm:"type:varchar(64);not null;index:idx_admin_audit_log_action_created,priority:1" json:"action"`
	TargetType   string    `gorm:"type:varchar(32);not null" json:"targetType"`
	TargetID     *string   `gorm:"type:varchar(64);index" json:"targetId,omitempty"`
	BeforeValue  *string   `gorm:"type:jsonb" json:"beforeValue,omitempty"`
	AfterValue   *string   `gorm:"type:jsonb" json:"afterValue,omitempty"`
	IPAddress    *string   `gorm:"type:varchar(45)" json:"ipAddress,omitempty"`
	CreatedAt    time.Time `gorm:"autoCreateTime;index:idx_admin_audit_log_admin_created,priority:2;index:idx_admin_audit_log_action_created,priority:2" json:"createdAt"`
}

func (AdminAuditLog) TableName() string {
	return "admin_audit_log"
}
