package email

import (
	"fmt"
	"net/smtp"
	"strings"
)

// Sender handles sending emails via SMTP.
type Sender struct {
	host     string
	port     string
	user     string
	password string
	from     string
}

// NewSender creates an email sender. Returns nil if SMTP is not configured.
func NewSender(host, port, user, password, from string) *Sender {
	if host == "" || from == "" {
		return nil
	}
	return &Sender{
		host:     host,
		port:     port,
		user:     user,
		password: password,
		from:     from,
	}
}

// SendVerificationEmail sends an email with the verification link.
func (s *Sender) SendVerificationEmail(toEmail, fullName, verificationURL string) error {
	subject := "Verify your email address"
	displayName := fullName
	if displayName == "" {
		displayName = strings.Split(toEmail, "@")[0]
	}

	body := fmt.Sprintf(`<!DOCTYPE html>
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

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		s.from, toEmail, subject, body)

	addr := fmt.Sprintf("%s:%s", s.host, s.port)

	var auth smtp.Auth
	if s.user != "" && s.password != "" {
		auth = smtp.PlainAuth("", s.user, s.password, s.host)
	}

	return smtp.SendMail(addr, auth, s.from, []string{toEmail}, []byte(msg))
}
