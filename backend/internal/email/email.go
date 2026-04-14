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

// SendVerificationEmail sends an HTML email containing a 6-digit verification code.
func (s *Sender) SendVerificationEmail(toEmail, fullName, code string) error {
	displayName := fullName
	if displayName == "" {
		displayName = strings.Split(toEmail, "@")[0]
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e; background: #ffffff;">
  <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Welcome, %s!</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #4a4a6a; margin: 0 0 24px;">
    Thanks for signing up to StudyWithRaissov. Enter the code below on the verification screen to confirm your email address.
  </p>
  <div style="margin: 32px 0; padding: 28px 24px; background: #f5f5fa; border: 1px solid #e6e6f0; border-radius: 14px; text-align: center;">
    <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7a7a9a; margin-bottom: 10px;">
      Your verification code
    </div>
    <div style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.32em; color: #1a1a2e;">
      %s
    </div>
  </div>
  <p style="font-size: 13px; line-height: 1.6; color: #7a7a9a; margin: 0 0 8px;">
    This code expires in 30 minutes. If you didn't create an account, you can safely ignore this email — no further action is required.
  </p>
  <p style="font-size: 12px; color: #a0a0b8; margin: 24px 0 0;">
    — StudyWithRaissov
  </p>
</body>
</html>`, displayName, code)

	payload, err := json.Marshal(map[string]any{
		"from":    s.from,
		"to":      []string{toEmail},
		"subject": fmt.Sprintf("Your StudyWithRaissov code: %s", code),
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

// SendPasswordResetEmail sends an HTML email containing a 6-digit password reset code.
func (s *Sender) SendPasswordResetEmail(toEmail, fullName, code string) error {
	displayName := fullName
	if displayName == "" {
		displayName = strings.Split(toEmail, "@")[0]
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e; background: #ffffff;">
  <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Hi, %s</h2>
  <p style="font-size: 15px; line-height: 1.6; color: #4a4a6a; margin: 0 0 24px;">
    We received a request to reset your StudyWithRaissov password. Enter the code below on the password reset screen to choose a new password.
  </p>
  <div style="margin: 32px 0; padding: 28px 24px; background: #f5f5fa; border: 1px solid #e6e6f0; border-radius: 14px; text-align: center;">
    <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7a7a9a; margin-bottom: 10px;">
      Password reset code
    </div>
    <div style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.32em; color: #1a1a2e;">
      %s
    </div>
  </div>
  <p style="font-size: 13px; line-height: 1.6; color: #7a7a9a; margin: 0 0 8px;">
    This code expires in 30 minutes. If you didn't request a password reset, you can safely ignore this email — your password will stay the same.
  </p>
  <p style="font-size: 12px; color: #a0a0b8; margin: 24px 0 0;">
    — StudyWithRaissov
  </p>
</body>
</html>`, displayName, code)

	payload, err := json.Marshal(map[string]any{
		"from":    s.from,
		"to":      []string{toEmail},
		"subject": fmt.Sprintf("Your StudyWithRaissov password reset code: %s", code),
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
