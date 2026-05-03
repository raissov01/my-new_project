package handler

import (
	"net/http"
	"path/filepath"
	"sync"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/storage"
	"gorm.io/gorm"
)

// AdminStorageHandler exposes the per-directory storage report for the
// admin panel. Scans are expensive on big directories, so the result is
// cached in-process for storageCacheTTL — that's enough to handle "admin
// hits refresh a few times" without re-walking the disk on every load.
type AdminStorageHandler struct {
	roots []NamedPath // configured at construction
	db    *gorm.DB
	mu    sync.Mutex
	cache *storageReport
	at    time.Time
}

const storageCacheTTL = 60 * time.Second

type storageReport struct {
	GeneratedAt string              `json:"generatedAt"`
	Dirs        []storage.DirReport `json:"dirs"`
}

// NewAdminStorage configures which paths to scan. db is used to cross-reference
// upload directories against quiz_questions for orphan detection; pass nil to
// skip that step.
func NewAdminStorage(db *gorm.DB, entries []NamedPath) *AdminStorageHandler {
	return &AdminStorageHandler{db: db, roots: entries}
}

// NamedPath pairs a human label with a filesystem path for AdminStorageHandler.
// RefColumn (optional) is the DB column on quiz_questions used to detect
// orphans — files in this dir that aren't referenced from that column are
// flagged as candidates for cleanup.
type NamedPath struct {
	Name      string
	Path      string
	RefColumn string
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
		var refs map[string]bool
		if root.RefColumn != "" {
			refs = h.loadReferences(r, root.RefColumn)
		}
		report := storage.ScanDirWithRefs(root.Path, 10, refs)
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

// loadReferences returns the set of basenames referenced from quiz_questions.<col>.
// Returns an empty map (not nil) on any DB error so the caller treats every
// file as orphan; that's noisy but louder than silently masking a wired-up cleanup.
func (h *AdminStorageHandler) loadReferences(r *http.Request, column string) map[string]bool {
	refs := make(map[string]bool)
	if h.db == nil {
		return refs
	}
	var urls []string
	if err := h.db.WithContext(r.Context()).
		Table("quiz_questions").
		Where(column+" IS NOT NULL AND "+column+" <> ''").
		Pluck(column, &urls).Error; err != nil {
		return refs
	}
	for _, u := range urls {
		refs[filepath.Base(u)] = true
	}
	return refs
}
