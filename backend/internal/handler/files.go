package handler

import (
	"net/http"
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
	// Gin wildcard params start with "/" — strip it
	reqPath = strings.TrimPrefix(reqPath, "/")
	if reqPath == "" {
		http.Error(w, `{"error":"file path required"}`, http.StatusBadRequest)
		return
	}

	// Security: clean path and prevent directory traversal
	cleaned := filepath.Clean(reqPath)
	if strings.Contains(cleaned, "..") {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}

	fullPath := filepath.Join(h.baseDir, cleaned)

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
