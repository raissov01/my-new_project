// Package auditlog provides a small, dependency-free helper to record
// superadmin mutations into the admin_audit_log table.
//
// Logging is best-effort: callers should NOT abort the user-facing
// operation when Record returns an error.
package auditlog

import (
	"encoding/json"
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// Record inserts an audit row. before/after may be any JSON-serialisable
// value (or nil). Returns the inserted row's ID, or empty string on error.
func Record(db *gorm.DB, adminUserID, action, targetType string, targetID *string, before, after any, ipAddress *string) string {
	if db == nil || adminUserID == "" || action == "" {
		return ""
	}

	row := models.AdminAuditLog{
		AdminUserID: adminUserID,
		Action:      action,
		TargetType:  targetType,
		TargetID:    targetID,
		IPAddress:   ipAddress,
	}

	if before != nil {
		if b, err := json.Marshal(before); err == nil {
			s := string(b)
			row.BeforeValue = &s
		}
	}
	if after != nil {
		if b, err := json.Marshal(after); err == nil {
			s := string(b)
			row.AfterValue = &s
		}
	}

	if err := db.Create(&row).Error; err != nil {
		log.Printf("auditlog.Record failed: %v", err)
		return ""
	}
	return row.ID
}
