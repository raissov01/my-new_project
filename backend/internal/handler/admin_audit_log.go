package handler

import (
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// AdminAuditLogHandler — read-only viewer over admin_audit_log.
type AdminAuditLogHandler struct {
	db *gorm.DB
}

func NewAdminAuditLog(db *gorm.DB) *AdminAuditLogHandler {
	return &AdminAuditLogHandler{db: db}
}

type adminAuditRow struct {
	ID            string  `json:"id"`
	AdminUserID   string  `json:"adminUserId"`
	AdminEmail    string  `json:"adminEmail"`
	AdminUsername string  `json:"adminUsername"`
	Action        string  `json:"action"`
	TargetType    string  `json:"targetType"`
	TargetID      *string `json:"targetId,omitempty"`
	BeforeValue   *string `json:"beforeValue,omitempty"`
	AfterValue    *string `json:"afterValue,omitempty"`
	IPAddress     *string `json:"ipAddress,omitempty"`
	CreatedAt     string  `json:"createdAt"`
}

type adminAuditResponse struct {
	Items      []adminAuditRow `json:"items"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	PageSize   int             `json:"pageSize"`
	TotalPages int             `json:"totalPages"`
}

// auditScanRow matches the SELECT columns below.
type auditScanRow struct {
	ID            string
	AdminUserID   string
	AdminEmail    *string
	AdminUsername *string
	Action        string
	TargetType    string
	TargetID      *string
	BeforeValue   *string
	AfterValue    *string
	IPAddress     *string
	CreatedAt     string
}

// List handles GET /admin/audit-log.
func (h *AdminAuditLogHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, pageSize := parsePagination(q.Get("page"), q.Get("pageSize"), 50, 200)
	action := strings.TrimSpace(q.Get("action"))
	adminID := strings.TrimSpace(q.Get("adminId"))

	args := []any{}
	where := []string{}
	if action != "" {
		where = append(where, "a.action = ?")
		args = append(args, action)
	}
	if adminID != "" {
		where = append(where, "a.admin_user_id = ?")
		args = append(args, adminID)
	}
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	var total int64
	countTx := h.db.WithContext(r.Context()).Model(&models.AdminAuditLog{})
	if action != "" {
		countTx = countTx.Where("action = ?", action)
	}
	if adminID != "" {
		countTx = countTx.Where("admin_user_id = ?", adminID)
	}
	if err := countTx.Count(&total).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count audit log", err)
		return
	}

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, pageSize, (page-1)*pageSize)
	listQuery := `
		SELECT
		  a.id,
		  a.admin_user_id,
		  u.email    AS admin_email,
		  u.username AS admin_username,
		  a.action,
		  a.target_type,
		  a.target_id,
		  a.before_value::text AS before_value,
		  a.after_value::text  AS after_value,
		  a.ip_address,
		  to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM admin_audit_log a
		LEFT JOIN users u ON u.id = a.admin_user_id
		` + whereSQL + `
		ORDER BY a.created_at DESC
		LIMIT ? OFFSET ?`

	var rows []auditScanRow
	if err := h.db.WithContext(r.Context()).Raw(listQuery, listArgs...).Scan(&rows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list audit log", err)
		return
	}

	out := make([]adminAuditRow, 0, len(rows))
	for _, r := range rows {
		row := adminAuditRow{
			ID:          r.ID,
			AdminUserID: r.AdminUserID,
			Action:      r.Action,
			TargetType:  r.TargetType,
			TargetID:    r.TargetID,
			BeforeValue: r.BeforeValue,
			AfterValue:  r.AfterValue,
			IPAddress:   r.IPAddress,
			CreatedAt:   r.CreatedAt,
		}
		if r.AdminEmail != nil {
			row.AdminEmail = *r.AdminEmail
		}
		if r.AdminUsername != nil {
			row.AdminUsername = *r.AdminUsername
		}
		out = append(out, row)
	}

	writeJSON(w, http.StatusOK, adminAuditResponse{
		Items:      out,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages(total, pageSize),
	})
}
