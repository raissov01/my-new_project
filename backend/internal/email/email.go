package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/delivery"
	"gorm.io/gorm"
)

// Sender sends transactional email via the Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// Resend replaces the previous net/smtp implementation — simpler, no SMTP
// port/TLS dance, and works from inside Docker containers without extra config.
type Sender struct {
	apiKey      string
	from        string
	frontendURL string
	client      *http.Client
	db          *gorm.DB
}

// NewSender creates an email sender. Returns nil if Resend is not configured
// (apiKey or from empty) so callers can no-op gracefully in dev. db is
// optional; when set every Send writes a delivery_events row for the admin
// deliverability dashboard.
func NewSender(apiKey, from, frontendURL string, db *gorm.DB) *Sender {
	if apiKey == "" || from == "" {
		return nil
	}
	url := strings.TrimRight(frontendURL, "/")
	if url == "" {
		url = "https://studywithraissov.com"
	}
	return &Sender{
		apiKey:      apiKey,
		from:        from,
		frontendURL: url,
		client:      &http.Client{Timeout: 15 * time.Second},
		db:          db,
	}
}

// deliver POSTs an HTML email to Resend and records the outcome into
// delivery_events. kind is the campaign label ("verify_email", "streak_warning",
// etc.) used by the admin dashboard to break down success rate.
func (s *Sender) deliver(kind, to, subject, html string) error {
	payload, err := json.Marshal(map[string]any{
		"from":    s.from,
		"to":      []string{to},
		"subject": subject,
		"html":    html,
	})
	if err != nil {
		delivery.Record(s.db, delivery.Event{Channel: "email", Kind: kind, Recipient: to, Err: fmt.Errorf("marshal: %w", err)})
		return fmt.Errorf("marshal payload: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		delivery.Record(s.db, delivery.Event{Channel: "email", Kind: kind, Recipient: to, Err: err})
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		delivery.Record(s.db, delivery.Event{Channel: "email", Kind: kind, Recipient: to, Err: err})
		return fmt.Errorf("resend request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		hostErr := fmt.Errorf("resend %d: %s", resp.StatusCode, truncate(string(body), 300))
		delivery.Record(s.db, delivery.Event{
			Channel: "email", Kind: kind, Recipient: to,
			StatusCode: resp.StatusCode, Err: hostErr,
		})
		return hostErr
	}

	delivery.Record(s.db, delivery.Event{
		Channel: "email", Kind: kind, Recipient: to, StatusCode: resp.StatusCode,
	})
	return nil
}

// SendVerificationEmail sends an HTML email containing a 6-digit verification code.
func (s *Sender) SendVerificationEmail(toEmail, fullName, code string) error {
	name := displayName(fullName, toEmail)

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
</html>`, name, code)

	return s.deliver("verify_email", toEmail, fmt.Sprintf("Your StudyWithRaissov code: %s", code), html)
}

// SendPasswordResetEmail sends an HTML email containing a 6-digit password reset code.
func (s *Sender) SendPasswordResetEmail(toEmail, fullName, code string) error {
	name := displayName(fullName, toEmail)

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
</html>`, name, code)

	return s.deliver("password_reset", toEmail, fmt.Sprintf("Your StudyWithRaissov password reset code: %s", code), html)
}

// SendContactEmail forwards a contact-form submission to the admin inbox.
func (s *Sender) SendContactEmail(toEmail, subject, html string) error {
	return s.deliver("contact_form", toEmail, subject, html)
}

func displayName(fullName, email string) string {
	if fullName != "" {
		return fullName
	}
	return strings.Split(email, "@")[0]
}

// SendStreakWarningEmail notifies a user that their streak is about to break.
func (s *Sender) SendStreakWarningEmail(toEmail, fullName string, streakDays int) error {
	name := displayName(fullName, toEmail)
	html := fmt.Sprintf(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a2e;">
  <div style="font-size:48px;text-align:center;margin-bottom:16px;">🔥</div>
  <h2 style="text-align:center;margin:0 0 16px;">Don't break your %d-day streak, %s!</h2>
  <p style="font-size:15px;line-height:1.6;color:#4a4a6a;text-align:center;margin:0 0 32px;">
    You haven't practiced yet today. It only takes 5 minutes to keep your streak alive.
  </p>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="%s/learn/map" style="display:inline-block;padding:14px 32px;background:#f97316;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">
      Save my streak (5 min) →
    </a>
  </div>
  <p style="font-size:12px;color:#a0a0b8;text-align:center;margin:0;">
    <a href="%s/settings" style="color:#a0a0b8;">Unsubscribe from streak reminders</a>
  </p>
</body></html>`, streakDays, name, s.frontendURL, s.frontendURL)
	return s.deliver("streak_warning", toEmail, fmt.Sprintf("🔥 Don't break your %d-day streak!", streakDays), html)
}

// SendComebackEmail sends a re-engagement email based on days inactive.
func (s *Sender) SendComebackEmail(toEmail, fullName string, streakDays, daysInactive int) error {
	name := displayName(fullName, toEmail)
	var subject, body string
	switch {
	case daysInactive == 1:
		subject = "We miss you! 🥺 Your streak is in danger"
		body = fmt.Sprintf(`<h2>Hey %s, come back!</h2>
<p style="font-size:15px;line-height:1.6;color:#4a4a6a;">Your %d-day streak is in danger. One short lesson is all it takes to keep the momentum.</p>`, name, streakDays)
	case daysInactive == 3:
		subject = "🎁 A gift is waiting for you"
		body = fmt.Sprintf(`<h2>We saved a streak freeze for you, %s 🎁</h2>
<p style="font-size:15px;line-height:1.6;color:#4a4a6a;">You've been away for 3 days. Come back today and we'll restore your streak with a free freeze — plus a 100 XP bonus lesson.</p>`, name)
	default:
		subject = "Don't give up on your English journey 💪"
		body = fmt.Sprintf(`<h2>%s, your English waits for you</h2>
<p style="font-size:15px;line-height:1.6;color:#4a4a6a;">It's been a week since your last practice. Every expert was once a beginner — just open one lesson today and feel the difference.</p>`, name)
	}
	html := fmt.Sprintf(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a2e;">
  %s
  <div style="text-align:center;margin:32px 0;">
    <a href="%s/learn/map" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">
      Continue learning →
    </a>
  </div>
  <p style="font-size:12px;color:#a0a0b8;text-align:center;">
    <a href="%s/settings" style="color:#a0a0b8;">Unsubscribe</a>
  </p>
</body></html>`, body, s.frontendURL, s.frontendURL)
	return s.deliver("comeback", toEmail, subject, html)
}

// SendLeagueResultEmail notifies a user of their weekly league standing.
func (s *Sender) SendLeagueResultEmail(toEmail, fullName string, rank int, oldTier, newTier string, promoted bool) error {
	name := displayName(fullName, toEmail)
	icon := "🏆"
	action := fmt.Sprintf("You finished <strong>#%d</strong> in <strong>%s League</strong> this week.", rank, strings.Title(oldTier))
	if promoted {
		action += fmt.Sprintf(" You've been promoted to <strong>%s League</strong>! 🎉", strings.Title(newTier))
		icon = "🚀"
	}
	html := fmt.Sprintf(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a2e;">
  <div style="font-size:64px;text-align:center;margin-bottom:16px;">%s</div>
  <h2 style="text-align:center;margin:0 0 16px;">%s, your week is in!</h2>
  <p style="font-size:15px;line-height:1.6;color:#4a4a6a;text-align:center;margin:0 0 32px;">
    %s
  </p>
  <div style="text-align:center;">
    <a href="%s/leaderboard" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">
      See the leaderboard →
    </a>
  </div>
</body></html>`, icon, name, action, s.frontendURL)
	subject := fmt.Sprintf("%s Weekly league results — you finished #%d", icon, rank)
	return s.deliver("league_result", toEmail, subject, html)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
