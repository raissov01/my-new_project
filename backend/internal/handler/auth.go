package handler

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/auth"
	"github.com/midoriya/flashlearn-backend/internal/email"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db          *gorm.DB
	jwtSecret   string
	emailSender *email.Sender
	frontendURL string
}

func NewAuth(db *gorm.DB, jwtSecret string, emailSender *email.Sender, frontendURL string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret, emailSender: emailSender, frontendURL: frontendURL}
}

// generateVerificationCode returns a cryptographically random 6-digit decimal
// code (e.g. "042913"). Uses crypto/rand.Int to avoid modulo bias.
func generateVerificationCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// verificationCodeExpiry is how long a code remains valid. Short window
// because 6-digit codes are brute-forceable in a longer window.
const verificationCodeExpiry = 30 * time.Minute

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

// Register creates a new user account and sends a verification email.
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

	// Generate 6-digit verification code (replaces long token + link).
	verificationCode, err := generateVerificationCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate verification code."})
		return
	}
	codeExpiry := time.Now().Add(verificationCodeExpiry)

	user := models.User{
		Email:                   strings.ToLower(strings.TrimSpace(req.Email)),
		PasswordHash:            string(hash),
		FullName:                strings.TrimSpace(req.FullName),
		Username:                strings.TrimSpace(req.Username),
		Role:                    req.Role,
		EmailVerified:           false,
		VerificationToken:       &verificationCode,
		VerificationTokenExpiry: &codeExpiry,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account."})
		return
	}

	// Send verification code (non-blocking — don't fail registration if email fails)
	if h.emailSender != nil {
		go func() {
			if err := h.emailSender.SendVerificationEmail(user.Email, user.FullName, verificationCode); err != nil {
				log.Printf("[register] failed to send verification email to %s: %v", user.Email, err)
			}
		}()
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

	if !user.EmailVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Please verify your email before logging in.", "code": "email_not_verified"})
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

// VerifyEmail verifies a user's email using a 6-digit code sent to their inbox.
// POST /auth/verify-email with body {"email": "...", "code": "123456"}.
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and 6-digit code are required."})
		return
	}

	emailAddr := strings.ToLower(strings.TrimSpace(req.Email))
	code := strings.TrimSpace(req.Code)

	if len(code) != 6 || !isAllDigits(code) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code must be 6 digits."})
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", emailAddr).First(&user).Error; err != nil {
		// Generic message — don't reveal whether the email exists.
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code."})
		return
	}

	if user.EmailVerified {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Email already verified."})
		return
	}

	if user.VerificationToken == nil || *user.VerificationToken != code {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code."})
		return
	}

	if user.VerificationTokenExpiry != nil && time.Now().After(*user.VerificationTokenExpiry) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification code has expired. Please request a new one."})
		return
	}

	if err := h.db.Model(&user).Updates(map[string]any{
		"email_verified":            true,
		"verification_token":        nil,
		"verification_token_expiry": nil,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify email."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Email verified successfully."})
}

func isAllDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// ResendVerification generates a new verification token and resends the email.
func (h *AuthHandler) ResendVerification(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", strings.ToLower(strings.TrimSpace(req.Email))).First(&user).Error; err != nil {
		// Don't reveal whether the email exists
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "If an account exists with that email, a verification code has been sent."})
		return
	}

	if user.EmailVerified {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Email is already verified."})
		return
	}

	newCode, err := generateVerificationCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate verification code."})
		return
	}
	codeExpiry := time.Now().Add(verificationCodeExpiry)

	if err := h.db.Model(&user).Updates(map[string]any{
		"verification_token":        newCode,
		"verification_token_expiry": codeExpiry,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update verification code."})
		return
	}

	if h.emailSender != nil {
		go func() {
			if err := h.emailSender.SendVerificationEmail(user.Email, user.FullName, newCode); err != nil {
				log.Printf("[resend-verification] failed to send verification email to %s: %v", user.Email, err)
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "If an account exists with that email, a verification code has been sent."})
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
