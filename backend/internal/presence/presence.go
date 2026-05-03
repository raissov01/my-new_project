// Package presence keeps a best-effort in-memory map of recently active
// user IDs so the admin panel can show "users online right now". Touched
// from the InternalAuth middleware on every authenticated request.
//
// Single-process only — running multiple backend replicas means each one
// counts only the users it has served. Good enough for an admin overview;
// Prometheus / Redis would be the upgrade path.
package presence

import (
	"sync"
	"time"
)

// Window is the inactivity threshold: a user is considered "online" if they
// made an authenticated request within this window.
const Window = 5 * time.Minute

var (
	mu       sync.RWMutex
	lastSeen = make(map[string]time.Time)
)

// Touch records that this user just made a request. Cheap (one map write
// behind a mutex) — fine to call from a hot middleware path.
func Touch(userID string) {
	if userID == "" {
		return
	}
	now := time.Now()
	mu.Lock()
	lastSeen[userID] = now
	mu.Unlock()
}

// OnlineCount returns the number of users seen within Window.
// Also opportunistically prunes stale entries.
func OnlineCount() int {
	cutoff := time.Now().Add(-Window)
	mu.Lock()
	defer mu.Unlock()
	count := 0
	for uid, t := range lastSeen {
		if t.Before(cutoff) {
			delete(lastSeen, uid)
			continue
		}
		count++
	}
	return count
}

// OnlineUserIDs returns the list of user IDs active within Window.
// Mostly useful for debugging — UI typically only needs the count.
func OnlineUserIDs() []string {
	cutoff := time.Now().Add(-Window)
	mu.RLock()
	defer mu.RUnlock()
	out := make([]string, 0, len(lastSeen))
	for uid, t := range lastSeen {
		if t.After(cutoff) {
			out = append(out, uid)
		}
	}
	return out
}
