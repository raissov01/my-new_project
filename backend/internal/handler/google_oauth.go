package handler

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/auth"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

type GoogleOAuthHandler struct {
	db          *gorm.DB
	jwtSecret   string
	frontendURL string
	oauthConfig *oauth2.Config
}

func NewGoogleOAuth(db *gorm.DB, jwtSecret, clientID, clientSecret, redirectURL, frontendURL string) *GoogleOAuthHandler {
	var oauthCfg *oauth2.Config
	if clientID != "" && clientSecret != "" {
		oauthCfg = &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		}
	}

	return &GoogleOAuthHandler{
		db:          db,
		jwtSecret:   jwtSecret,
		frontendURL: frontendURL,
		oauthConfig: oauthCfg,
	}
}

// googleUserInfo is the response from Google's userinfo endpoint.
type googleUserInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
}

// RedirectToGoogle generates the OAuth URL and sends the browser to Google.
// GET /api/v1/auth/google
func (h *GoogleOAuthHandler) RedirectToGoogle(c *gin.Context) {
	if h.oauthConfig == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google OAuth is not configured."})
		return
	}

	// Generate CSRF state token
	stateBytes := make([]byte, 32)
	if _, err := rand.Read(stateBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state."})
		return
	}
	state := base64.URLEncoding.EncodeToString(stateBytes)

	// Store state in a short-lived cookie for CSRF validation
	c.SetCookie("oauth_state", state, 600, "/", "", true, true)

	url := h.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// HandleCallback exchanges the code for user info and creates/logs in the user.
// GET /api/v1/auth/google/callback
func (h *GoogleOAuthHandler) HandleCallback(c *gin.Context) {
	if h.oauthConfig == nil {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=google_not_configured")
		return
	}

	// Validate CSRF state
	savedState, err := c.Cookie("oauth_state")
	if err != nil || savedState == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=invalid_state")
		return
	}

	queryState := c.Query("state")
	if queryState != savedState {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=state_mismatch")
		return
	}

	// Clear the state cookie
	c.SetCookie("oauth_state", "", -1, "/", "", true, true)

	// Check for error from Google
	if errParam := c.Query("error"); errParam != "" {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error="+url.QueryEscape(errParam))
		return
	}

	// Exchange authorization code for token
	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=no_code")
		return
	}

	token, err := h.oauthConfig.Exchange(c.Request.Context(), code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=token_exchange_failed")
		return
	}

	// Fetch user info from Google
	userInfo, err := fetchGoogleUserInfo(token.AccessToken)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=userinfo_failed")
		return
	}

	if userInfo.Email == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=no_email")
		return
	}

	// Find or create user
	user, err := h.findOrCreateGoogleUser(userInfo)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=account_error")
		return
	}

	// Generate JWT
	jwtToken, err := auth.GenerateToken(h.jwtSecret, user.ID, user.Email, user.Role)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=token_failed")
		return
	}

	// Set the auth cookie and redirect to frontend
	secure := !strings.Contains(h.frontendURL, "localhost")
	c.SetCookie("swr_token", jwtToken, 7*24*60*60, "/", "", secure, true)

	// Redirect to dashboard based on role
	dashboard := "/student/dashboard"
	if user.Role == "teacher" {
		dashboard = "/teacher/dashboard"
	}

	c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+dashboard)
}

// findOrCreateGoogleUser looks up the user by email.
// If not found, creates a new account with role "student".
func (h *GoogleOAuthHandler) findOrCreateGoogleUser(info *googleUserInfo) (*models.User, error) {
	email := strings.ToLower(strings.TrimSpace(info.Email))

	var user models.User
	err := h.db.Where("email = ?", email).First(&user).Error

	if err == nil {
		// Existing user — update avatar if missing
		if user.AvatarURL == nil && info.Picture != "" {
			h.db.Model(&user).Update("avatar_url", info.Picture)
			user.AvatarURL = &info.Picture
		}
		return &user, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("db lookup: %w", err)
	}

	// New user — create account
	fullName := strings.TrimSpace(info.Name)
	if fullName == "" {
		fullName = strings.TrimSpace(info.GivenName + " " + info.FamilyName)
	}
	if fullName == "" {
		fullName = strings.Split(email, "@")[0]
	}

	username := strings.Split(email, "@")[0]
	// Ensure username is unique
	for attempt := 0; attempt < 5; attempt++ {
		var count int64
		h.db.Model(&models.User{}).Where("username = ?", username).Count(&count)
		if count == 0 {
			break
		}
		suffix := make([]byte, 3)
		rand.Read(suffix)
		username = fmt.Sprintf("%s_%s", strings.Split(email, "@")[0], base64.RawURLEncoding.EncodeToString(suffix)[:4])
	}

	// Generate a random password hash (user won't use password login)
	randomPass := make([]byte, 32)
	rand.Read(randomPass)
	hash, _ := bcrypt.GenerateFromPassword(randomPass, bcrypt.DefaultCost)

	user = models.User{
		Email:         email,
		PasswordHash:  string(hash),
		FullName:      fullName,
		Username:      username,
		AvatarURL:     nilIfEmpty(info.Picture),
		Role:          "student",
		EmailVerified: true, // Google already verified the email
	}

	if err := h.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	return &user, nil
}

// fetchGoogleUserInfo calls Google's userinfo endpoint with the access token.
func fetchGoogleUserInfo(accessToken string) (*googleUserInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google api request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google api returned %d: %s", resp.StatusCode, string(body[:min(len(body), 200)]))
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("decode userinfo: %w", err)
	}

	return &info, nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
