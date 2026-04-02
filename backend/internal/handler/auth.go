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

type updateProfileRequest struct {
	Username  string  `json:"username" binding:"required,min=3"`
	AvatarURL *string `json:"avatarUrl"`
	Bio       *string `json:"bio"`
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

// UpdateProfile changes username/avatar/bio for the authenticated user.
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}

	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username := strings.TrimSpace(req.Username)
	if len(username) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username must be at least 3 characters."})
		return
	}

	bio := strings.TrimSpace(valueOrEmpty(req.Bio))
	if len(bio) > 280 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bio must be 280 characters or fewer."})
		return
	}

	userID := userIDValue.(string)
	var existing models.User
	if err := h.db.Where("username = ? AND id <> ?", username, userID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "This username is already taken."})
		return
	}

	updates := map[string]any{
		"username": username,
		"bio":      nullableString(bio),
	}

	if req.AvatarURL != nil {
		updates["avatar_url"] = nullableString(strings.TrimSpace(*req.AvatarURL))
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile."})
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated profile."})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateEmail changes the email for the authenticated user.
func (h *AuthHandler) UpdateEmail(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}

	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	var existing models.User
	if err := h.db.Where("email = ? AND id <> ?", email, userIDValue).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "An account with this email already exists."})
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userIDValue).Update("email", email).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update email."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "email": email})
}

// UpdatePassword changes the password for the authenticated user.
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}

	var req struct {
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password."})
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userIDValue).Update("password_hash", string(hash)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// DeleteAccount removes the authenticated user and owned data.
func (h *AuthHandler) DeleteAccount(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}

	userID := userIDValue.(string)
	if err := h.db.Transaction(func(tx *gorm.DB) error {
		queries := []string{
			`DELETE FROM class_challenge_attempts WHERE user_id = ?`,
			`DELETE FROM class_challenge_participants WHERE user_id = ?`,
			`DELETE FROM challenge_attempts WHERE user_id = ?`,
			`DELETE FROM study_progress WHERE user_id = ?`,
			`DELETE FROM pomodoro_preferences WHERE user_id = ?`,
			`DELETE FROM pomodoro_sessions WHERE user_id = ?`,
			`DELETE FROM class_challenge_attempts WHERE challenge_id IN (
				SELECT id FROM class_challenges WHERE group_id IN (
					SELECT id FROM class_groups WHERE owner_id = ?
				)
			)`,
			`DELETE FROM class_challenge_participants WHERE challenge_id IN (
				SELECT id FROM class_challenges WHERE group_id IN (
					SELECT id FROM class_groups WHERE owner_id = ?
				)
			)`,
			`DELETE FROM class_challenges WHERE group_id IN (
				SELECT id FROM class_groups WHERE owner_id = ?
			)`,
			`DELETE FROM class_set_assignments WHERE group_id IN (
				SELECT id FROM class_groups WHERE owner_id = ?
			)`,
			`DELETE FROM class_group_members WHERE group_id IN (
				SELECT id FROM class_groups WHERE owner_id = ?
			) OR user_id = ?`,
			`DELETE FROM class_groups WHERE owner_id = ?`,
			`DELETE FROM flashcards WHERE set_id IN (
				SELECT id FROM flashcard_sets WHERE user_id = ?
			)`,
			`DELETE FROM challenge_attempts WHERE set_id IN (
				SELECT id FROM flashcard_sets WHERE user_id = ?
			)`,
			`DELETE FROM flashcard_sets WHERE user_id = ?`,
			`DELETE FROM users WHERE id = ?`,
		}

		args := [][]any{
			{userID},
			{userID},
			{userID},
			{userID},
			{userID},
			{userID},
			{userID},
			{userID},
			{userID},
			{userID},
			{userID, userID},
			{userID},
			{userID},
			{userID},
			{userID},
			{userID},
		}

		for index, query := range queries {
			if err := tx.Exec(query, args[index]...).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nullableString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
