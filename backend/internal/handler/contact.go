package handler

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/email"
)

type ContactHandler struct {
	mailer       *email.Sender
	contactEmail string
}

func NewContact(mailer *email.Sender, contactEmail string) *ContactHandler {
	return &ContactHandler{mailer: mailer, contactEmail: contactEmail}
}

type contactRequest struct {
	Name    string `json:"name"    binding:"required,min=1,max=120"`
	Email   string `json:"email"   binding:"required,email"`
	Subject string `json:"subject" binding:"required,min=1,max=200"`
	Message string `json:"message" binding:"required,min=10,max=5000"`
}

func (h *ContactHandler) Submit(c *gin.Context) {
	var req contactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Барлық өрістерді дұрыс толтырыңыз."})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Subject = strings.TrimSpace(req.Subject)
	req.Message = strings.TrimSpace(req.Message)

	if h.mailer != nil && h.contactEmail != "" {
		html := fmt.Sprintf(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;color:#1a1a2e">
  <h2 style="margin:0 0 20px;font-size:20px;font-weight:700">📬 Жаңа хабарлама — StudyWithRaissov</h2>
  <table style="width:100%%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;color:#7a7a9a;width:100px">Аты:</td><td style="padding:8px 0;font-weight:600">%s</td></tr>
    <tr><td style="padding:8px 0;color:#7a7a9a">Email:</td><td style="padding:8px 0"><a href="mailto:%s">%s</a></td></tr>
    <tr><td style="padding:8px 0;color:#7a7a9a">Тақырып:</td><td style="padding:8px 0">%s</td></tr>
  </table>
  <div style="margin-top:20px;padding:16px;background:#f5f5fa;border-radius:10px;font-size:14px;line-height:1.7;white-space:pre-wrap">%s</div>
</body></html>`,
			req.Name, req.Email, req.Email, req.Subject, req.Message,
		)
		subject := fmt.Sprintf("[Contact] %s — %s", req.Subject, req.Name)
		if err := h.mailer.SendContactEmail(h.contactEmail, subject, html); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Хабарламаны жіберу сәтсіз болды. Кейінірек қайталаңыз."})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
