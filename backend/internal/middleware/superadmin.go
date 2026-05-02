package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// RequireSuperadmin gates the developer/owner admin panel. The check is
// DB-authoritative — JWT claims are not trusted, so revoking is_superadmin
// in the DB takes effect immediately even though tokens have a 7-day TTL.
//
// Mirrors RequireAdmin's signature so it can be slotted into route groups
// the same way (typically chained AFTER InternalAuth or JWTAuth, which set
// the "userID" Gin context value).
func RequireSuperadmin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if db == nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Admin auth is not configured."})
			return
		}

		rawUserID, exists := c.Get("userID")
		userID, ok := rawUserID.(string)
		if !exists || !ok || strings.TrimSpace(userID) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required."})
			return
		}

		var user models.User
		if err := db.Select("id", "is_superadmin", "is_active").First(&user, "id = ?", userID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Superadmin access required."})
			return
		}
		if !user.IsSuperadmin || !user.IsActive {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Superadmin access required."})
			return
		}

		c.Set("isSuperadmin", true)
		c.Next()
	}
}
