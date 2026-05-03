package handler

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/auditlog"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
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

// rootByName returns the configured NamedPath whose Name matches `dir`.
// Lookups are by display name (URL-friendly slug not strictly required) so
// admins can pass "Quiz images" / "Quiz audio" via the UI.
func (h *AdminStorageHandler) rootByName(dir string) (NamedPath, bool) {
	for _, root := range h.roots {
		if root.Name == dir {
			return root, true
		}
	}
	return NamedPath{}, false
}

// safeFilename rejects names that try to escape the dir or hit hidden paths.
// Path-traversal here is high blast-radius: a successful exploit would let
// an admin delete arbitrary files on the container.
func safeFilename(name string) bool {
	if name == "" || strings.ContainsAny(name, "/\\") || strings.HasPrefix(name, ".") {
		return false
	}
	return name == filepath.Base(name)
}

// deleteOrphan handles DELETE /admin/storage/orphans?dir=Quiz%20images&name=<file>.
//
// Re-checks orphan status against the live DB before unlinking — the cached
// /admin/storage report can be up to 60s stale. Records each successful delete
// to admin_audit_log and invalidates the storage cache so the next refresh
// reflects the new state.
func (h *AdminStorageHandler) DeleteOrphan(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	dirName := strings.TrimSpace(q.Get("dir"))
	fileName := strings.TrimSpace(q.Get("name"))
	if dirName == "" || fileName == "" {
		writeError(w, http.StatusBadRequest, "dir and name are required", nil)
		return
	}
	if !safeFilename(fileName) {
		writeError(w, http.StatusBadRequest, "invalid filename", nil)
		return
	}

	root, ok := h.rootByName(dirName)
	if !ok {
		writeError(w, http.StatusBadRequest, "unknown dir", nil)
		return
	}
	if root.RefColumn == "" {
		writeError(w, http.StatusBadRequest, "dir does not support orphan delete", nil)
		return
	}

	refs := h.loadReferences(r, root.RefColumn)
	if refs[fileName] {
		writeError(w, http.StatusConflict, "file is still referenced from the database", nil)
		return
	}

	full := filepath.Join(root.Path, fileName)
	info, err := os.Stat(full)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			writeError(w, http.StatusNotFound, "file not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "stat failed", err)
		return
	}
	if err := os.Remove(full); err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed", err)
		return
	}

	if uid, ok := middleware.UserIDFromContext(r.Context()); ok && uid != "" {
		ip := r.Header.Get("X-Forwarded-For")
		auditlog.Record(h.db, uid, "storage.delete_orphan", "file", &fileName,
			map[string]any{"dir": dirName, "bytes": info.Size()}, nil, &ip)
	}

	h.invalidateCache()
	writeJSON(w, http.StatusOK, map[string]any{"deleted": fileName, "bytes": info.Size()})
}

// DeleteOrphansBulk handles POST /admin/storage/orphans/bulk?dir=<dir>&olderThanDays=N.
//
// Walks the directory once, deletes every file that is (a) absent from the DB
// reference set and (b) older than `olderThanDays` (default 7). The age guard
// keeps freshly-uploaded files safe even if the request beats the DB write
// they belong to. Returns the count + total bytes freed.
func (h *AdminStorageHandler) DeleteOrphansBulk(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	dirName := strings.TrimSpace(q.Get("dir"))
	if dirName == "" {
		writeError(w, http.StatusBadRequest, "dir is required", nil)
		return
	}
	root, ok := h.rootByName(dirName)
	if !ok {
		writeError(w, http.StatusBadRequest, "unknown dir", nil)
		return
	}
	if root.RefColumn == "" {
		writeError(w, http.StatusBadRequest, "dir does not support orphan delete", nil)
		return
	}

	olderThanDays := 7
	if raw := strings.TrimSpace(q.Get("olderThanDays")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 0 && n <= 365 {
			olderThanDays = n
		}
	}
	cutoff := time.Now().Add(-time.Duration(olderThanDays) * 24 * time.Hour)

	refs := h.loadReferences(r, root.RefColumn)
	report := storage.ScanDirWithRefs(root.Path, 0, refs)

	deleted := 0
	var freed int64
	for _, f := range report.Largest { // Largest with N=0 holds all files
		if !f.Orphan || !f.Modified.Before(cutoff) {
			continue
		}
		if err := os.Remove(f.Path); err == nil {
			deleted++
			freed += f.Bytes
		}
	}

	if deleted > 0 {
		if uid, ok := middleware.UserIDFromContext(r.Context()); ok && uid != "" {
			ip := r.Header.Get("X-Forwarded-For")
			auditlog.Record(h.db, uid, "storage.bulk_delete_orphans", "dir", &dirName,
				map[string]any{"olderThanDays": olderThanDays}, map[string]any{"deleted": deleted, "bytes": freed}, &ip)
		}
		h.invalidateCache()
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"deleted":       deleted,
		"bytesFreed":    freed,
		"olderThanDays": olderThanDays,
	})
}

func (h *AdminStorageHandler) invalidateCache() {
	h.mu.Lock()
	h.cache = nil
	h.at = time.Time{}
	h.mu.Unlock()
}

