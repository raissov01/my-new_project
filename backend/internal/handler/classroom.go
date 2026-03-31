package handler

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

// Classroom handles read-only classroom/challenge routes used by Next.js during migration.
type Classroom struct {
	svc *service.Classroom
	env string
}

func NewClassroom(svc *service.Classroom, env string) *Classroom {
	return &Classroom{svc: svc, env: env}
}

func (h *Classroom) isDev() bool {
	return h.env == "development"
}

func (h *Classroom) GetOwnedGroups(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetOwnedGroups(r.Context(), userID)
	if err != nil {
		log.Printf("owned groups error: %v", err)
		msg := "failed to load owned groups"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetAvailableSets(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetAvailableSets(r.Context(), userID)
	if err != nil {
		log.Printf("available sets error: %v", err)
		msg := "failed to load available sets"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetMyChallenges(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetMyChallenges(r.Context(), userID)
	if err != nil {
		log.Printf("my challenges error: %v", err)
		msg := "failed to load class challenges"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetTeacherClassroomDetail(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	groupID := strings.TrimSpace(r.PathValue("groupID"))
	if groupID == "" {
		writeError(w, http.StatusBadRequest, "group id is required", nil)
		return
	}

	resp, err := h.svc.GetTeacherClassroomDetail(r.Context(), userID, groupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "classroom not found", err)
			return
		}

		log.Printf("teacher classroom detail error: %v", err)
		msg := "failed to load classroom detail"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Classroom) CreateGroup(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.CreateGroupRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Members = strings.TrimSpace(req.Members)

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "class name is required", nil)
		return
	}

	resp, err := h.svc.CreateGroup(r.Context(), userID, req)
	if err != nil {
		log.Printf("create group error: %v", err)
		msg := "failed to create class"
		status := http.StatusInternalServerError

		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "unknown usernames:"):
			msg = err.Error()
			status = http.StatusBadRequest
		case strings.Contains(normalized, "class name is required"):
			msg = err.Error()
			status = http.StatusBadRequest
		case h.isDev():
			msg = err.Error()
		}

		writeError(w, status, msg, err)
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}
