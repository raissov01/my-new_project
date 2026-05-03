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
}

// DirReport summarizes one scanned directory. Largest is capped at top N
// files by size so the admin UI stays responsive even with large dirs.
type DirReport struct {
	Name       string     `json:"name"`
	Path       string     `json:"path"`
	Exists     bool       `json:"exists"`
	TotalBytes int64      `json:"totalBytes"`
	FileCount  int        `json:"fileCount"`
	Largest    []FileInfo `json:"largest"`
	LastError  string     `json:"error,omitempty"`
}

// ScanDir recursively walks root and returns total size, file count, and the
// `largestN` largest files. Symlinks are not followed. Returns an empty
// (Exists=false) report when root doesn't exist — the admin UI shows that as
// "not provisioned" instead of erroring.
func ScanDir(root string, largestN int) DirReport {
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
		collected = append(collected, FileInfo{
			Name:     d.Name(),
			Path:     path,
			Bytes:    info.Size(),
			Modified: info.ModTime(),
		})
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
	if largestN > 0 && len(collected) > largestN {
		collected = collected[:largestN]
	}
	report.Largest = collected
	return report
}
