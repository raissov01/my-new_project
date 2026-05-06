// list-broken-nuet-questions scans the enriched questions.json and prints a
// triage report for every question where the LLM said it could not derive
// the stated correct answer. These are usually source-data problems:
//
//   - the prompt was truncated by the PDF extractor,
//   - the answer key in pdf_tests.json is wrong,
//   - the question references a figure that did not survive extraction.
//
// Use the report to prioritise manual fixes; once the source is corrected,
// rerun cmd/enrich-nuet-explanations to refresh the explanation.
//
// Usage:
//
//	go run ./cmd/list-broken-nuet-questions [-input PATH] [-md report.md]
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
)

type seedQuestion struct {
	TestName    string   `json:"testName"`
	Position    int      `json:"position"`
	Section     string   `json:"section"`
	Prompt      string   `json:"prompt"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
}

// Phrases the strengthened enrich prompt instructs the LLM to use when the
// stated answer cannot be derived. Keep them lowercase for matching.
var brokenSignals = []string{
	"cannot be derived",
	"cannot be reached",
	"cannot reach",
	"does not match",
	"does not simplify to",
	"not derivable",
}

func main() {
	input := flag.String("input", "internal/database/nuet_seed_data/questions.json", "path to questions.json")
	mdOut := flag.String("md", "", "optional path to write a markdown report")
	flag.Parse()

	buf, err := os.ReadFile(*input)
	if err != nil {
		log.Fatalf("read %s: %v", *input, err)
	}
	var qs []seedQuestion
	if err := json.Unmarshal(buf, &qs); err != nil {
		log.Fatalf("parse %s: %v", *input, err)
	}

	broken := make([]seedQuestion, 0)
	for _, q := range qs {
		if isBroken(q.Explanation) {
			broken = append(broken, q)
		}
	}

	report := buildReport(broken, len(qs))
	fmt.Println(report)

	if *mdOut != "" {
		if err := os.WriteFile(*mdOut, []byte(report), 0o644); err != nil {
			log.Fatalf("write %s: %v", *mdOut, err)
		}
		log.Printf("wrote %s", *mdOut)
	}
}

func isBroken(explanation string) bool {
	lower := strings.ToLower(explanation)
	for _, sig := range brokenSignals {
		if strings.Contains(lower, sig) {
			return true
		}
	}
	return false
}

func buildReport(broken []seedQuestion, total int) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# NUET broken-data triage\n\n")
	fmt.Fprintf(&b, "Total scanned: %d. Flagged: %d.\n\n", total, len(broken))
	if len(broken) == 0 {
		fmt.Fprintf(&b, "Nothing flagged — every explanation is self-consistent.\n")
		return b.String()
	}

	byTest := map[string][]seedQuestion{}
	testOrder := []string{}
	for _, q := range broken {
		if _, seen := byTest[q.TestName]; !seen {
			testOrder = append(testOrder, q.TestName)
		}
		byTest[q.TestName] = append(byTest[q.TestName], q)
	}

	for _, test := range testOrder {
		fmt.Fprintf(&b, "## %s (%d flagged)\n\n", test, len(byTest[test]))
		for _, q := range byTest[test] {
			fmt.Fprintf(&b, "### #%d  · section: %s  · stated answer: %s\n\n", q.Position, q.Section, q.Answer)
			fmt.Fprintf(&b, "**Prompt:**\n\n```\n%s\n```\n\n", trim(q.Prompt, 600))
			if len(q.Options) > 0 {
				fmt.Fprintf(&b, "**Options:**\n\n")
				for i, opt := range q.Options {
					fmt.Fprintf(&b, "- %s) %s\n", string(rune('A'+i)), trim(opt, 200))
				}
				fmt.Fprintln(&b)
			}
			fmt.Fprintf(&b, "**LLM verdict:**\n\n```\n%s\n```\n\n", trim(extractVerdict(q.Explanation), 400))
			fmt.Fprintln(&b, "---")
			fmt.Fprintln(&b)
		}
	}
	return b.String()
}

// extractVerdict pulls the sentence that triggered the broken signal so the
// report stays compact. Falls back to the trailing 400 characters of the
// explanation when no signal phrase is found verbatim.
func extractVerdict(explanation string) string {
	lower := strings.ToLower(explanation)
	for _, sig := range brokenSignals {
		idx := strings.Index(lower, sig)
		if idx == -1 {
			continue
		}
		start := idx
		for start > 0 && explanation[start-1] != '.' && explanation[start-1] != '\n' {
			start--
		}
		end := idx + len(sig)
		for end < len(explanation) && explanation[end] != '.' && explanation[end] != '\n' {
			end++
		}
		if end < len(explanation) {
			end++
		}
		return strings.TrimSpace(explanation[start:end])
	}
	if len(explanation) <= 400 {
		return explanation
	}
	return explanation[len(explanation)-400:]
}

func trim(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
