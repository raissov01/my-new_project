// Package errlog captures recent log output into an in-memory ring buffer
// so the admin panel can display backend errors without needing shell access
// to the running container.
//
// Hook it during startup with:
//
//	log.SetOutput(io.MultiWriter(os.Stderr, errlog.Writer()))
//
// Lines are still written to stderr; the ring buffer is a tee.
package errlog

import (
	"bytes"
	"strings"
	"sync"
	"time"
)

// Capacity is the max number of lines retained. Sized so the response stays
// well under a megabyte even if every line is ~500 bytes.
const Capacity = 500

// Entry is one captured log line.
type Entry struct {
	Time    time.Time `json:"time"`
	Level   string    `json:"level"`
	Message string    `json:"message"`
}

var (
	mu      sync.RWMutex
	buf     = make([]Entry, 0, Capacity)
	writer  = &teeWriter{}
	pending bytes.Buffer
)

// Writer returns the io.Writer that should be tee'd into log.SetOutput.
func Writer() *teeWriter { return writer }

type teeWriter struct{}

func (w *teeWriter) Write(p []byte) (int, error) {
	mu.Lock()
	pending.Write(p)
	for {
		idx := bytes.IndexByte(pending.Bytes(), '\n')
		if idx < 0 {
			break
		}
		line := string(pending.Next(idx + 1))
		appendLine(strings.TrimRight(line, "\n"))
	}
	mu.Unlock()
	return len(p), nil
}

func appendLine(line string) {
	if line == "" {
		return
	}
	e := Entry{
		Time:    time.Now(),
		Level:   inferLevel(line),
		Message: line,
	}
	if len(buf) < Capacity {
		buf = append(buf, e)
		return
	}
	// Shift left by one — small array, infrequent compared to writes.
	copy(buf, buf[1:])
	buf[len(buf)-1] = e
}

// inferLevel guesses a level from the line text. Stdlib `log` does not embed
// a level, so we look for common substrings — good enough for admin filtering.
func inferLevel(line string) string {
	l := strings.ToLower(line)
	switch {
	case strings.Contains(l, "panic") || strings.Contains(l, "fatal"):
		return "fatal"
	case strings.Contains(l, "error") || strings.Contains(l, "failed") || strings.Contains(l, " err "):
		return "error"
	case strings.Contains(l, "warn"):
		return "warn"
	default:
		return "info"
	}
}

// Recent returns up to limit most-recent entries, optionally filtered by level.
// limit <= 0 returns all retained entries.
func Recent(limit int, level string) []Entry {
	mu.RLock()
	defer mu.RUnlock()

	out := make([]Entry, 0, len(buf))
	for i := len(buf) - 1; i >= 0; i-- {
		if level != "" && buf[i].Level != level {
			continue
		}
		out = append(out, buf[i])
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out
}

// Stats returns a per-level count over the entire ring buffer.
func Stats() map[string]int {
	mu.RLock()
	defer mu.RUnlock()
	counts := map[string]int{"fatal": 0, "error": 0, "warn": 0, "info": 0}
	for _, e := range buf {
		counts[e.Level]++
	}
	return counts
}
