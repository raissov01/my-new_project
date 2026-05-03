// Package apimetrics keeps per-route request counters and latency histograms
// in memory so the admin panel can show traffic, p50/p95, and error rates
// without an external observability stack.
//
// Single-process — running multiple replicas means each one only sees its
// own traffic. Good enough for the admin overview; Prometheus is the upgrade.
package apimetrics

import (
	"sort"
	"sync"
	"time"
)

// latencyBuckets in milliseconds. Bucket i is "<= ms[i]"; the final implicit
// bucket catches everything slower than the largest threshold.
var latencyBuckets = []float64{10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000}

type routeStats struct {
	count       uint64
	sumMs       float64
	maxMs       float64
	status2xx   uint64
	status3xx   uint64
	status4xx   uint64
	status5xx   uint64
	buckets     []uint64 // length = len(latencyBuckets) + 1 (final = +Inf)
	lastSeen    time.Time
}

func newRouteStats() *routeStats {
	return &routeStats{buckets: make([]uint64, len(latencyBuckets)+1)}
}

var (
	mu        sync.RWMutex
	stats     = make(map[string]*routeStats)
	startedAt = time.Now()
	totalReqs uint64
)

// routeKey is "METHOD path".
func routeKey(method, path string) string {
	return method + " " + path
}

// Record adds one observation. method should be the HTTP verb, path the
// route TEMPLATE (not the resolved URL — e.g. "/api/v1/users/:id").
// statusCode is the HTTP response status; latency is the wall-clock duration.
func Record(method, path string, statusCode int, latency time.Duration) {
	if path == "" {
		return // gin returns "" for unmatched routes
	}
	ms := float64(latency.Milliseconds())
	key := routeKey(method, path)

	mu.Lock()
	defer mu.Unlock()

	s, ok := stats[key]
	if !ok {
		s = newRouteStats()
		stats[key] = s
	}
	s.count++
	s.sumMs += ms
	if ms > s.maxMs {
		s.maxMs = ms
	}
	switch {
	case statusCode >= 500:
		s.status5xx++
	case statusCode >= 400:
		s.status4xx++
	case statusCode >= 300:
		s.status3xx++
	default:
		s.status2xx++
	}
	bucketIdx := len(latencyBuckets) // overflow bucket
	for i, b := range latencyBuckets {
		if ms <= b {
			bucketIdx = i
			break
		}
	}
	s.buckets[bucketIdx]++
	s.lastSeen = time.Now()
	totalReqs++
}

// RouteSnapshot is the per-route projection returned to the admin UI.
type RouteSnapshot struct {
	Method     string  `json:"method"`
	Path       string  `json:"path"`
	Count      uint64  `json:"count"`
	AvgMs      float64 `json:"avgMs"`
	P50Ms      float64 `json:"p50Ms"`
	P95Ms      float64 `json:"p95Ms"`
	MaxMs      float64 `json:"maxMs"`
	Status2xx  uint64  `json:"status2xx"`
	Status3xx  uint64  `json:"status3xx"`
	Status4xx  uint64  `json:"status4xx"`
	Status5xx  uint64  `json:"status5xx"`
	ErrorRate  float64 `json:"errorRate"` // 5xx / count
	LastSeen   string  `json:"lastSeen"`
}

// Snapshot is the response payload — overall counters + per-route rows.
type Snapshot struct {
	StartedAt   string          `json:"startedAt"`
	TotalReqs   uint64          `json:"totalReqs"`
	UniqueRoutes int            `json:"uniqueRoutes"`
	Routes      []RouteSnapshot `json:"routes"`
}

// Take returns a sorted snapshot of every observed route. Sorted by count desc.
func Take() Snapshot {
	mu.RLock()
	defer mu.RUnlock()

	rows := make([]RouteSnapshot, 0, len(stats))
	for key, s := range stats {
		method, path := splitKey(key)
		row := RouteSnapshot{
			Method:    method,
			Path:      path,
			Count:     s.count,
			MaxMs:     s.maxMs,
			Status2xx: s.status2xx,
			Status3xx: s.status3xx,
			Status4xx: s.status4xx,
			Status5xx: s.status5xx,
			LastSeen:  s.lastSeen.UTC().Format(time.RFC3339),
		}
		if s.count > 0 {
			row.AvgMs = s.sumMs / float64(s.count)
			row.ErrorRate = float64(s.status5xx) / float64(s.count)
		}
		row.P50Ms = percentileFromBuckets(s, 0.50)
		row.P95Ms = percentileFromBuckets(s, 0.95)
		rows = append(rows, row)
	}

	sort.Slice(rows, func(i, j int) bool { return rows[i].Count > rows[j].Count })

	return Snapshot{
		StartedAt:    startedAt.UTC().Format(time.RFC3339),
		TotalReqs:    totalReqs,
		UniqueRoutes: len(stats),
		Routes:       rows,
	}
}

// percentileFromBuckets approximates a percentile by walking the histogram.
// Returns the upper bound of the bucket that contains the target rank.
// The overflow bucket reports as -1 (interpreted as "> max threshold" by UI).
func percentileFromBuckets(s *routeStats, p float64) float64 {
	if s.count == 0 {
		return 0
	}
	target := uint64(float64(s.count) * p)
	if target == 0 {
		target = 1
	}
	var cum uint64
	for i, c := range s.buckets {
		cum += c
		if cum >= target {
			if i >= len(latencyBuckets) {
				return s.maxMs
			}
			return latencyBuckets[i]
		}
	}
	return s.maxMs
}

func splitKey(k string) (method, path string) {
	for i := 0; i < len(k); i++ {
		if k[i] == ' ' {
			return k[:i], k[i+1:]
		}
	}
	return k, ""
}
