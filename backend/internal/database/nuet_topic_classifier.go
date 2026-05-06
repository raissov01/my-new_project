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
var mathRules = []classifierRule{
	{slug: "trigonometry-in-right-angled-triangle", match: mustCompile(`\b(sin|cos|tan|sec|csc|cot)\b|hypotenuse|opposite\s+side|adjacent\s+side|\\theta|\\sin|\\cos|\\tan`)},
	{slug: "vectors", match: mustCompile(`\bvector\b|\\vec|\\mathbf|magnitude|dot\s+product|cross\s+product|\\overrightarrow`)},
	{slug: "circle-theorems-especially-with-chords", match: mustCompile(`chord|cyclic\s+quadrilateral|inscribed\s+angle|alternate\s+segment|circle\s+theorem|tangent\s+to\s+the\s+circle`)},
	{slug: "compound-3d-figure-cylinder-sphere-cone", match: mustCompile(`\bcylinder\b|\bsphere\b|\bcone\b|hemisphere|frustum|surface\s+area|\bvolume\b`)},
	{slug: "bearings", match: mustCompile(`bearing|due\s+(north|south|east|west)|compass`)},
	{slug: "rhombus-kite-trapezium", match: mustCompile(`rhombus|\bkite\b|trapezium|trapezoid|parallelogram`)},
	{slug: "real-life-graphs-velocity-time", match: mustCompile(`velocity[\s\-]*time|distance[\s\-]*time|speed[\s\-]*time\s+graph|displacement[\s\-]*time`)},
	{slug: "vertex-turning-point-of-parabola", match: mustCompile(`vertex|turning\s+point|minimum\s+value|maximum\s+value|axis\s+of\s+symmetry`)},
	{slug: "graph-transformation-usually-parabola", match: mustCompile(`f\(x[\s\+\-]\d+\)|translate|reflect|transformation\s+of\s+the\s+graph|stretch\s+by\s+a\s+factor`)},
	{slug: "parallel-and-perpendicular-lines", match: mustCompile(`parallel\s+line|perpendicular\s+line|gradient|slope`)},
	{slug: "coordinate-geometry", match: mustCompile(`midpoint|distance\s+formula|coordinate\s+plane|\(x_?\d|y[\s_]*=[\s\-]*mx`)},
	{slug: "exponents-with-bases-2-3-and-5", match: mustCompile(`exponent|\bpower\b|2\^|3\^|5\^|\^\{|\\frac\{1\}\{2\^|index\s+laws`)},
	{slug: "rounding-to-significant-figures-standard-form", match: mustCompile(`significant\s+figure|standard\s+form|scientific\s+notation|round(ed)?\s+to`)},
	{slug: "recurring-decimals", match: mustCompile(`recurring|repeating\s+decimal|\\overline`)},
	{slug: "percentages-word-problem-decrease-increase", match: mustCompile(`percentage\s+(increase|decrease)|percent\s+(increase|decrease)|\bpercent\b|\b%\b`)},
	{slug: "direct-and-inverse-proportion", match: mustCompile(`directly\s+proportional|inversely\s+proportional|varies\s+(directly|inversely)|in\s+the\s+ratio`)},
	{slug: "algebraic-simplification-with-x-variable", match: mustCompile(`simplify|factori[sz]e|expand|polynomial|\\frac.*x|x\^2|quadratic`)},
}

// Critical Thinking rules. Default fallback is "problem-solving".
var ctRules = []classifierRule{
	{slug: "data-interpretation", match: mustCompile(`the\s+(table|chart|graph|diagram)\s+(shows|below|above)|according\s+to\s+the\s+(table|chart|graph)|bar\s+chart|pie\s+chart`)},
	{slug: "pattern-recognition", match: mustCompile(`next\s+(term|number|figure)|complete\s+the\s+(sequence|pattern)|is\s+to\s+\w+\s+as\s+\w+\s+is\s+to|missing\s+(term|number|figure)|analogy`)},
	{slug: "argument-analysis", match: mustCompile(`weakens?|strengthens?|undermines?|assumption|supports?\s+the\s+(argument|conclusion)|flaw\s+in\s+the\s+(argument|reasoning)`)},
	{slug: "logical-reasoning", match: mustCompile(`must\s+be\s+true|follows?\s+(logically\s+)?from|logical(ly)?\s+(follows?|implies)|if\s+.*\s+then|valid\s+conclusion`)},
}
