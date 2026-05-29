package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
)

type SpeechHandler struct {
	openAIKey string
	timeout   time.Duration
}

func NewSpeech(openAIKey string, timeout time.Duration) *SpeechHandler {
	if timeout < 30*time.Second {
		timeout = 30 * time.Second
	}
	return &SpeechHandler{openAIKey: openAIKey, timeout: timeout}
}

// Transcribe accepts multipart/form-data with an "audio" field, sends it
// to OpenAI Whisper, and returns {"text": "..."}.
func (h *SpeechHandler) Transcribe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	if h.openAIKey == "" {
		writeError(w, http.StatusServiceUnavailable, "speech service not configured", nil)
		return
	}

	if err := r.ParseMultipartForm(25 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart form", err)
		return
	}

	file, header, err := r.FormFile("audio")
	if err != nil {
		writeError(w, http.StatusBadRequest, "audio field required", err)
		return
	}
	defer file.Close()

	if header.Size > 25<<20 {
		writeError(w, http.StatusRequestEntityTooLarge, "audio too large (max 25 MB)", nil)
		return
	}

	audioBytes, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read audio", err)
		return
	}

	// Build multipart body for Whisper API
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)

	// audio file part with correct Content-Type header
	filename := header.Filename
	if filename == "" {
		filename = "audio.webm"
	}
	h2 := make(textproto.MIMEHeader)
	h2.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filename))
	h2.Set("Content-Type", "audio/webm")
	fw, err := mw.CreatePart(h2)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to build request", err)
		return
	}
	if _, err := fw.Write(audioBytes); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to build request", err)
		return
	}
	_ = mw.WriteField("model", "whisper-1")
	_ = mw.WriteField("response_format", "json")
	// No language hint — let Whisper auto-detect kk/ru/en
	mw.Close()

	ctx, cancel := context.WithTimeout(r.Context(), h.timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/audio/transcriptions", &buf)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to build whisper request", err)
		return
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+h.openAIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Whisper request failed", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		writeError(w, http.StatusBadGateway,
			fmt.Sprintf("Whisper returned %d: %s", resp.StatusCode, string(raw)), nil)
		return
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		writeError(w, http.StatusBadGateway, "failed to parse Whisper response", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"text": strings.TrimSpace(result.Text)})
}

// TextToSpeech accepts {"text": "...", "voice": "nova"} and streams back
// audio/mpeg from OpenAI tts-1.
func (h *SpeechHandler) TextToSpeech(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	if h.openAIKey == "" {
		writeError(w, http.StatusServiceUnavailable, "speech service not configured", nil)
		return
	}

	var body struct {
		Text  string `json:"text"`
		Voice string `json:"voice"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	body.Text = strings.TrimSpace(body.Text)
	if body.Text == "" {
		writeError(w, http.StatusBadRequest, "text is required", nil)
		return
	}
	if len(body.Text) > 1000 {
		writeError(w, http.StatusBadRequest, "text too long (max 1000 chars)", nil)
		return
	}
	if body.Voice == "" {
		body.Voice = "nova"
	}

	payload, _ := json.Marshal(map[string]any{
		"model": "tts-1",
		"input": body.Text,
		"voice": body.Voice,
	})

	ctx, cancel := context.WithTimeout(r.Context(), h.timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/audio/speech", bytes.NewReader(payload))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to build TTS request", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.openAIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "TTS request failed", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		writeError(w, http.StatusBadGateway,
			fmt.Sprintf("TTS returned %d: %s", resp.StatusCode, string(raw)), nil)
		return
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, resp.Body)
}
