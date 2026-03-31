package handler

import (
	"encoding/json"
	"log"
	"net/http"
)

// decodeJSON reads the request body into v.
func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

// writeError logs the error and writes a JSON error response.
func writeError(w http.ResponseWriter, status int, msg string, err error) {
	if err != nil {
		log.Printf("ERROR: %s: %v", msg, err)
	}
	writeJSON(w, status, map[string]string{"error": msg})
}
