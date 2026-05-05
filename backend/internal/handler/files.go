package handler

import (
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

// FilesHandler serves static files from the telegram-media directory.
type FilesHandler struct {
	baseDir string
}

func NewFiles(baseDir string) *FilesHandler {
	return &FilesHandler{baseDir: baseDir}
}

// Serve handles GET /api/v1/files/*filepath requests.
// It validates the path to prevent directory traversal and serves the file.
func (h *FilesHandler) Serve(w http.ResponseWriter, r *http.Request) {
	// Extract the file path from the URL after /api/v1/files/
	reqPath := r.PathValue("filepath")
	if reqPath == "" {
		reqPath = strings.TrimPrefix(r.URL.EscapedPath(), "/api/v1/files/")
	}
	// Gin wildcard params start with "/" — strip it
	reqPath = strings.TrimPrefix(reqPath, "/")
	if decoded, err := url.PathUnescape(reqPath); err == nil {
		reqPath = decoded
	}
	if reqPath == "" {
		http.Error(w, `{"error":"file path required"}`, http.StatusBadRequest)
		return
	}

	// The reqPath already includes "telegram-media/..." since the route is /files/*filepath
	// and the frontend sends /files/telegram-media/filename.pdf
	// So reqPath = "telegram-media/filename.pdf" and baseDir = "telegram-media"
	// We need to strip the baseDir prefix if present to avoid double path
	cleaned := filepath.Clean(reqPath)
	if strings.Contains(cleaned, "..") {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}

	// If the path already starts with the base dir name, use it directly
	var fullPath string
	if strings.HasPrefix(cleaned, filepath.Base(h.baseDir)) {
		fullPath = cleaned
	} else {
		fullPath = filepath.Join(h.baseDir, cleaned)
	}

	// Verify the resolved path is still under baseDir
	absBase, _ := filepath.Abs(h.baseDir)
	absPath, _ := filepath.Abs(fullPath)
	if !strings.HasPrefix(absPath, absBase) {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}

	// Check file exists
	info, err := os.Stat(fullPath)
	if err != nil || info.IsDir() {
		http.Error(w, `{"error":"file not found"}`, http.StatusNotFound)
		return
	}

	// Set appropriate headers
	ext := strings.ToLower(filepath.Ext(fullPath))
	switch ext {
	case ".pdf":
		w.Header().Set("Content-Type", "application/pdf")
	case ".doc", ".docx":
		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	case ".xls", ".xlsx":
		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	case ".ppt", ".pptx":
		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
	default:
		w.Header().Set("Content-Type", "application/octet-stream")
	}

	// Allow inline display for PDFs, download for others (or if ?download=1)
	forceDownload := r.URL.Query().Get("download") == "1"
	if ext == ".pdf" && !forceDownload {
		w.Header().Set("Content-Disposition", "inline")
	} else {
		w.Header().Set("Content-Disposition", "attachment; filename=\""+filepath.Base(fullPath)+"\"")
	}

	// Cache for 1 hour (files don't change)
	w.Header().Set("Cache-Control", "public, max-age=3600")

	http.ServeFile(w, r, fullPath)
}
