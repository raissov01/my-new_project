package handler

import (
	"encoding/json"
	"net/http"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type MaterialNotesHandler struct {
	db *gorm.DB
}

func NewMaterialNotes(db *gorm.DB) *MaterialNotesHandler {
	return &MaterialNotesHandler{db: db}
}

// GetNote returns user's note for a material (or empty default).
func (h *MaterialNotesHandler) GetNote(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	materialID := r.PathValue("materialID")

	var note models.MaterialNote
	if h.db.Where("user_id = ? AND material_id = ?", userID, materialID).First(&note).Error != nil {
		// Return empty default
		jsonOK(w, map[string]any{"note": map[string]any{
			"notes": "", "highlights": "[]", "exercises": "{}", "lastPage": 1,
		}})
		return
	}
	jsonOK(w, map[string]any{"note": note})
}

// SaveNote creates or updates user's note for a material.
func (h *MaterialNotesHandler) SaveNote(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	materialID := r.PathValue("materialID")

	var req struct {
		Notes      *string `json:"notes"`
		Highlights *string `json:"highlights"`
		Exercises  *string `json:"exercises"`
		LastPage   *int    `json:"lastPage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid request", http.StatusBadRequest)
		return
	}

	var note models.MaterialNote
	isNew := h.db.Where("user_id = ? AND material_id = ?", userID, materialID).First(&note).Error != nil

	if isNew {
		note = models.MaterialNote{
			UserID:     userID,
			MaterialID: materialID,
		}
	}

	if req.Notes != nil {
		note.Notes = *req.Notes
	}
	if req.Highlights != nil {
		note.Highlights = *req.Highlights
	}
	if req.Exercises != nil {
		note.Exercises = *req.Exercises
	}
	if req.LastPage != nil {
		note.LastPage = *req.LastPage
	}

	if isNew {
		h.db.Create(&note)
	} else {
		h.db.Save(&note)
	}

	jsonOK(w, map[string]any{"note": note})
}
