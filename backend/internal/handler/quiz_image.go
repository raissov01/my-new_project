package handler

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
)

// QuizImageHandler handles quiz-question image uploads and serving.
// Files are stored on disk under BaseDir; URLs are served from the same
// handler's Serve method so the storage can move (local → S3) later
// without changing the public URL shape.
type QuizImageHandler struct {
	BaseDir  string
	MaxBytes int64
}

func NewQuizImage(baseDir string, maxBytes int64) *QuizImageHandler {
	if maxBytes <= 0 {
		maxBytes = 5 * 1024 * 1024
	}
	_ = os.MkdirAll(baseDir, 0o755)
	return &QuizImageHandler{BaseDir: baseDir, MaxBytes: maxBytes}
}

// extForContentType maps an allowed MIME type to its canonical extension.
// Returns empty string for types we do not accept.
func extForContentType(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	}
	return ""
}

// sniffImageExt looks at the first bytes of a file to identify the image
// format, so we don't trust the client-provided content type alone.
func sniffImageExt(buf []byte) string {
	switch http.DetectContentType(buf) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	}
	return ""
}

// Upload handles POST /api/v1/quizzes/images.
// Expects multipart/form-data with a single "file" field. Saves the file to
// BaseDir under a UUID filename and returns JSON { "url": "/api/v1/quizzes/images/<name>" }.
func (h *QuizImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	// Cap the request body so a malicious client can't exhaust memory/disk
	// before ParseMultipartForm applies its own limit.
	r.Body = http.MaxBytesReader(w, r.Body, h.MaxBytes+1024)
	if err := r.ParseMultipartForm(h.MaxBytes + 1024); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or malformed", err)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file field is required", err)
		return
	}
	defer file.Close()

	if header.Size > h.MaxBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "file too large", nil)
		return
	}

	// Sniff the magic bytes for format validation — don't trust the client
	// Content-Type header alone. The fallback checks the header if sniff
	// is inconclusive.
	head := make([]byte, 512)
	n, _ := file.Read(head)
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		writeError(w, http.StatusInternalServerError, "read file", err)
		return
	}
	ext := sniffImageExt(head[:n])
	if ext == "" {
		ext = extForContentType(header.Header.Get("Content-Type"))
	}
	if ext == "" {
		writeError(w, http.StatusUnsupportedMediaType, "only jpg, png, or webp images are supported", nil)
		return
	}

	name := uuid.NewString() + ext
	dst := filepath.Join(h.BaseDir, name)

	out, err := os.Create(dst)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "save file", err)
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		_ = os.Remove(dst)
		writeError(w, http.StatusInternalServerError, "save file", err)
		return
	}

	publicURL := "/api/v1/quizzes/images/" + name
	writeJSON(w, http.StatusCreated, map[string]string{"url": publicURL, "name": name})
}

// Serve handles GET /api/v1/quizzes/images/{name}. Returns the file with
// an image Content-Type and a long-lived cache header since filenames are
// UUIDs and never reused.
func (h *QuizImageHandler) Serve(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "name required", nil)
		return
	}
	// Reject anything but a plain basename so an attacker can't traverse
	// with "../" or absolute paths.
	if strings.ContainsAny(name, "/\\") || strings.Contains(name, "..") {
		writeError(w, http.StatusBadRequest, "invalid name", nil)
		return
	}
	ext := strings.ToLower(filepath.Ext(name))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		writeError(w, http.StatusNotFound, "not found", nil)
		return
	}

	fullPath := filepath.Join(h.BaseDir, name)
	absBase, _ := filepath.Abs(h.BaseDir)
	absPath, _ := filepath.Abs(fullPath)
	if !strings.HasPrefix(absPath, absBase) {
		writeError(w, http.StatusBadRequest, "invalid path", nil)
		return
	}

	info, err := os.Stat(fullPath)
	if err != nil || info.IsDir() {
		writeError(w, http.StatusNotFound, "not found", err)
		return
	}

	switch ext {
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".webp":
		w.Header().Set("Content-Type", "image/webp")
	}
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeFile(w, r, fullPath)
}

