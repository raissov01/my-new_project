package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/storage"
)

// AdminStorageHandler exposes the per-directory storage report for the
// admin panel. Scans are expensive on big directories, so the result is
// cached in-process for storageCacheTTL — that's enough to handle "admin
// hits refresh a few times" without re-walking the disk on every load.
type AdminStorageHandler struct {
	roots []storage.DirReport // configured at construction; only Path is set, the rest fills on scan
	mu    sync.Mutex
	cache *storageReport
	at    time.Time
}

const storageCacheTTL = 60 * time.Second

type storageReport struct {
	GeneratedAt string               `json:"generatedAt"`
	Dirs        []storage.DirReport  `json:"dirs"`
}

// NewAdminStorage configures which paths to scan. Pass display name + path
// pairs; the dashboard renders one card per entry.
func NewAdminStorage(entries []NamedPath) *AdminStorageHandler {
	h := &AdminStorageHandler{}
	for _, e := range entries {
		h.roots = append(h.roots, storage.DirReport{Name: e.Name, Path: e.Path})
	}
	return h
}

// NamedPath pairs a human label with a filesystem path for AdminStorageHandler.
type NamedPath struct {
	Name string
	Path string
}

// Summary handles GET /admin/storage. Refreshes the cache if older than TTL.
func (h *AdminStorageHandler) Summary(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	if h.cache != nil && time.Since(h.at) < storageCacheTTL {
		cached := h.cache
		h.mu.Unlock()
		writeJSON(w, http.StatusOK, cached)
		return
	}
	h.mu.Unlock()

	dirs := make([]storage.DirReport, 0, len(h.roots))
	for _, root := range h.roots {
		report := storage.ScanDir(root.Path, 10)
		report.Name = root.Name
		dirs = append(dirs, report)
	}
	out := &storageReport{
		GeneratedAt: time.Now().UTC().Format("2006-01-02T15:04:05Z"),
		Dirs:        dirs,
	}

	h.mu.Lock()
	h.cache = out
	h.at = time.Now()
	h.mu.Unlock()

	writeJSON(w, http.StatusOK, out)
}
