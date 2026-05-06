package database

import (
	"regexp"
	"strings"
)

// ClassifyNUETTopic returns the topic slug that best matches an extracted
// question's prompt + options. It uses ordered keyword rules so a single
// regex hit decides the topic. Rules are arranged most-specific first.
//
// Returns "" if no rule matches; callers should fall back to topic_id = NULL.
func ClassifyNUETTopic(prompt string, options []string, section string) string {
	haystack := normaliseForClassifier(prompt + " " + strings.Join(options, " "))
	rules := mathRules
	if section == "critical_thinking" {
		rules = ctRules
	}
	for _, rule := range rules {
		if rule.match.MatchString(haystack) {
			return rule.slug
		}
	}
	if section == "critical_thinking" {
		return "problem-solving"
	}
	return ""
}

type classifierRule struct {
	slug  string
	match *regexp.Regexp
}

func mustCompile(pattern string) *regexp.Regexp {
	return regexp.MustCompile(`(?i)` + pattern)
}

// normaliseForClassifier strips LaTeX delimiters and collapses whitespace
// so keyword regexes can match raw words inside math markup.
func normaliseForClassifier(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "$$", " ")
	s = strings.ReplaceAll(s, "\\(", " ")
	s = strings.ReplaceAll(s, "\\)", " ")
	s = strings.ReplaceAll(s, "\\[", " ")
	s = strings.ReplaceAll(s, "\\]", " ")
	s = strings.ReplaceAll(s, "$", " ")
	return s
}

// Math rules — ordered most specific first. The first match wins.
//
// Ordering rationale: the more specific or higher-confidence keywords
// run earlier so that, for example, a question about a sphere with a
// volume formula classifies as compound-3d instead of generic exponents.
var mathRules = []classifierRule{
	{slug: "trigonometry-in-right-angled-triangle", match: mustCompile(`\b(sin|cos|tan|sec|csc|cot)\b|hypotenuse|opposite\s+side|adjacent\s+side|\\theta|\\sin|\\cos|\\tan|right[\s\-]?angled\s+triangle`)},
	{slug: "vectors", match: mustCompile(`\bvector\b|\\vec|\\mathbf|magnitude|dot\s+product|cross\s+product|\\overrightarrow`)},
	{slug: "compound-3d-figure-cylinder-sphere-cone", match: mustCompile(`\bcylinder\b|\bsphere\b|\bcone\b|hemisphere|frustum|surface\s+area|\bvolume\b`)},
	{slug: "circle-theorems-especially-with-chords", match: mustCompile(`chord|cyclic\s+quadrilateral|inscribed\s+angle|alternate\s+segment|circle\s+theorem|tangent\s+to\s+the\s+circle|\bcircle\b|circumference|radius|diameter`)},
	{slug: "bearings", match: mustCompile(`bearing|due\s+(north|south|east|west)|\bcompass\b`)},
	{slug: "rhombus-kite-trapezium", match: mustCompile(`rhombus|\bkite\b|trapezium|trapezoid|parallelogram`)},
	{slug: "real-life-graphs-velocity-time", match: mustCompile(`velocity[\s\-]*time|distance[\s\-]*time|speed[\s\-]*time\s+graph|displacement[\s\-]*time`)},
	{slug: "vertex-turning-point-of-parabola", match: mustCompile(`vertex|turning\s+point|minimum\s+value|maximum\s+value|axis\s+of\s+symmetry`)},
	{slug: "graph-transformation-usually-parabola", match: mustCompile(`f\(x[\s\+\-]\d+\)|translate|reflect|transformation\s+of\s+the\s+graph|stretch\s+by\s+a\s+factor`)},
	{slug: "parallel-and-perpendicular-lines", match: mustCompile(`parallel\s+line|perpendicular\s+line|\bgradient\b|\bslope\b`)},
	{slug: "coordinate-geometry", match: mustCompile(`midpoint|distance\s+formula|coordinate\s+plane|\bcoordinates?\b|the\s+points?\s*\(|points?\s+[A-Z]\s*\(\s*-?\d|\\left\([^)]*,[^)]*\\right\)|y[\s_]*=[\s\-]*mx|passes\s+through\s+(the\s+)?(point|origin)|\bline\s+(through|joining)`)},
	{slug: "rounding-to-significant-figures-standard-form", match: mustCompile(`significant\s+figure|standard\s+form|scientific\s+notation|round(ed)?\s+to|nearest\s+(whole|integer|hundredth|tenth)`)},
	{slug: "recurring-decimals", match: mustCompile(`recurring|repeating\s+decimal|\\overline\{0?\.|\\dot\{`)},
	{slug: "percentages-word-problem-decrease-increase", match: mustCompile(`percent|%|\\%|increase[ds]?\s+by\s+\d|decrease[ds]?\s+by\s+\d|profit|loss|discount|tax`)},
	{slug: "direct-and-inverse-proportion", match: mustCompile(`directly\s+proportional|inversely\s+proportional|varies\s+(directly|inversely)|in\s+the\s+ratio|\bratio\b`)},
	{slug: "exponents-with-bases-2-3-and-5", match: mustCompile(`exponent|index\s+laws|\b[2-9]\^|10\^|2\^\{|3\^\{|5\^\{|10\^\{|\\log_?[\d]|\\cdot\s*10\^`)},
	{slug: "algebraic-simplification-with-x-variable", match: mustCompile(`simplify|factori[sz]e|expand|polynomial|quadratic|\bequation\b|solve\s+for|find\s+(the\s+)?value\s+of|inequality|in\s+terms\s+of\s+[a-z]\b|x\^2|x\^\{2|\\frac.*[a-z]|\\left\(.*[a-z]|\bnth\s+term\b|n\^\{?th\}?\s+term|operation\s*\\?[A-Za-z]|\bexpression\b`)},
}

// Critical Thinking rules. Default fallback is "problem-solving".
var ctRules = []classifierRule{
	{slug: "data-interpretation", match: mustCompile(`the\s+(table|chart|graph|diagram|figure)\s+(shows|below|above|gives)|according\s+to\s+the\s+(table|chart|graph)|bar\s+chart|pie\s+chart|line\s+graph|histogram|\b(table|chart|graph)\b\s+(shows|gives|displays|represents)`)},
	{slug: "pattern-recognition", match: mustCompile(`next\s+(term|number|figure)|complete\s+the\s+(sequence|pattern)|is\s+to\s+\w+\s+as\s+\w+\s+is\s+to|missing\s+(term|number|figure)|\banalogy\b|sequence\s+below|odd\s+one\s+out`)},
	{slug: "argument-analysis", match: mustCompile(`weakens?|strengthens?|undermines?|\bassumption\b|supports?\s+the\s+(argument|conclusion)|flaw\s+in\s+the\s+(argument|reasoning)|main\s+point|principle\s+(underlying|behind)`)},
	{slug: "logical-reasoning", match: mustCompile(`must\s+be\s+true|cannot\s+be\s+true|follows?\s+(logically\s+)?from|logical(ly)?\s+(follows?|implies)|if\s+.*\s+then|valid\s+conclusion|either\s+.*\s+or|none\s+of\s+the\s+above\s+can\s+be`)},
}
