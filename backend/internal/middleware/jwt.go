package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/auth"
)

// JWTAuth validates the Authorization: Bearer <token> header and
// sets "userID", "email", and "role" in the Gin context.
// Validates JWT auth tokens.
func JWTAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header."})
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		if token == header || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format."})
			return
		}

		claims, err := auth.ValidateToken(jwtSecret, token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token."})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// OptionalJWTAuth extracts user info if token is present, but doesn't reject.
func OptionalJWTAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.Next()
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		if token == header || token == "" {
			c.Next()
			return
		}

		claims, err := auth.ValidateToken(jwtSecret, token)
		if err != nil {
			c.Next()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// RequireRole checks that the authenticated user has a specific role.
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists || userRole != role {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions."})
			return
		}
		c.Next()
	}
}

// InternalAuth validates the internal API token for server-to-server calls.
// This is used during migration while frontend still calls the Go backend
// via the bridge layer.
func InternalAuth(internalToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if internalToken == "" {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Internal API token not configured."})
			return
		}

		token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		if token == "" || token != internalToken {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid internal API token."})
			return
		}

		userID := strings.TrimSpace(c.GetHeader("X-User-ID"))
		if userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing X-User-ID header."})
			return
		}

		req := c.Request.WithContext(context.WithValue(c.Request.Context(), userIDKey, userID))
		c.Request = req
		c.Set("userID", userID)
		c.Next()
	}
}

// InternalAuthGuestOK validates the internal API token but allows empty X-User-ID.
// Used for read-only public endpoints where guest (unauthenticated) access is allowed.
func InternalAuthGuestOK(internalToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if internalToken == "" {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Internal API token not configured."})
			return
		}

		token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		if token == "" || token != internalToken {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid internal API token."})
			return
		}

		userID := strings.TrimSpace(c.GetHeader("X-User-ID"))
		if userID != "" {
			req := c.Request.WithContext(context.WithValue(c.Request.Context(), userIDKey, userID))
			c.Request = req
			c.Set("userID", userID)
		}
		c.Next()
	}
}
