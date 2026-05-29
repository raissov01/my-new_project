package database

// Source documents (Cambridge Assessment International Education, © UCLES
// 2023, licensed to Nazarbayev University):
//   backend/nuet-materials/specs/2026/nuet-2026-math-specification.pdf
//   backend/nuet-materials/specs/2026/nuet-2026-ct-ps-specification.pdf
//
// This file encodes the canonical 2026 Cambridge specification verbatim so
// that the seeder, classifier, and any future syllabus diff tool can reason
// over the official item codes (M1.1, M5.18, CT-3, PS-2, etc.) rather than
// over the platform-internal topic slugs alone.
//
// The existing nuet_topics taxonomy in OfficialNUETTopics() is a pedagogy
// layer on top of this spec: each platform topic maps to one or more
// Cambridge items via SpecCrosswalk2026. The spec data here is the source
// of truth for "what NUET officially examines"; the topic list in
// nuet_official_syllabus.go is the source of truth for "how the site
// organises study material".

// SpecItem2026 is one numbered objective from the Cambridge spec.
type SpecItem2026 struct {
	Code  string // e.g. "M2.11", "CT-3", "PS-1"
	Title string // short label
	Notes string // verbatim or paraphrased detail (kept terse — for the full
	// wording, read the PDF)
}

// SpecSection2026 groups SpecItems under their Cambridge heading.
type SpecSection2026 struct {
	Code  string         // "M1" … "M5", "PS", "CT"
	Title string         // "Units", "Number", "Problem Solving", …
	Items []SpecItem2026 //
}

// Mathematics2026Spec returns the five Cambridge math sections (M1–M5) and
// their 65 sub-items, in the order the PDF lists them.
func Mathematics2026Spec() []SpecSection2026 {
	return []SpecSection2026{
		{Code: "M1", Title: "Units", Items: []SpecItem2026{
			{Code: "M1.1", Title: "Standard and compound units",
				Notes: "Standard units of mass/length/time/money; compound units — speed, rates of pay, unit pricing, density, pressure."},
			{Code: "M1.2", Title: "Unit conversion",
				Notes: "Change freely between standard and compound units in numerical and algebraic contexts."},
		}},
		{Code: "M2", Title: "Number", Items: []SpecItem2026{
			{Code: "M2.1", Title: "Order and compare numbers", Notes: "Integers, decimals, fractions; symbols =, ≠, <, >, ≤, ≥."},
			{Code: "M2.2", Title: "Four operations", Notes: "Integers, decimals, fractions, mixed numbers — positive and negative. Place value."},
			{Code: "M2.3", Title: "Primes, factors, multiples", Notes: "HCF, LCM, prime factorisation (product notation, unique factorisation theorem)."},
			{Code: "M2.4", Title: "Operation relationships", Notes: "Inverse operations, cancellation, priority of operations (brackets, powers, roots, reciprocals)."},
			{Code: "M2.5", Title: "Systematic listing", Notes: "If m × n outcomes, etc. (Counting principle.)"},
			{Code: "M2.6", Title: "Squares, cubes and their roots", Notes: "Vocabulary: square, positive/negative square root, cube, cube root."},
			{Code: "M2.7", Title: "Index laws (numeric)", Notes: "Integer, fractional and negative powers."},
			{Code: "M2.8", Title: "Standard form", Notes: "a × 10ⁿ with 1 ≤ a < 10; interpret, order, calculate."},
			{Code: "M2.9", Title: "Fractions, decimals, percentages", Notes: "Convert between terminating decimals/percentages/fractions and between recurring decimals and fractions."},
			{Code: "M2.10", Title: "Interchangeable use", Notes: "Use F/D/P interchangeably; equivalent fractions."},
			{Code: "M2.11", Title: "Surds and exact calculation", Notes: "Simplify surds (e.g. √12 = 2√3); rationalise denominators including conjugates."},
			{Code: "M2.12", Title: "Upper and lower bounds", Notes: "Calculate with upper/lower bounds in contextual problems."},
			{Code: "M2.13", Title: "Rounding and error intervals", Notes: "Round to dp/sf; inequality notation for truncation/rounding error."},
			{Code: "M2.14", Title: "Approximation and estimation", Notes: "Including expressions involving π or surds."},
		}},
		{Code: "M3", Title: "Ratio and proportion", Items: []SpecItem2026{
			{Code: "M3.1", Title: "Scale factors and maps"},
			{Code: "M3.2", Title: "Fraction of another quantity", Notes: "Less than 1 or greater than 1."},
			{Code: "M3.3", Title: "Ratio notation"},
			{Code: "M3.4", Title: "Divide a quantity in a ratio", Notes: "Two-or-more parts; express division as a ratio."},
			{Code: "M3.5", Title: "Applied ratios", Notes: "Conversion, comparison, scaling, mixing, concentration."},
			{Code: "M3.6", Title: "Proportion", Notes: "Relate ratios to fractions and to linear functions."},
			{Code: "M3.7", Title: "Fractions in ratio problems"},
			{Code: "M3.8", Title: "Percentages", Notes: "Definition, comparison, >100%, percentage change, original-value, simple interest."},
			{Code: "M3.9", Title: "Direct and inverse proportion", Notes: "Algebraic representations; integer/fractional powers; y ∝ 1/x equivalent to y ∝ y⁻¹."},
			{Code: "M3.10", Title: "Lengths/areas/volumes ratios", Notes: "Links to similarity, scale factors, trigonometric ratios."},
			{Code: "M3.11", Title: "Growth and decay; compound interest", Notes: "Iterative processes."},
		}},
		{Code: "M4", Title: "Algebra", Items: []SpecItem2026{
			{Code: "M4.1", Title: "Algebraic notation"},
			{Code: "M4.2", Title: "Index laws (algebraic)", Notes: "Integer, fractional, negative powers."},
			{Code: "M4.3", Title: "Substitution and vocabulary", Notes: "Expression, equation, formula, identity, inequality, term, factor."},
			{Code: "M4.4", Title: "Collect like terms; expand brackets", Notes: "Expand products of two or more binomials."},
			{Code: "M4.5", Title: "Factorise quadratics", Notes: "x²+bx+c and ax²+bx+c; difference of two squares."},
			{Code: "M4.6", Title: "Simplify rational expressions", Notes: "Four rules on algebraic rational expressions."},
			{Code: "M4.7", Title: "Change the subject of a formula"},
			{Code: "M4.8", Title: "Equation vs identity", Notes: "Prove equivalence."},
			{Code: "M4.9", Title: "Coordinates in four quadrants"},
			{Code: "M4.10", Title: "Linear functions", Notes: "Gradient/intercept; parallel/perpendicular; equation through points."},
			{Code: "M4.11", Title: "Quadratic functions — roots and turning points", Notes: "Algebraic deduction; completing the square for turning points."},
			{Code: "M4.12", Title: "Graphs of standard functions", Notes: "Linear; quadratic; simple cubic; reciprocal y = 1/x; exponential y = kˣ (k > 0); trig (sin/cos/tan in degrees, any size)."},
			{Code: "M4.13", Title: "Non-standard graph interpretation", Notes: "Reciprocal/exponential graphs; kinematic problems."},
			{Code: "M4.14", Title: "Gradients and areas under graphs", Notes: "Distance-time, speed-time, financial contexts."},
			{Code: "M4.15", Title: "Simultaneous equations", Notes: "Linear/linear and linear/quadratic; algebraic and graphical."},
			{Code: "M4.16", Title: "Solve quadratics", Notes: "Factorise, complete the square, quadratic formula."},
			{Code: "M4.17", Title: "Linear inequalities", Notes: "One or two variables; solution sets on a number line, on a graph, or in words."},
			{Code: "M4.18", Title: "Generate sequence terms", Notes: "Term-to-term and position-to-term rules."},
			{Code: "M4.19", Title: "nth term of sequences", Notes: "Linear or quadratic sequences."},
		}},
		{Code: "M5", Title: "Geometry", Items: []SpecItem2026{
			{Code: "M5.1", Title: "Geometric vocabulary", Notes: "Points, lines, segments, vertices, edges, planes, polygons, symmetry."},
			{Code: "M5.2", Title: "Angle facts", Notes: "Angles at a point, on a line, vertically opposite; parallel-line angle properties; polygon angle sums."},
			{Code: "M5.3", Title: "Quadrilaterals and triangles", Notes: "Square, rectangle, parallelogram, trapezium, kite, rhombus."},
			{Code: "M5.4", Title: "Triangle congruence", Notes: "SSS, SAS, ASA, RHS."},
			{Code: "M5.5", Title: "Apply congruence and similarity"},
			{Code: "M5.6", Title: "Transformations", Notes: "Rotation, reflection, translation, enlargement (incl. negative scale factors); translation as a 2D vector."},
			{Code: "M5.7", Title: "Pythagoras' theorem", Notes: "2D and 3D."},
			{Code: "M5.8", Title: "Circle terminology", Notes: "Centre, radius, chord, diameter, circumference, tangent, arc, sector, segment (minor/major)."},
			{Code: "M5.9", Title: "Circle theorems", Notes: "Angle at centre = 2× circumference; semicircle = 90°; same segment; alternate segment; radius ⟂ tangent; cyclic quadrilaterals."},
			{Code: "M5.10", Title: "Coordinate geometry (2D)"},
			{Code: "M5.11", Title: "3D solid terminology", Notes: "Faces, surfaces, edges, vertices for cubes/cuboids/prisms/cylinders/pyramids/cones/spheres/hemispheres."},
			{Code: "M5.12", Title: "Plans and elevations", Notes: "Interpret plans and elevations of 3D shapes."},
			{Code: "M5.13", Title: "Maps, scale drawings and bearings", Notes: "Three-figure bearings."},
			{Code: "M5.14", Title: "Area and prism volume formulae", Notes: "Triangle, parallelogram, trapezium; cuboid and other right prisms."},
			{Code: "M5.15", Title: "Circle and 3D formulae", Notes: "C = 2πr, A = πr², V_cyl = πr²h. Sphere/pyramid/cone formulae are given if needed."},
			{Code: "M5.16", Title: "Arc length and sector area"},
			{Code: "M5.17", Title: "Congruence and similarity in figures", Notes: "Relations between lengths, areas and volumes."},
			{Code: "M5.18", Title: "Right-angled trigonometry", Notes: "sin/cos/tan = opp/adj/hyp ratios; exact values for 0°/30°/45°/60°/90°. Sine rule and cosine rule are explicitly NOT examined."},
			{Code: "M5.19", Title: "Vectors", Notes: "Addition, scalar multiplication, diagrammatic and column form, geometric proofs."},
		}},
	}
}

// CriticalThinking2026Spec returns the official 2026 NUET Critical Thinking
// and Problem Solving structure: 3 PS types + 7 CT types = 10 official
// question kinds. The spec lists more than ten illustrative examples but
// these ten are the named taxonomy in the PDF table of contents and
// section headings.
func CriticalThinking2026Spec() []SpecSection2026 {
	return []SpecSection2026{
		{Code: "PS", Title: "Problem Solving (numerical and spatial reasoning)", Items: []SpecItem2026{
			{Code: "PS-1", Title: "Relevant Selection",
				Notes: "Identify which information from an overloaded scenario is needed to solve the problem."},
			{Code: "PS-2", Title: "Finding Procedures",
				Notes: "Devise a method/procedure for a problem when no off-the-peg solution exists."},
			{Code: "PS-3", Title: "Identifying Similarity",
				Notes: "Recognise the same calculation structure across different surface descriptions."},
		}},
		{Code: "CT", Title: "Critical Thinking (reasoning with text)", Items: []SpecItem2026{
			{Code: "CT-1", Title: "Summarising the Main Conclusion",
				Notes: "Select the option that best states the argument's main conclusion (formerly 'Expression of Conclusion')."},
			{Code: "CT-2", Title: "Drawing a Conclusion",
				Notes: "Identify what new claim follows validly from the given premises."},
			{Code: "CT-3", Title: "Identifying an Assumption",
				Notes: "Find the unstated belief required for the conclusion to follow (negation test)."},
			{Code: "CT-4", Title: "Assessing the Impact of Additional Evidence",
				Notes: "Decide whether new information strengthens, weakens or leaves the conclusion unchanged."},
			{Code: "CT-5", Title: "Detecting Reasoning Errors",
				Notes: "Describe the flaw in an unsound argument (circular reasoning, hasty generalisation, etc.)."},
			{Code: "CT-6", Title: "Matching Arguments",
				Notes: "Pick the option whose logical structure parallels the stem (formerly 'Parallel Reasoning')."},
			{Code: "CT-7", Title: "Applying Principles",
				Notes: "Pick the case to which a given general principle correctly applies."},
		}},
	}
}

// SpecCrosswalk2026 maps Cambridge spec item codes to the existing site
// topic slug(s). A spec item may map to multiple slugs (one official
// objective covered by several platform topics) or to no slug at all,
// in which case the right-hand side is empty — that's the gap list the
// site still owes content for.
//
// Maintain this map alongside any edit to OfficialNUETTopics(): if you
// rename a slug there, update the values here.
func SpecCrosswalk2026() map[string][]string {
	return map[string][]string{
		// MATH
		"M1.1":  {"standard-and-compound-units"},
		"M1.2":  {"standard-and-compound-units"},
		"M2.1":  {}, // implicit prerequisite — not a standalone site topic
		"M2.2":  {},
		"M2.3":  {}, // primes/HCF/LCM — currently no dedicated site topic
		"M2.4":  {},
		"M2.5":  {"combinations"}, // basic counting principle
		"M2.6":  {"exponents"},
		"M2.7":  {"exponents"},
		"M2.8":  {"exponents"}, // standard form referenced in exponents explanation
		"M2.9":  {"percents"},
		"M2.10": {"percents"},
		"M2.11": {}, // surds & rationalisation — GAP, currently no site topic
		"M2.12": {}, // upper/lower bounds — GAP
		"M2.13": {}, // rounding and error intervals — GAP
		"M2.14": {}, // estimation — GAP

		"M3.1":  {"ratio-and-proportion"},
		"M3.2":  {"ratio-and-proportion"},
		"M3.3":  {"ratio-and-proportion"},
		"M3.4":  {"ratio-and-proportion"},
		"M3.5":  {"ratio-and-proportion", "word-problems"},
		"M3.6":  {"ratio-and-proportion"},
		"M3.7":  {"ratio-and-proportion"},
		"M3.8":  {"percents"},
		"M3.9":  {"two-types-of-variations"},
		"M3.10": {"ratio-and-proportion", "triangles"},
		"M3.11": {"percents"}, // compound interest currently described under percents

		"M4.1":  {"algebraic-expressions"},
		"M4.2":  {"exponents", "algebraic-expressions"},
		"M4.3":  {"algebraic-expressions"},
		"M4.4":  {"algebraic-expressions"},
		"M4.5":  {"quadratic-functions"},
		"M4.6":  {"rational-expressions"},
		"M4.7":  {"algebraic-expressions"},
		"M4.8":  {"algebraic-expressions"},
		"M4.9":  {"slope-of-the-line"},
		"M4.10": {"slope-of-the-line"},
		"M4.11": {"quadratic-functions", "graphs-of-quadratic-functions", "examples-of-quadratic-functions"},
		"M4.12": {"transformations", "exponential-functions", "trigonometry"}, // cubic + reciprocal graphs are GAPs
		"M4.13": {},                                                           // reciprocal/exponential graph interpretation — partial GAP
		"M4.14": {},                                                           // distance-time, speed-time graphs — GAP
		"M4.15": {"nonlinear-equations"},
		"M4.16": {"quadratic-functions", "nonlinear-equations"},
		"M4.17": {"linear-inequalities", "quadratic-inequalities"},
		"M4.18": {"sequences"},
		"M4.19": {"sequences"},

		"M5.1":  {"geometry"},
		"M5.2":  {"geometry", "polygons"},
		"M5.3":  {"polygons", "triangles"},
		"M5.4":  {"triangles", "geometry"},
		"M5.5":  {"geometry", "triangles"},
		"M5.6":  {"transformations"},
		"M5.7":  {"triangles"},
		"M5.8":  {"circles"},
		"M5.9":  {"circles"},
		"M5.10": {"slope-of-the-line"},
		"M5.11": {"3d-figures"},
		"M5.12": {}, // plans and elevations — GAP
		"M5.13": {"bearings"},
		"M5.14": {"geometry", "polygons"},
		"M5.15": {"circles", "3d-figures"},
		"M5.16": {"circles"},
		"M5.17": {"geometry"},
		"M5.18": {"trigonometry"}, // NOTE: sine/cosine rules NOT examined; explanation updated.
		"M5.19": {"vectors"},

		// CRITICAL THINKING (PS + CT)
		"PS-1": {"relevant-selection"},
		"PS-2": {"finding-procedures"},
		"PS-3": {"identifying-similarities"},
		"CT-1": {"expression-of-conclusion"},
		"CT-2": {"drawing-conclusion"},
		"CT-3": {"assumptions"},
		"CT-4": {"assessing-impact-of-additional-evidence", "weakening-and-strengthening"},
		"CT-5": {"flaws-and-logical-fallacies"},
		"CT-6": {"parallel-reasoning", "parallels-and-principles"},
		"CT-7": {"applying-principle", "parallels-and-principles"},
	}
}

// Spec2026PendingMathSlugs lists the platform topic slugs that the 2026
// Cambridge math spec demands but the site currently does not have. Adding
// them to OfficialNUETTopics() requires both a seed explanation and at
// least one practice question, so they are tracked here until both exist.
//
// Suggested slugs and the spec items they would cover:
//
//	surds-and-rationalisation              — M2.11
//	upper-and-lower-bounds                 — M2.12
//	rounding-and-error-intervals           — M2.13
//	estimation-and-approximation           — M2.14
//	prime-factorisation-hcf-lcm            — M2.3
//	cubic-and-reciprocal-functions         — M4.12.c, M4.12.d
//	trigonometric-graphs                   — M4.12.f
//	distance-and-speed-time-graphs         — M4.14
//	plans-and-elevations                   — M5.12
//	iterative-processes-compound-interest  — M3.11
//
// See nuet_gap_analysis.md §2 for impact assessment.
func Spec2026PendingMathSlugs() []string {
	return []string{
		"surds-and-rationalisation",
		"upper-and-lower-bounds",
		"rounding-and-error-intervals",
		"estimation-and-approximation",
		"prime-factorisation-hcf-lcm",
		"cubic-and-reciprocal-functions",
		"trigonometric-graphs",
		"distance-and-speed-time-graphs",
		"plans-and-elevations",
		"iterative-processes-compound-interest",
	}
}
