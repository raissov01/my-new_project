package handler

import (
	"net/http"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

// AdminDeliverabilityHandler exposes read-only views over delivery_events
// for the email + push deliverability dashboard.
type AdminDeliverabilityHandler struct {
	db *gorm.DB
}

func NewAdminDeliverability(db *gorm.DB) *AdminDeliverabilityHandler {
	return &AdminDeliverabilityHandler{db: db}
}

type deliveryWindow struct {
	Channel string  `json:"channel"`
	Total   int64   `json:"total"`
	Sent    int64   `json:"sent"`
	Errors  int64   `json:"errors"`
	Expired int64   `json:"expired"`
	Rate    float64 `json:"successRate"`
}

type deliveryKindRow struct {
	Channel string  `json:"channel"`
	Kind    string  `json:"kind"`
	Total   int64   `json:"total"`
	Errors  int64   `json:"errors"`
	Rate    float64 `json:"successRate"`
}

type deliveryFailureRow struct {
	ID         string  `json:"id"`
	Channel    string  `json:"channel"`
	Kind       string  `json:"kind"`
	Recipient  string  `json:"recipient"`
	UserID     *string `json:"userId,omitempty"`
	Status     string  `json:"status"`
	StatusCode int     `json:"statusCode"`
	Error      string  `json:"error"`
	CreatedAt  string  `json:"createdAt"`
}

type deliverySummaryResponse struct {
	Last24h    []deliveryWindow     `json:"last24h"`
	Last7d     []deliveryWindow     `json:"last7d"`
	ByKind     []deliveryKindRow    `json:"byKind"`
	Failures   []deliveryFailureRow `json:"recentFailures"`
}

// Summary handles GET /admin/deliverability.
func (h *AdminDeliverabilityHandler) Summary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	windowSQL := `
		SELECT
		  channel,
		  COUNT(*)                                   AS total,
		  COUNT(*) FILTER (WHERE status = 'sent')    AS sent,
		  COUNT(*) FILTER (WHERE status = 'error')   AS errors,
		  COUNT(*) FILTER (WHERE status = 'expired') AS expired
		FROM delivery_events
		WHERE created_at >= NOW() - ?::interval
		GROUP BY channel
		ORDER BY channel`
	type windowScan struct {
		Channel string
		Total   int64
		Sent    int64
		Errors  int64
		Expired int64
	}
	loadWindow := func(interval string) ([]deliveryWindow, error) {
		var rows []windowScan
		if err := h.db.WithContext(ctx).Raw(windowSQL, interval).Scan(&rows).Error; err != nil {
			return nil, err
		}
		out := make([]deliveryWindow, 0, len(rows))
		for _, sRow := range rows {
			rate := 0.0
			if sRow.Total > 0 {
				rate = float64(sRow.Sent) / float64(sRow.Total)
			}
			out = append(out, deliveryWindow{
				Channel: sRow.Channel,
				Total:   sRow.Total,
				Sent:    sRow.Sent,
				Errors:  sRow.Errors,
				Expired: sRow.Expired,
				Rate:    rate,
			})
		}
		return out, nil
	}

	last24h, err := loadWindow("24 hours")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load 24h delivery summary", err)
		return
	}
	last7d, err := loadWindow("7 days")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load 7d delivery summary", err)
		return
	}

	byKindSQL := `
		SELECT
		  channel,
		  kind,
		  COUNT(*)                                 AS total,
		  COUNT(*) FILTER (WHERE status = 'error') AS errors
		FROM delivery_events
		WHERE created_at >= NOW() - INTERVAL '7 days'
		GROUP BY channel, kind
		ORDER BY total DESC, channel, kind`
	type kindScan struct {
		Channel string
		Kind    string
		Total   int64
		Errors  int64
	}
	var kindRows []kindScan
	if err := h.db.WithContext(ctx).Raw(byKindSQL).Scan(&kindRows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load by-kind breakdown", err)
		return
	}
	byKind := make([]deliveryKindRow, 0, len(kindRows))
	for _, kRow := range kindRows {
		rate := 0.0
		if kRow.Total > 0 {
			rate = float64(kRow.Total-kRow.Errors) / float64(kRow.Total)
		}
		byKind = append(byKind, deliveryKindRow{
			Channel: kRow.Channel,
			Kind:    kRow.Kind,
			Total:   kRow.Total,
			Errors:  kRow.Errors,
			Rate:    rate,
		})
	}

	failuresSQL := `
		SELECT
		  id,
		  channel,
		  kind,
		  recipient,
		  user_id,
		  status,
		  status_code,
		  error,
		  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM delivery_events
		WHERE status IN ('error', 'expired')
		ORDER BY created_at DESC
		LIMIT 50`
	var failures []deliveryFailureRow
	if err := h.db.WithContext(ctx).Raw(failuresSQL).Scan(&failures).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load failures", err)
		return
	}
	if failures == nil {
		failures = []deliveryFailureRow{}
	}

	writeJSON(w, http.StatusOK, deliverySummaryResponse{
		Last24h:  last24h,
		Last7d:   last7d,
		ByKind:   byKind,
		Failures: failures,
	})
}

type deliveryDailyPoint struct {
	Day     string `json:"day"`
	Channel string `json:"channel"`
	Total   int64  `json:"total"`
	Errors  int64  `json:"errors"`
}

// Daily handles GET /admin/deliverability/daily?days=14.
func (h *AdminDeliverabilityHandler) Daily(w http.ResponseWriter, r *http.Request) {
	days := 14
	if raw := strings.TrimSpace(r.URL.Query().Get("days")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 90 {
			days = n
		}
	}
	q := `
		SELECT
		  to_char((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
		  channel,
		  COUNT(*)                                                     AS total,
		  COUNT(*) FILTER (WHERE status = 'error')                     AS errors
		FROM delivery_events
		WHERE created_at >= CURRENT_DATE - (?::int - 1) * INTERVAL '1 day'
		GROUP BY day, channel
		ORDER BY day ASC, channel`
	var rows []deliveryDailyPoint
	if err := h.db.WithContext(r.Context()).Raw(q, days).Scan(&rows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load daily delivery", err)
		return
	}
	if rows == nil {
		rows = []deliveryDailyPoint{}
	}
	writeJSON(w, http.StatusOK, rows)
}
