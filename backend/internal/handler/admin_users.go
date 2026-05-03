package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/auditlog"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// AdminUsersHandler — read + mutate users from the superadmin panel.
type AdminUsersHandler struct {
	db *gorm.DB
}

func NewAdminUsers(db *gorm.DB) *AdminUsersHandler {
	return &AdminUsersHandler{db: db}
}

// adminUserRow is the projection returned to the admin panel. We intentionally
// drop password hashes and verification tokens (they're already json:"-" on
// the model, but the explicit projection is defensive).
type adminUserRow struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Username      string `json:"username"`
	FullName      string `json:"fullName"`
	Role          string `json:"role"`
	IsSuperadmin  bool   `json:"isSuperadmin"`
	IsActive      bool   `json:"isActive"`
	EmailVerified bool   `json:"emailVerified"`
	Plan          string `json:"plan"`
	StreakDays    int    `json:"streakDays"`
	Points        int    `json:"points"`
	CreatedAt     string `json:"createdAt"`
}

type adminUsersResponse struct {
	Items      []adminUserRow `json:"items"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"pageSize"`
	TotalPages int            `json:"totalPages"`
}

// List handles GET /admin/users. Supports ?format=csv for export — that path
// ignores pagination and dumps up to 50k rows.
func (h *AdminUsersHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, pageSize := parsePagination(q.Get("page"), q.Get("pageSize"), 25, 100)
	search := strings.TrimSpace(q.Get("search"))
	role := strings.TrimSpace(q.Get("role"))
	csvOut := wantsCSV(r)
	if csvOut {
		page = 1
		pageSize = 50000
	}

	tx := h.db.WithContext(r.Context()).Model(&models.User{})
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		tx = tx.Where("LOWER(email) LIKE ? OR LOWER(username) LIKE ? OR LOWER(full_name) LIKE ?", like, like, like)
	}
	if role != "" {
		tx = tx.Where("role = ?", role)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count users", err)
		return
	}

	var users []models.User
	if err := tx.Order("created_at DESC").
		Limit(pageSize).Offset((page - 1) * pageSize).
		Find(&users).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list users", err)
		return
	}

	rows := make([]adminUserRow, 0, len(users))
	for _, u := range users {
		rows = append(rows, adminUserRow{
			ID:            u.ID,
			Email:         u.Email,
			Username:      u.Username,
			FullName:      u.FullName,
			Role:          u.Role,
			IsSuperadmin:  u.IsSuperadmin,
			IsActive:      u.IsActive,
			EmailVerified: u.EmailVerified,
			Plan:          u.Plan,
			StreakDays:    u.StreakDays,
			Points:        u.Points,
			CreatedAt:     u.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}

	if csvOut {
		writeCSV(w, "users",
			[]string{"id", "email", "username", "full_name", "role", "is_superadmin", "is_active", "email_verified", "plan", "streak_days", "points", "created_at"},
			len(rows),
			func(i int) []string {
				row := rows[i]
				return []string{
					row.ID, row.Email, row.Username, row.FullName, row.Role,
					boolStr(row.IsSuperadmin), boolStr(row.IsActive), boolStr(row.EmailVerified),
					row.Plan, intStr(row.StreakDays), intStr(row.Points), row.CreatedAt,
				}
			})
		return
	}

	writeJSON(w, http.StatusOK, adminUsersResponse{
		Items:      rows,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages(total, pageSize),
	})
}

func boolStr(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func intStr(n int) string {
	return strconv.Itoa(n)
}

type adminUserPatchRequest struct {
	IsActive     *bool   `json:"isActive,omitempty"`
	IsSuperadmin *bool   `json:"isSuperadmin,omitempty"`
	Role         *string `json:"role,omitempty"`
}

// Patch handles PATCH /admin/users/:id.
func (h *AdminUsersHandler) Patch(w http.ResponseWriter, r *http.Request) {
	targetID := strings.TrimSpace(r.PathValue("id"))
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "missing user id", nil)
		return
	}

	var req adminUserPatchRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	adminID, _ := middleware.UserIDFromContext(r.Context())
	if strings.TrimSpace(adminID) == "" {
		adminID = strings.TrimSpace(r.Header.Get("X-User-ID"))
	}

	// Self-protection: a superadmin can't accidentally lock themselves out.
	if targetID == adminID {
		if req.IsSuperadmin != nil && !*req.IsSuperadmin {
			writeError(w, http.StatusBadRequest, "cannot revoke your own superadmin", nil)
			return
		}
		if req.IsActive != nil && !*req.IsActive {
			writeError(w, http.StatusBadRequest, "cannot deactivate yourself", nil)
			return
		}
	}

	var before models.User
	if err := h.db.WithContext(r.Context()).First(&before, "id = ?", targetID).Error; err != nil {
		writeError(w, http.StatusNotFound, "user not found", err)
		return
	}

	updates := map[string]any{}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.IsSuperadmin != nil {
		updates["is_superadmin"] = *req.IsSuperadmin
	}
	if req.Role != nil {
		role := strings.TrimSpace(*req.Role)
		switch role {
		case "student", "teacher", "admin":
			updates["role"] = role
		default:
			writeError(w, http.StatusBadRequest, "invalid role (must be student|teacher|admin)", nil)
			return
		}
	}
	if len(updates) == 0 {
		writeError(w, http.StatusBadRequest, "no fields to update", nil)
		return
	}

	if err := h.db.WithContext(r.Context()).Model(&before).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update user", err)
		return
	}

	var after models.User
	h.db.WithContext(r.Context()).First(&after, "id = ?", targetID)

	auditlog.Record(
		h.db, adminID, "user.patch", "user", &targetID,
		summarizeUserAudit(before), summarizeUserAudit(after),
		ipFromContext(r),
	)

	writeJSON(w, http.StatusOK, summarizeUserAudit(after))
}

func summarizeUserAudit(u models.User) map[string]any {
	return map[string]any{
		"id":            u.ID,
		"email":         u.Email,
		"role":          u.Role,
		"isSuperadmin":  u.IsSuperadmin,
		"isActive":      u.IsActive,
		"emailVerified": u.EmailVerified,
		"plan":          u.Plan,
	}
}

// parsePagination clamps and defaults page/pageSize query params.
func parsePagination(rawPage, rawSize string, defaultSize, maxSize int) (int, int) {
	page := 1
	if n, err := strconv.Atoi(strings.TrimSpace(rawPage)); err == nil && n > 0 {
		page = n
	}
	size := defaultSize
	if n, err := strconv.Atoi(strings.TrimSpace(rawSize)); err == nil && n > 0 {
		size = n
	}
	if size > maxSize {
		size = maxSize
	}
	return page, size
}

func totalPages(total int64, pageSize int) int {
	if pageSize <= 0 {
		return 0
	}
	pages := int(total / int64(pageSize))
	if total%int64(pageSize) != 0 {
		pages++
	}
	return pages
}

// ipFromContext extracts the request IP, preferring proxy-forwarded headers.
func ipFromContext(r *http.Request) *string {
	candidates := []string{
		firstIP(r.Header.Get("X-Forwarded-For")),
		r.Header.Get("X-Real-IP"),
		stripPort(r.RemoteAddr),
	}
	for _, c := range candidates {
		if s := strings.TrimSpace(c); s != "" {
			return &s
		}
	}
	return nil
}
