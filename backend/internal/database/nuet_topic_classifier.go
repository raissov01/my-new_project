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

// Math rules — ordered most specific first. The first match wins, so a
// trig question like "sin θ in a right-angled triangle" classifies as
// trigonometry rather than the more generic "triangles" rule below it.
var mathRules = []classifierRule{
	{slug: "trigonometry", match: mustCompile(`\b(sin|cos|tan|sec|csc|cot)\b|hypotenuse|opposite\s+side|adjacent\s+side|\\theta|\\sin|\\cos|\\tan|sine\s+rule|cosine\s+rule|sohcahtoa`)},
	{slug: "vectors", match: mustCompile(`\bvector\b|\\vec|\\mathbf|magnitude|dot\s+product|cross\s+product|\\overrightarrow|position\s+vector`)},
	{slug: "3d-figures", match: mustCompile(`\bcylinder\b|\bsphere\b|\bcone\b|hemisphere|frustum|surface\s+area\s+of|volume\s+of\s+(a|the|cylinder|sphere|cone|prism)|cuboid|prism`)},
	{slug: "circles", match: mustCompile(`chord|cyclic\s+quadrilateral|inscribed\s+angle|alternate\s+segment|circle\s+theorem|tangent\s+to\s+(the\s+)?circle|\bcircles?\b|circumference|\barc\s+length\b|\bsector\b|\bradius\b|\bdiameter\b`)},
	{slug: "bearings", match: mustCompile(`bearing|due\s+(north|south|east|west)|\bcompass\b`)},
	{slug: "polygons", match: mustCompile(`rhombus|\bkite\b|trapezium|trapezoid|parallelogram|hexagon|pentagon|octagon|polygons?|interior\s+angle|exterior\s+angle|quadrilateral`)},
	{slug: "triangles", match: mustCompile(`right[\s\-]?angled\s+triangle|equilateral|isoceles|isosceles|congruent\s+triangle|similar\s+triangle|pythagor|triangle\s+inequality|\btriangles?\b`)},
	{slug: "quadratic-inequalities", match: mustCompile(`x\^2.*[<>]=?|[<>]=?.*x\^2|quadratic\s+inequality`)},
	{slug: "graphs-of-quadratic-functions", match: mustCompile(`graph\s+of\s+y\s*=|sketch\s+the\s+(graph|parabola)|y[\s_]*=[\s\-]*ax\^2|\bparabola\b`)},
	{slug: "examples-of-quadratic-functions", match: mustCompile(`projectile|height\s+of\s+(a|the)\s+(ball|stone|object)|maximum\s+(area|profit|height)|minimum\s+(area|cost|height)|optimi[sz]ation`)},
	{slug: "quadratic-functions", match: mustCompile(`ax\^2.*bx.*c|quadratic\s+(function|formula|equation)|vertex|turning\s+point|axis\s+of\s+symmetry|completing\s+the\s+square|discriminant`)},
	{slug: "transformations", match: mustCompile(`f\(x[\s\+\-]+a\)|translat(ed?|ion)|reflection\s+in\s+the|stretch\s+by\s+a\s+factor|transformation\s+of\s+the\s+graph`)},
	{slug: "exponential-functions", match: mustCompile(`exponential\s+(function|growth|decay)|half[\s\-]?life|doubling\s+time|y\s*=\s*a\s*\\?\*?\s*b\^x|\\?e\^|continuous\s+growth`)},
	{slug: "linear-inequalities", match: mustCompile(`linear\s+inequality|inequality.*\bx\b|solve\s+the\s+inequality|number\s+line|absolute\s+value.*inequality`)},
	{slug: "slope-of-the-line", match: mustCompile(`slope|\bgradient\b|parallel\s+line|perpendicular\s+line|y\s*=\s*mx|line\s+through.*\(.*\d|line\s+joining|equation\s+of\s+(a\s+|the\s+)?line`)},
	{slug: "nonlinear-equations", match: mustCompile(`square\s+root\s+equation|absolute\s+value\s+equation|extraneous|radical\s+equation|\\sqrt.*=`)},
	{slug: "rational-expressions", match: mustCompile(`rational\s+(expression|function)|complex\s+fraction|partial\s+fraction|\\frac\{[^}]*[a-z][^}]*\}\{[^}]*[a-z]`)},
	{slug: "sequences", match: mustCompile(`\bnth\s+term\b|n\^\{?th\}?\s+term|arithmetic\s+(sequence|progression)|geometric\s+(sequence|progression)|common\s+(difference|ratio)|sequence\s+(s|defined)|recurrence`)},
	{slug: "symbol-functions", match: mustCompile(`operation\s*(\\?[\\\W][a-z]?)?\s*is\s+defined|defined\s+by\s+the\s+rule|a\s*[\\\*★⊕⊗φ\\\\Phi]\s*b|the\s+function\s+f\s+is\s+defined`)},
	{slug: "exponents", match: mustCompile(`exponent|index\s+laws|\b[2-9]\^|10\^|2\^\{|3\^\{|5\^\{|10\^\{|\\log_?[\d]|\\cdot\s*10\^|negative\s+exponent|fractional\s+exponent`)},
	{slug: "standard-and-compound-units", match: mustCompile(`km/h|m/s|km\s*per\s*h|metres\s+per\s+second|kilometres\s+per\s+hour|kg/m|density|pressure|convert.*(unit|km|metres|grams|litres)|compound\s+unit`)},
	{slug: "percents", match: mustCompile(`percent|%|\\%|increase[ds]?\s+by\s+\d|decrease[ds]?\s+by\s+\d|profit|loss|discount|tax|reverse\s+percentage`)},
	{slug: "two-types-of-variations", match: mustCompile(`directly\s+proportional|inversely\s+proportional|varies\s+(directly|inversely|as)|y\s*=\s*k.*x|y\s*=\s*k\/x`)},
	{slug: "ratio-and-proportion", match: mustCompile(`\bratio\b|in\s+the\s+ratio|share.*in\s+the\s+ratio|equivalent\s+ratio|map\s+scale`)},
	{slug: "word-problems", match: mustCompile(`mixture|alloy|tank.*pipe|train.*speed|two\s+cars|age\s+of\s+(\w+\s+)?is\b|how\s+long\s+(does|will|did)`)},
	{slug: "geometry", match: mustCompile(`angle\s+sum|alternate\s+angle|corresponding\s+angle|co[\\\-]?interior|congruen|similar.*triangle|parallel\s+lines|\bsimilar\b`)},
	{slug: "algebraic-expressions", match: mustCompile(`simplify|factori[sz]e|expand|polynomial|like\s+terms|distributive|\bequation\b|solve\s+for|find\s+(the\s+)?value\s+of|in\s+terms\s+of\s+[a-z]\b|x\^2|x\^\{2`)},
}

// Critical Thinking rules. Default fallback is "problem-solving".
//
// Many CT topic boundaries are subtle (e.g. Drawing Conclusion vs
// Expression of Conclusion), so the regexes target distinctive phrasing
// from past NUET wording.
var ctRules = []classifierRule{
	{slug: "weakening-and-strengthening", match: mustCompile(`most\s+(weakens?|strengthens?)|which.*(weakens?|strengthens?)\s+the\s+(argument|conclusion)|undermines?\s+the\s+(argument|conclusion)`)},
	{slug: "assumptions", match: mustCompile(`underlying\s+assumption|implicit\s+assumption|assum[ep](?:tion|ed)|takes?\s+for\s+granted|presupposes?`)},
	{slug: "flaws-and-logical-fallacies", match: mustCompile(`\bflaw\b|fallacy|circular\s+reasoning|false\s+(dilemma|cause|dichotomy)|hasty\s+generali[sz]ation|ad\s+hominem|begs?\s+the\s+question`)},
	{slug: "assessing-impact-of-additional-evidence", match: mustCompile(`if\s+true.*(strengthens?|weakens?)|additional\s+(evidence|information)|the\s+following.*if\s+true|impact\s+(of|on)\s+the\s+(argument|conclusion)`)},
	{slug: "applying-principle", match: mustCompile(`principle.*illustrat|conforms?\s+to\s+the\s+(principle|rule)|applying\s+(this\s+)?principle|the\s+rule.*applies`)},
	{slug: "parallel-reasoning", match: mustCompile(`(structure|pattern)\s+of\s+reasoning|parallel\s+(reasoning|argument)|most\s+similar.*reasoning|argument.*paralleled`)},
	{slug: "parallels-and-principles", match: mustCompile(`underlying\s+principle|principle\s+behind\s+the\s+argument|the\s+same\s+principle.*support`)},
	{slug: "expression-of-conclusion", match: mustCompile(`best\s+expresses?\s+the\s+(main\s+)?(conclusion|point)|main\s+conclusion\s+of\s+the\s+(argument|passage)|states?\s+the\s+conclusion`)},
	{slug: "drawing-conclusion", match: mustCompile(`must\s+be\s+true|cannot\s+be\s+true|follows?\s+(logically\s+)?from|valid\s+conclusion|can\s+be\s+(properly\s+)?inferred|properly\s+drawn|either\s+.*\s+or`)},
	{slug: "verbal-reasoning-argument", match: mustCompile(`the\s+(passage|argument|author)\s+(claims|argues|concludes)|the\s+(passage|argument)\s+says`)},
	{slug: "relevant-selection", match: mustCompile(`relevant\s+to\s+(determining|the\s+question)|sufficient\s+to\s+(answer|solve)|which.*(necessary|enough)\s+to`)},
	{slug: "finding-procedures", match: mustCompile(`procedure|algorithm|step[\s\-]by[\s\-]step|in\s+what\s+order|sequence\s+of\s+steps|which.*correctly\s+achieves`)},
	{slug: "identifying-similarities", match: mustCompile(`most\s+similar|analog(y|ous)|like.*is\s+to|same\s+(structure|type|pattern)\s+as|shares?\s+the\s+(most|key)\s+features?`)},
	{slug: "complex-calculations", match: mustCompile(`\d{3,}.*\d{3,}|approximately\s+how\s+(much|many)|estimate.*to\s+the\s+nearest|per\s+(year|month|week|hour).*total`)},
	{slug: "ct-equations", match: mustCompile(`set\s+up\s+(an?\s+)?equation|which\s+equation\s+(represents?|describes?)|express\s+\w+\s+in\s+terms\s+of`)},
	{slug: "lateral-logic", match: mustCompile(`pigeonhole|invariant|parity|odd\s+or\s+even|cannot\s+be\s+arranged`)},
	{slug: "spatial-measurements", match: mustCompile(`shaded\s+(region|area)|find\s+the\s+(perimeter|area)\s+of\s+the\s+(figure|shape|region)|distance\s+between.*points`)},
	{slug: "visual-reasoning", match: mustCompile(`pattern\s+of\s+(shapes|figures|symbols)|next\s+(figure|shape|in\s+the\s+sequence)|rotate(d)?|reflect(ed)?|odd\s+one\s+out`)},
	{slug: "probabilities", match: mustCompile(`\bprobability\b|p\(\s*[a-z]\s*\)|probability\s+(of|that)|\bdice\b|\bcoin\b|random(ly)?\s+(chosen|selected|drawn)`)},
	{slug: "combinations", match: mustCompile(`\bcombination|\bpermutation|how\s+many\s+(ways|arrangements)|nCr|nPr|\bn!|chosen\s+at\s+random`)},
	{slug: "mock-test-review", match: mustCompile(`mock\s+test\s+review`)},
}
