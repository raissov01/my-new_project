package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Sender sends transactional email via the Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// Resend replaces the previous net/smtp implementation — simpler, no SMTP
// port/TLS dance, and works from inside Docker containers without extra config.
type Sender struct {
	apiKey string
	from   string
	client *http.Client
}

// NewSender creates an email sender. Returns nil if Resend is not configured
// (apiKey or from empty) so callers can no-op gracefully in dev.
func NewSender(apiKey, from string) *Sender {
	if apiKey == "" || from == "" {
		return nil
	}
	return &Sender{
		apiKey: apiKey,
		from:   from,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// SendVerificationEmail sends an HTML email with the verification link.
func (s *Sender) SendVerificationEmail(toEmail, fullName, verificationURL string) error {
	displayName := fullName
	if displayName == "" {
		displayName = strings.Split(toEmail, "@")[0]
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">
  <h2 style="margin: 0 0 16px;">Welcome, %s!</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #4a4a6a;">
    Thanks for signing up. Please verify your email address by clicking the button below.
  </p>
  <div style="margin: 32px 0; text-align: center;">
    <a href="%s" style="display: inline-block; padding: 12px 32px; background: #635bff; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Verify Email
    </a>
  </div>
  <p style="font-size: 13px; color: #7a7a9a;">
    This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
  </p>
  <p style="font-size: 13px; color: #7a7a9a;">
    If the button doesn't work, copy and paste this URL into your browser:<br>
    <a href="%s" style="color: #635bff;">%s</a>
  </p>
</body>
</html>`, displayName, verificationURL, verificationURL, verificationURL)

	payload, err := json.Marshal(map[string]any{
		"from":    s.from,
		"to":      []string{toEmail},
		"subject": "Verify your email address",
		"html":    html,
	})
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("resend request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend %d: %s", resp.StatusCode, truncate(string(body), 300))
	}
	return nil
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}
