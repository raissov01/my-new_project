package handler

import (
	"net/http"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type IELTSMaterialHandler struct {
	db *gorm.DB
}

func NewIELTSMaterial(db *gorm.DB) *IELTSMaterialHandler {
	return &IELTSMaterialHandler{db: db}
}

var validCategories = []string{"reading", "writing", "speaking", "listening", "vocabulary", "grammar", "general"}
var validTypes = []string{"lesson", "practice", "tip", "book", "mock_test", "feedback_prompt"}

type materialRequest struct {
	Title     string `json:"title" binding:"required"`
	Content   string `json:"content" binding:"required"`
	Category  string `json:"category" binding:"required"`
	Type      string `json:"type" binding:"required"`
	SortOrder int    `json:"sortOrder"`
}

func (r *materialRequest) validate() string {
	if strings.TrimSpace(r.Title) == "" {
		return "Title is required."
	}
	if strings.TrimSpace(r.Content) == "" {
		return "Content is required."
	}
	if !slices.Contains(validCategories, r.Category) {
		return "Category must be one of: reading, writing, speaking, listening, vocabulary, grammar, general."
	}
	if !slices.Contains(validTypes, r.Type) {
		return "Type must be one of: lesson, practice, tip, book, mock_test, feedback_prompt."
	}
	return ""
}

// List returns all materials, optionally filtered by category and/or type.
// GET /api/v1/ielts/materials?category=reading&type=lesson
func (h *IELTSMaterialHandler) List(c *gin.Context) {
	query := h.db.Order("category ASC, sort_order ASC, created_at DESC")

	if cat := c.Query("category"); cat != "" {
		query = query.Where("category = ?", cat)
	}
	if typ := c.Query("type"); typ != "" {
		query = query.Where("type = ?", typ)
	}

	var materials []models.IELTSMaterial
	if err := query.Find(&materials).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load materials."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": materials})
}

// Get returns a single material by ID.
// GET /api/v1/ielts/materials/:id
func (h *IELTSMaterialHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var material models.IELTSMaterial
	if err := h.db.First(&material, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Material not found."})
		return
	}

	c.JSON(http.StatusOK, material)
}

// Create adds a new material. Requires teacher/admin role.
// POST /api/v1/ielts/materials
func (h *IELTSMaterialHandler) Create(c *gin.Context) {
	var req materialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if msg := req.validate(); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	material := models.IELTSMaterial{
		Title:     strings.TrimSpace(req.Title),
		Content:   strings.TrimSpace(req.Content),
		Category:  req.Category,
		Type:      req.Type,
		SortOrder: req.SortOrder,
	}

	if err := h.db.Create(&material).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create material."})
		return
	}

	c.JSON(http.StatusCreated, material)
}

// Update modifies an existing material. Requires teacher/admin role.
// PUT /api/v1/ielts/materials/:id
func (h *IELTSMaterialHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var existing models.IELTSMaterial
	if err := h.db.First(&existing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Material not found."})
		return
	}

	var req materialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if msg := req.validate(); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	existing.Title = strings.TrimSpace(req.Title)
	existing.Content = strings.TrimSpace(req.Content)
	existing.Category = req.Category
	existing.Type = req.Type
	existing.SortOrder = req.SortOrder

	if err := h.db.Save(&existing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update material."})
		return
	}

	c.JSON(http.StatusOK, existing)
}

// Delete removes a material. Requires teacher/admin role.
// DELETE /api/v1/ielts/materials/:id
func (h *IELTSMaterialHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	result := h.db.Delete(&models.IELTSMaterial{}, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete material."})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Material not found."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
