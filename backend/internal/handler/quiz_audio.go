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

// QuizAudioHandler handles quiz-question audio uploads and serving.
type QuizAudioHandler struct {
	BaseDir  string
	MaxBytes int64
}

func NewQuizAudio(baseDir string, maxBytes int64) *QuizAudioHandler {
	if maxBytes <= 0 {
		maxBytes = 25 * 1024 * 1024
	}
	_ = os.MkdirAll(baseDir, 0o755)
	return &QuizAudioHandler{BaseDir: baseDir, MaxBytes: maxBytes}
}

func extForAudioContentType(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "audio/mpeg", "audio/mp3":
		return ".mp3"
	case "audio/wav", "audio/x-wav", "audio/wave":
		return ".wav"
	case "audio/ogg", "audio/vorbis":
		return ".ogg"
	case "audio/webm":
		return ".webm"
	}
	return ""
}

func sniffAudioExt(buf []byte) string {
	ct := http.DetectContentType(buf)
	switch ct {
	case "audio/mpeg":
		return ".mp3"
	case "audio/wav", "audio/x-wav":
		return ".wav"
	case "audio/ogg":
		return ".ogg"
	case "video/webm": // webm audio misidentified by DetectContentType
		return ".webm"
	}
	// MP3 magic bytes: ID3 tag or sync word 0xFF 0xFB/0xFA/0xF3/0xF2/0xE3
	if len(buf) >= 3 && buf[0] == 'I' && buf[1] == 'D' && buf[2] == '3' {
		return ".mp3"
	}
	if len(buf) >= 2 && buf[0] == 0xFF && (buf[1]&0xE0) == 0xE0 {
		return ".mp3"
	}
	// WAV: RIFF....WAVE
	if len(buf) >= 12 && buf[0] == 'R' && buf[1] == 'I' && buf[2] == 'F' && buf[3] == 'F' &&
		buf[8] == 'W' && buf[9] == 'A' && buf[10] == 'V' && buf[11] == 'E' {
		return ".wav"
	}
	// OGG: OggS
	if len(buf) >= 4 && buf[0] == 'O' && buf[1] == 'g' && buf[2] == 'g' && buf[3] == 'S' {
		return ".ogg"
	}
	return ""
}

// Upload handles POST /api/v1/quizzes/audio.
func (h *QuizAudioHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

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

	head := make([]byte, 512)
	n, _ := file.Read(head)
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		writeError(w, http.StatusInternalServerError, "read file", err)
		return
	}
	ext := sniffAudioExt(head[:n])
	if ext == "" {
		ext = extForAudioContentType(header.Header.Get("Content-Type"))
	}
	if ext == "" {
		writeError(w, http.StatusUnsupportedMediaType, "only mp3, wav, ogg, or webm audio is supported", nil)
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

	publicURL := "/api/v1/quizzes/audio/" + name
	writeJSON(w, http.StatusCreated, map[string]string{"url": publicURL, "name": name})
}

// Serve handles GET /api/v1/quizzes/audio/{name}.
func (h *QuizAudioHandler) Serve(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "name required", nil)
		return
	}
	if strings.ContainsAny(name, "/\\") || strings.Contains(name, "..") {
		writeError(w, http.StatusBadRequest, "invalid name", nil)
		return
	}
	ext := strings.ToLower(filepath.Ext(name))
	if ext != ".mp3" && ext != ".wav" && ext != ".ogg" && ext != ".webm" {
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
	case ".mp3":
		w.Header().Set("Content-Type", "audio/mpeg")
	case ".wav":
		w.Header().Set("Content-Type", "audio/wav")
	case ".ogg":
		w.Header().Set("Content-Type", "audio/ogg")
	case ".webm":
		w.Header().Set("Content-Type", "audio/webm")
	}
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeFile(w, r, fullPath)
}
