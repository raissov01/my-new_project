package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/apimetrics"
)

// APIMetrics records per-route latency and status counts for the /admin/api-metrics
// dashboard. Uses gin's matched route template (c.FullPath) so URL params don't
// explode the cardinality.
func APIMetrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		// FullPath is "" for unmatched routes; apimetrics.Record drops those.
		apimetrics.Record(c.Request.Method, c.FullPath(), c.Writer.Status(), time.Since(start))
	}
}
