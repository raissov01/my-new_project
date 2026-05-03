// Package storage walks the filesystem directories the backend uses for
// uploads (quiz images, quiz audio, telegram media, listening clips) and
// reports per-directory totals so the admin panel can surface disk pressure
// without ssh access to the container.
package storage

import (
	"errors"
	"io/fs"
	"path/filepath"
	"sort"
	"time"
)

// FileInfo is a flattened view of a single file within a scanned directory.
type FileInfo struct {
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Bytes    int64     `json:"bytes"`
	Modified time.Time `json:"modified"`
	Orphan   bool      `json:"orphan,omitempty"`
}

// DirReport summarizes one scanned directory. Largest is capped at top N
// files by size so the admin UI stays responsive even with large dirs.
//
// OrphanCount/OrphanBytes are populated when the caller passes a referenced
// filename set into ScanDirWithRefs; otherwise they remain zero and the UI
// shows "—" for that column.
type DirReport struct {
	Name        string     `json:"name"`
	Path        string     `json:"path"`
	Exists      bool       `json:"exists"`
	TotalBytes  int64      `json:"totalBytes"`
	FileCount   int        `json:"fileCount"`
	Largest     []FileInfo `json:"largest"`
	OrphanCount int        `json:"orphanCount"`
	OrphanBytes int64      `json:"orphanBytes"`
	Orphans     []FileInfo `json:"orphans,omitempty"`
	LastError   string     `json:"error,omitempty"`
}

// ScanDir recursively walks root and returns total size, file count, and the
// `largestN` largest files. Symlinks are not followed. Returns an empty
// (Exists=false) report when root doesn't exist — the admin UI shows that as
// "not provisioned" instead of erroring.
func ScanDir(root string, largestN int) DirReport {
	return ScanDirWithRefs(root, largestN, nil)
}

// ScanDirWithRefs is ScanDir plus orphan detection: any file whose basename
// is not in `referenced` is flagged Orphan=true. Pass nil to skip orphan
// detection (equivalent to ScanDir).
func ScanDirWithRefs(root string, largestN int, referenced map[string]bool) DirReport {
	report := DirReport{Name: filepath.Base(root), Path: root}

	if _, err := filepath.Abs(root); err != nil {
		report.LastError = err.Error()
		return report
	}

	var collected []FileInfo
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			// If the root itself is missing, return early with Exists=false.
			if errors.Is(walkErr, fs.ErrNotExist) && path == root {
				return walkErr
			}
			// Tolerate per-entry errors (permissions etc.).
			return nil
		}
		if d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		report.FileCount++
		report.TotalBytes += info.Size()
		entry := FileInfo{
			Name:     d.Name(),
			Path:     path,
			Bytes:    info.Size(),
			Modified: info.ModTime(),
		}
		if referenced != nil && !referenced[d.Name()] {
			entry.Orphan = true
			report.OrphanCount++
			report.OrphanBytes += info.Size()
		}
		collected = append(collected, entry)
		return nil
	})

	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return report
		}
		report.LastError = err.Error()
	}

	report.Exists = true
	sort.Slice(collected, func(i, j int) bool {
		return collected[i].Bytes > collected[j].Bytes
	})

	// Pull the top orphans (by size) for the admin "candidates to delete" panel.
	if referenced != nil {
		var orphans []FileInfo
		for _, f := range collected {
			if f.Orphan {
				orphans = append(orphans, f)
			}
			if len(orphans) >= 10 {
				break
			}
		}
		report.Orphans = orphans
	}

	if largestN > 0 && len(collected) > largestN {
		collected = collected[:largestN]
	}
	report.Largest = collected
	return report
}
