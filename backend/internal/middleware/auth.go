package middleware

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const userIDKey contextKey = "userID"

func extractBearerToken(value string) string {
	if value == "" {
		return ""
	}

	token := strings.TrimPrefix(value, "Bearer ")
	if token == value {
		return ""
	}

	return strings.TrimSpace(token)
}

// OptionalAuth extracts a user ID from the Authorization header if present.
// It does NOT reject unauthenticated requests — it just annotates the context.
//
// Current implementation: reads a plain user-ID from "Bearer <user-id>".
// TODO: Replace this temporary plain-token compatibility path with the
// first-party JWT helper once all callers send real session tokens.
func OptionalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if auth := r.Header.Get("Authorization"); auth != "" {
			token := extractBearerToken(auth)
			if token != "" {
				// Legacy compatibility path for internal bridge callers.
				ctx := context.WithValue(r.Context(), userIDKey, token)
				r = r.WithContext(ctx)
			}
		}
		next(w, r)
	}
}

// InternalAuthHTTP is the http.HandlerFunc version of InternalAuth.
// Used by legacy handlers that haven't been converted to Gin yet.
func InternalAuthHTTP(internalToken string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if internalToken == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"error":"internal api token is not configured"}`))
			return
		}

		token := extractBearerToken(r.Header.Get("Authorization"))
		if token == "" || token != internalToken {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"invalid internal api token"}`))
			return
		}

		userID := strings.TrimSpace(r.Header.Get("X-User-ID"))
		if userID == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"missing x-user-id"}`))
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next(w, r.WithContext(ctx))
	}
}

// RequireAuth rejects unauthenticated requests with 401.
// Use this for write endpoints (pomodoro save, XP update, etc.)
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok || userID == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"authentication required"}`))
			return
		}
		next(w, r)
	}
}

// UserIDFromContext retrieves the authenticated user ID from the request context.
func UserIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(userIDKey).(string)
	return v, ok
}
