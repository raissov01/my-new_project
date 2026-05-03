package handler

import (
	"net/http"
	"runtime"
	"runtime/debug"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/errlog"
	"github.com/midoriya/flashlearn-backend/internal/presence"
)

// AdminSystemHandler powers the /admin/system page: process health, DB pool,
// online count, and the in-memory error log viewer.
type AdminSystemHandler struct {
	pool      *pgxpool.Pool
	startedAt time.Time
}

func NewAdminSystem(pool *pgxpool.Pool) *AdminSystemHandler {
	return &AdminSystemHandler{pool: pool, startedAt: time.Now()}
}

type systemHealthResponse struct {
	Uptime     systemUptime     `json:"uptime"`
	Version    systemVersion    `json:"version"`
	Runtime    systemRuntime    `json:"runtime"`
	DBPool     systemDBPool     `json:"dbPool"`
	OnlineUsers int              `json:"onlineUsers"`
	ErrorCounts map[string]int   `json:"errorCounts"`
}

type systemUptime struct {
	StartedAt string  `json:"startedAt"`
	Seconds   float64 `json:"seconds"`
	Pretty    string  `json:"pretty"`
}

type systemVersion struct {
	Module    string `json:"module"`
	GoVersion string `json:"goVersion"`
	VCSRev    string `json:"vcsRev"`
	VCSTime   string `json:"vcsTime"`
}

type systemRuntime struct {
	Goroutines int    `json:"goroutines"`
	NumCPU     int    `json:"numCPU"`
	GOMAXPROCS int    `json:"gomaxprocs"`
	HeapAllocMB float64 `json:"heapAllocMb"`
	HeapInuseMB float64 `json:"heapInuseMb"`
	SysMB       float64 `json:"sysMb"`
	NumGC       uint32  `json:"numGc"`
}

type systemDBPool struct {
	Total           int32 `json:"total"`
	Idle            int32 `json:"idle"`
	Acquired        int32 `json:"acquired"`
	MaxConns        int32 `json:"maxConns"`
	AcquireCount    int64 `json:"acquireCount"`
	CanceledAcquire int64 `json:"canceledAcquireCount"`
}

// Health handles GET /admin/system/health.
func (h *AdminSystemHandler) Health(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	uptime := now.Sub(h.startedAt)

	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)

	resp := systemHealthResponse{
		Uptime: systemUptime{
			StartedAt: h.startedAt.UTC().Format(time.RFC3339),
			Seconds:   uptime.Seconds(),
			Pretty:    prettyDuration(uptime),
		},
		Version: readVersion(),
		Runtime: systemRuntime{
			Goroutines:  runtime.NumGoroutine(),
			NumCPU:      runtime.NumCPU(),
			GOMAXPROCS:  runtime.GOMAXPROCS(0),
			HeapAllocMB: bytesToMB(ms.HeapAlloc),
			HeapInuseMB: bytesToMB(ms.HeapInuse),
			SysMB:       bytesToMB(ms.Sys),
			NumGC:       ms.NumGC,
		},
		OnlineUsers: presence.OnlineCount(),
		ErrorCounts: errlog.Stats(),
	}

	if h.pool != nil {
		s := h.pool.Stat()
		resp.DBPool = systemDBPool{
			Total:           s.TotalConns(),
			Idle:            s.IdleConns(),
			Acquired:        s.AcquiredConns(),
			MaxConns:        s.MaxConns(),
			AcquireCount:    s.AcquireCount(),
			CanceledAcquire: s.CanceledAcquireCount(),
		}
	}

	jsonOK(w, resp)
}

// Errors handles GET /admin/system/errors?limit=100&level=error.
func (h *AdminSystemHandler) Errors(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= errlog.Capacity {
			limit = n
		}
	}
	level := r.URL.Query().Get("level")
	jsonOK(w, map[string]any{
		"items":    errlog.Recent(limit, level),
		"counts":   errlog.Stats(),
		"capacity": errlog.Capacity,
	})
}

// ── helpers ────────────────────────────────────────────────────────────────

func bytesToMB(b uint64) float64 {
	return float64(b) / 1024.0 / 1024.0
}

func prettyDuration(d time.Duration) string {
	d = d.Round(time.Second)
	days := int(d / (24 * time.Hour))
	d -= time.Duration(days) * 24 * time.Hour
	hours := int(d / time.Hour)
	d -= time.Duration(hours) * time.Hour
	mins := int(d / time.Minute)
	d -= time.Duration(mins) * time.Minute
	secs := int(d / time.Second)
	switch {
	case days > 0:
		return strconv.Itoa(days) + "d " + strconv.Itoa(hours) + "h " + strconv.Itoa(mins) + "m"
	case hours > 0:
		return strconv.Itoa(hours) + "h " + strconv.Itoa(mins) + "m"
	case mins > 0:
		return strconv.Itoa(mins) + "m " + strconv.Itoa(secs) + "s"
	default:
		return strconv.Itoa(secs) + "s"
	}
}

func readVersion() systemVersion {
	v := systemVersion{GoVersion: runtime.Version()}
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return v
	}
	v.Module = info.Main.Path
	for _, s := range info.Settings {
		switch s.Key {
		case "vcs.revision":
			if len(s.Value) > 12 {
				v.VCSRev = s.Value[:12]
			} else {
				v.VCSRev = s.Value
			}
		case "vcs.time":
			v.VCSTime = s.Value
		}
	}
	return v
}
