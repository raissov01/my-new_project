package middleware

import (
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// bucket tracks request counts within a sliding window.
type bucket struct {
	count     int
	expiresAt time.Time
}

// RateLimiter provides in-memory, token-bucket-style rate limiting.
// It stores per-key counters in a sync.Map and automatically cleans up
// stale entries every 5 minutes.
type RateLimiter struct {
	maxRequests int
	window      time.Duration
	buckets     sync.Map // map[string]*bucket

	stopCleanup chan struct{}
}

// NewRateLimiter creates a RateLimiter that allows maxRequests per window.
// A background goroutine prunes expired entries every 5 minutes.
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		maxRequests: maxRequests,
		window:      window,
		stopCleanup: make(chan struct{}),
	}
	go rl.cleanupLoop()
	return rl
}

// cleanupLoop removes expired buckets every 5 minutes.
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			now := time.Now()
			rl.buckets.Range(func(key, value any) bool {
				b := value.(*bucket)
				if now.After(b.expiresAt) {
					rl.buckets.Delete(key)
				}
				return true
			})
		case <-rl.stopCleanup:
			return
		}
	}
}

// allow checks whether the given key is within its rate limit.
// It returns (allowed bool, secondsUntilReset int).
func (rl *RateLimiter) allow(key string) (bool, int) {
	now := time.Now()

	val, loaded := rl.buckets.Load(key)
	if !loaded {
		// First request for this key — create a new bucket.
		b := &bucket{
			count:     1,
			expiresAt: now.Add(rl.window),
		}
		// Use LoadOrStore to handle the race where two goroutines both
		// see "not loaded" at the same time.
		actual, existed := rl.buckets.LoadOrStore(key, b)
		if existed {
			// Another goroutine beat us. Fall through to the increment path.
			val = actual
		} else {
			return true, 0
		}
	}

	b := val.(*bucket)

	// If the window has expired, reset the bucket.
	if now.After(b.expiresAt) {
		b.count = 1
		b.expiresAt = now.Add(rl.window)
		return true, 0
	}

	b.count++
	if b.count > rl.maxRequests {
		retryAfter := int(math.Ceil(time.Until(b.expiresAt).Seconds()))
		if retryAfter < 1 {
			retryAfter = 1
		}
		return false, retryAfter
	}

	return true, 0
}

// LimitByIP returns Gin middleware that rate-limits requests by client IP.
func (rl *RateLimiter) LimitByIP() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := "ip:" + c.ClientIP()

		allowed, retryAfter := rl.allow(key)
		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":      "rate limit exceeded",
				"retryAfter": retryAfter,
			})
			return
		}

		c.Next()
	}
}

// LimitByUser returns Gin middleware that rate-limits requests by the
// authenticated user ID stored in the Gin context.  If no user ID is
// available it falls back to the client IP.
func (rl *RateLimiter) LimitByUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		var key string

		if userID, exists := c.Get("userID"); exists {
			if uid, ok := userID.(string); ok && uid != "" {
				key = "user:" + uid
			}
		}

		// Also check the stdlib context (set by InternalAuth via context.WithValue).
		if key == "" {
			if uid, ok := UserIDFromContext(c.Request.Context()); ok && uid != "" {
				key = "user:" + uid
			}
		}

		// Fallback to IP when no user identity is available.
		if key == "" {
			key = "ip:" + c.ClientIP()
		}

		allowed, retryAfter := rl.allow(key)
		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":      "rate limit exceeded",
				"retryAfter": retryAfter,
			})
			return
		}

		c.Next()
	}
}
