package handler

import (
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

type ProfileWriteHandler struct {
	classroomRepo *repository.Classroom
	env           string
}

func NewProfileWrite(classroomRepo *repository.Classroom, env string) *ProfileWriteHandler {
	return &ProfileWriteHandler{classroomRepo: classroomRepo, env: env}
}

// UpdateRole handles POST /api/v1/profile/role
func (h *ProfileWriteHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var req model.UpdateRoleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	role := strings.TrimSpace(req.Role)
	if role != "student" && role != "teacher" {
		writeError(w, http.StatusBadRequest, "role must be 'student' or 'teacher'", nil)
		return
	}

	if err := h.classroomRepo.UpdateRole(r.Context(), userID, role); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update role", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "role": role})
}
