package handler

import (
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/auditlog"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// AdminQuizzesHandler — read + moderate quizzes from the superadmin panel.
type AdminQuizzesHandler struct {
	db *gorm.DB
}

func NewAdminQuizzes(db *gorm.DB) *AdminQuizzesHandler {
	return &AdminQuizzesHandler{db: db}
}

type adminQuizRow struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	OwnerID         string `json:"ownerId"`
	OwnerEmail      string `json:"ownerEmail"`
	OwnerUsername   string `json:"ownerUsername"`
	IsPublic        bool   `json:"isPublic"`
	IsHiddenByAdmin bool   `json:"isHiddenByAdmin"`
	QuestionCount   int    `json:"questionCount"`
	AttemptCount    int    `json:"attemptCount"`
	CreatedAt       string `json:"createdAt"`
}

type adminQuizzesResponse struct {
	Items      []adminQuizRow `json:"items"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"pageSize"`
	TotalPages int            `json:"totalPages"`
}

// adminQuizScanRow matches the SELECT columns we use below.
type adminQuizScanRow struct {
	ID              string
	Title           string
	OwnerID         string
	OwnerEmail      string
	OwnerUsername   string
	IsPublic        bool
	IsHiddenByAdmin bool
	QuestionCount   int
	AttemptCount    int
	CreatedAt       string
}

// List handles GET /admin/quizzes.
func (h *AdminQuizzesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, pageSize := parsePagination(q.Get("page"), q.Get("pageSize"), 25, 100)
	search := strings.TrimSpace(q.Get("search"))
	isPublicFilter := strings.TrimSpace(q.Get("isPublic")) // "true"/"false"/""

	args := []any{}
	where := []string{}
	if search != "" {
		where = append(where, "LOWER(z.title) LIKE ?")
		args = append(args, "%"+strings.ToLower(search)+"%")
	}
	if isPublicFilter == "true" {
		where = append(where, "z.is_public = TRUE")
	} else if isPublicFilter == "false" {
		where = append(where, "z.is_public = FALSE")
	}
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	// Count first (no joins needed).
	var total int64
	countQuery := "SELECT COUNT(*) FROM quizzes z " + whereSQL
	if err := h.db.WithContext(r.Context()).Raw(countQuery, args...).Scan(&total).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count quizzes", err)
		return
	}

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, pageSize, (page-1)*pageSize)
	listQuery := `
		SELECT
		  z.id                     AS id,
		  z.title                  AS title,
		  z.user_id                AS owner_id,
		  COALESCE(u.email,'')     AS owner_email,
		  COALESCE(u.username,'')  AS owner_username,
		  z.is_public              AS is_public,
		  z.is_hidden_by_admin     AS is_hidden_by_admin,
		  COALESCE(qc.cnt, 0)      AS question_count,
		  COALESCE(ac.cnt, 0)      AS attempt_count,
		  to_char(z.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM quizzes z
		LEFT JOIN users u ON u.id = z.user_id
		LEFT JOIN (SELECT quiz_id, COUNT(*) AS cnt FROM quiz_questions GROUP BY quiz_id) qc ON qc.quiz_id = z.id
		LEFT JOIN (SELECT quiz_id, COUNT(*) AS cnt FROM quiz_attempts  GROUP BY quiz_id) ac ON ac.quiz_id = z.id
		` + whereSQL + `
		ORDER BY z.created_at DESC
		LIMIT ? OFFSET ?`

	var rows []adminQuizScanRow
	if err := h.db.WithContext(r.Context()).Raw(listQuery, listArgs...).Scan(&rows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list quizzes", err)
		return
	}

	out := make([]adminQuizRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, adminQuizRow{
			ID:              r.ID,
			Title:           r.Title,
			OwnerID:         r.OwnerID,
			OwnerEmail:      r.OwnerEmail,
			OwnerUsername:   r.OwnerUsername,
			IsPublic:        r.IsPublic,
			IsHiddenByAdmin: r.IsHiddenByAdmin,
			QuestionCount:   r.QuestionCount,
			AttemptCount:    r.AttemptCount,
			CreatedAt:       r.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, adminQuizzesResponse{
		Items:      out,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages(total, pageSize),
	})
}

type adminQuizPatchRequest struct {
	IsPublic        *bool `json:"isPublic,omitempty"`
	IsHiddenByAdmin *bool `json:"isHiddenByAdmin,omitempty"`
}

// Patch handles PATCH /admin/quizzes/:id.
func (h *AdminQuizzesHandler) Patch(w http.ResponseWriter, r *http.Request) {
	quizID := strings.TrimSpace(r.PathValue("id"))
	if quizID == "" {
		writeError(w, http.StatusBadRequest, "missing quiz id", nil)
		return
	}

	var req adminQuizPatchRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	var before models.Quiz
	if err := h.db.WithContext(r.Context()).First(&before, "id = ?", quizID).Error; err != nil {
		writeError(w, http.StatusNotFound, "quiz not found", err)
		return
	}

	updates := map[string]any{}
	if req.IsPublic != nil {
		updates["is_public"] = *req.IsPublic
	}
	if req.IsHiddenByAdmin != nil {
		updates["is_hidden_by_admin"] = *req.IsHiddenByAdmin
	}
	if len(updates) == 0 {
		writeError(w, http.StatusBadRequest, "no fields to update", nil)
		return
	}

	if err := h.db.WithContext(r.Context()).Model(&before).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update quiz", err)
		return
	}

	var after models.Quiz
	h.db.WithContext(r.Context()).First(&after, "id = ?", quizID)

	adminID, _ := middleware.UserIDFromContext(r.Context())
	if strings.TrimSpace(adminID) == "" {
		adminID = strings.TrimSpace(r.Header.Get("X-User-ID"))
	}

	auditlog.Record(
		h.db, adminID, "quiz.patch", "quiz", &quizID,
		summarizeQuizAudit(before), summarizeQuizAudit(after),
		ipFromContext(r),
	)

	writeJSON(w, http.StatusOK, summarizeQuizAudit(after))
}

func summarizeQuizAudit(q models.Quiz) map[string]any {
	return map[string]any{
		"id":              q.ID,
		"title":           q.Title,
		"isPublic":        q.IsPublic,
		"isHiddenByAdmin": q.IsHiddenByAdmin,
	}
}

