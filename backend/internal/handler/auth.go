package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/auth"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db        *gorm.DB
	jwtSecret string
}

func NewAuth(db *gorm.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret}
}

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"fullName" binding:"required"`
	Username string `json:"username" binding:"required,min=2"`
	Role     string `json:"role" binding:"required,oneof=student teacher"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type authResponse struct {
	Token string       `json:"token"`
	User  models.User  `json:"user"`
}

// Register creates a new user account.
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check email uniqueness
	var existing models.User
	if err := h.db.Where("email = ?", strings.ToLower(strings.TrimSpace(req.Email))).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "An account with this email already exists."})
		return
	}

	// Check username uniqueness
	if err := h.db.Where("username = ?", strings.TrimSpace(req.Username)).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "This username is already taken."})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password."})
		return
	}

	user := models.User{
		Email:        strings.ToLower(strings.TrimSpace(req.Email)),
		PasswordHash: string(hash),
		FullName:     strings.TrimSpace(req.FullName),
		Username:     strings.TrimSpace(req.Username),
		Role:         req.Role,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account."})
		return
	}

	token, err := auth.GenerateToken(h.jwtSecret, user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session."})
		return
	}

	c.JSON(http.StatusCreated, authResponse{Token: token, User: user})
}

// Login authenticates a user and returns a JWT.
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", strings.ToLower(strings.TrimSpace(req.Email))).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password."})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password."})
		return
	}

	token, err := auth.GenerateToken(h.jwtSecret, user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session."})
		return
	}

	c.JSON(http.StatusOK, authResponse{Token: token, User: user})
}

// Me returns the current authenticated user's profile.
func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found."})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateRole changes the user's role.
func (h *AuthHandler) UpdateRole(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Role string `json:"role" binding:"required,oneof=student teacher"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userID).Update("role", req.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "role": req.Role})
}
