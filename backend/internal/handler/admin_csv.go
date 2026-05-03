package handler

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"time"
)

// writeCSV streams a CSV download to the client. The filename baked into
// Content-Disposition includes today's date so admins downloading the same
// export multiple times don't overwrite previous files.
//
// Each row callback should append one row to the writer; close it inside
// the callback or trust the deferred Flush to handle remaining writes.
func writeCSV(w http.ResponseWriter, basename string, header []string, rowCount int, fillRow func(i int) []string) {
	filename := fmt.Sprintf("%s-%s.csv", basename, time.Now().UTC().Format("2006-01-02"))

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)

	cw := csv.NewWriter(w)
	defer cw.Flush()

	if err := cw.Write(header); err != nil {
		return
	}
	for i := 0; i < rowCount; i++ {
		if err := cw.Write(fillRow(i)); err != nil {
			return
		}
	}
}

// wantsCSV returns true when the request is asking for a CSV export.
// Centralised so all admin handlers spell the toggle the same way.
func wantsCSV(r *http.Request) bool {
	return r.URL.Query().Get("format") == "csv"
}
