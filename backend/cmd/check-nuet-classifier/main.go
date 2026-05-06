// check-nuet-classifier loads the seeded questions.json and reports topic
// distribution from the keyword classifier. Useful for quickly evaluating
// regex coverage without running a DB seed.
//
// Usage: go run ./cmd/check-nuet-classifier
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"

	"github.com/midoriya/flashlearn-backend/internal/database"
)

type seedQuestion struct {
	Section  string   `json:"section"`
	Prompt   string   `json:"prompt"`
	Options  []string `json:"options"`
	Position int      `json:"position"`
	TestName string   `json:"testName"`
}

func main() {
	path := "internal/database/nuet_seed_data/questions.json"
	if len(os.Args) > 1 {
		path = os.Args[1]
	}
	buf, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read %s: %v\n", path, err)
		os.Exit(1)
	}
	var qs []seedQuestion
	if err := json.Unmarshal(buf, &qs); err != nil {
		fmt.Fprintf(os.Stderr, "parse %s: %v\n", path, err)
		os.Exit(1)
	}

	bySection := map[string]map[string]int{
		"math":               {},
		"critical_thinking": {},
	}
	unmatched := map[string][]string{
		"math":               {},
		"critical_thinking": {},
	}

	for _, q := range qs {
		slug := database.ClassifyNUETTopic(q.Prompt, q.Options, q.Section)
		bucket := bySection[q.Section]
		if bucket == nil {
			continue
		}
		if slug == "" {
			bucket["(unmatched)"]++
			if len(unmatched[q.Section]) < 5 {
				unmatched[q.Section] = append(unmatched[q.Section], fmt.Sprintf("%s #%d %s", q.TestName, q.Position, truncate(q.Prompt, 100)))
			}
			continue
		}
		bucket[slug]++
	}

	for _, section := range []string{"math", "critical_thinking"} {
		fmt.Printf("\n== %s ==\n", section)
		bucket := bySection[section]
		total := 0
		for _, n := range bucket {
			total += n
		}
		type entry struct {
			slug  string
			count int
		}
		entries := make([]entry, 0, len(bucket))
		for slug, count := range bucket {
			entries = append(entries, entry{slug, count})
		}
		sort.Slice(entries, func(i, j int) bool { return entries[i].count > entries[j].count })
		for _, e := range entries {
			fmt.Printf("  %4d  %s\n", e.count, e.slug)
		}
		fmt.Printf("  total: %d\n", total)
		if samples := unmatched[section]; len(samples) > 0 {
			fmt.Printf("  sample unmatched:\n")
			for _, s := range samples {
				fmt.Printf("    - %s\n", s)
			}
		}
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
