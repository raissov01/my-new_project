// Package aicost converts (model, prompt_tokens, completion_tokens) into a
// USD cost estimate using the published OpenAI / Anthropic price tables.
//
// Prices are per 1M tokens. Update this table when models change — the admin
// cost dashboard will be off otherwise. Last reviewed: 2026-04.
package aicost

import "strings"

// Price is per-1M-tokens, USD.
type Price struct {
	Input  float64
	Output float64
}

var prices = map[string]Price{
	// OpenAI
	"gpt-4o":             {Input: 2.50, Output: 10.00},
	"gpt-4o-mini":        {Input: 0.15, Output: 0.60},
	"gpt-4.1":            {Input: 2.00, Output: 8.00},
	"gpt-4.1-mini":       {Input: 0.40, Output: 1.60},
	"gpt-4.1-nano":       {Input: 0.10, Output: 0.40},
	"o3":                 {Input: 2.00, Output: 8.00},
	"o3-mini":            {Input: 1.10, Output: 4.40},
	"o4-mini":            {Input: 1.10, Output: 4.40},
	"gpt-5":              {Input: 5.00, Output: 20.00},
	"gpt-5-mini":         {Input: 0.50, Output: 2.00},

	// Anthropic Claude
	"claude-3-5-sonnet":  {Input: 3.00, Output: 15.00},
	"claude-3-5-haiku":   {Input: 0.80, Output: 4.00},
	"claude-3-opus":      {Input: 15.00, Output: 75.00},
	"claude-sonnet-4":    {Input: 3.00, Output: 15.00},
	"claude-sonnet-4-5":  {Input: 3.00, Output: 15.00},
	"claude-sonnet-4-6":  {Input: 3.00, Output: 15.00},
	"claude-haiku-4":     {Input: 1.00, Output: 5.00},
	"claude-haiku-4-5":   {Input: 1.00, Output: 5.00},
	"claude-opus-4":      {Input: 15.00, Output: 75.00},
	"claude-opus-4-5":    {Input: 15.00, Output: 75.00},
	"claude-opus-4-6":    {Input: 15.00, Output: 75.00},
	"claude-opus-4-7":    {Input: 15.00, Output: 75.00},
}

// Estimate returns the USD cost for a single completion. Looks up the model
// by exact match first, then by longest known prefix — many call sites pass
// dated revisions like "gpt-4o-mini-2024-07-18".
//
// Returns 0 if the model is not in the table; the admin dashboard surfaces
// these as "untracked" so missing prices are visible rather than silently
// undercounting cost.
func Estimate(model string, promptTokens, completionTokens int) float64 {
	p, ok := lookup(model)
	if !ok {
		return 0
	}
	return float64(promptTokens)/1_000_000.0*p.Input + float64(completionTokens)/1_000_000.0*p.Output
}

// Provider returns the rough vendor for a model id ("openai", "anthropic",
// or "unknown") so we can group cost in the admin UI without a lookup table
// at every call site.
func Provider(model string) string {
	m := strings.ToLower(model)
	switch {
	case strings.HasPrefix(m, "claude"):
		return "anthropic"
	case strings.HasPrefix(m, "gpt") || strings.HasPrefix(m, "o3") || strings.HasPrefix(m, "o4"):
		return "openai"
	default:
		return "unknown"
	}
}

// Known reports whether the model has a price entry. Useful for the admin
// dashboard to flag untracked models.
func Known(model string) bool {
	_, ok := lookup(model)
	return ok
}

func lookup(model string) (Price, bool) {
	if p, ok := prices[model]; ok {
		return p, true
	}
	// Longest-prefix fallback for dated revisions like "gpt-4o-mini-2024-07-18".
	var bestKey string
	for k := range prices {
		if strings.HasPrefix(model, k) && len(k) > len(bestKey) {
			bestKey = k
		}
	}
	if bestKey == "" {
		return Price{}, false
	}
	return prices[bestKey], true
}
