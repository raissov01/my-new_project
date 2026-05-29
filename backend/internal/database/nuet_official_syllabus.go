package database

import "github.com/midoriya/flashlearn-backend/internal/models"

// OfficialNUETTopics returns the canonical NUET syllabus shipped with
// the platform: 27 Math + 22 Critical Thinking topics. The list is the
// source of truth for cmd/seed-nuet — anything not in this list is
// removed from nuet_topics on reseed.
//
// Mapped against the Cambridge 2026 NUET specification
// (backend/nuet-materials/specs/2026/). For the verbatim Cambridge
// objective codes (M1.1 … M5.19, PS-1 … CT-7) and the slug-to-spec
// crosswalk, see nuet_2026_spec.go. The 2026 spec contains items the
// platform does not yet cover — they are tracked in
// Spec2026PendingMathSlugs() rather than added here, because each new
// topic requires a seed explanation and at least one practice question.
//
// Each entry carries:
//   - Slug: stable URL key (kebab-case, no trailing punctuation)
//   - Section: math | critical_thinking
//   - Title: human-readable label
//   - Description: one-line blurb shown on /nuet/topics index
//   - Explanation: short seed text overwritten by cmd/enrich-nuet-topics
//     once the LLM-generated study material is appended.
//   - OrderIndex: display order within the section
func OfficialNUETTopics() []models.NUETTopic {
	out := make([]models.NUETTopic, 0, len(mathSyllabus)+len(ctSyllabus))
	for i, t := range mathSyllabus {
		out = append(out, models.NUETTopic{
			Slug:        t.slug,
			Section:     "math",
			Title:       t.title,
			Description: t.description,
			Explanation: t.explanation,
			Difficulty:  "medium",
			OrderIndex:  i + 1,
		})
	}
	for i, t := range ctSyllabus {
		out = append(out, models.NUETTopic{
			Slug:        t.slug,
			Section:     "critical_thinking",
			Title:       t.title,
			Description: t.description,
			Explanation: t.explanation,
			Difficulty:  "medium",
			OrderIndex:  i + 1,
		})
	}
	return out
}

// OfficialNUETSlugs returns the set of slugs in the canonical taxonomy.
// Used by the seeder to delete topics that have fallen out of the list.
func OfficialNUETSlugs() map[string]struct{} {
	out := make(map[string]struct{}, len(mathSyllabus)+len(ctSyllabus))
	for _, t := range mathSyllabus {
		out[t.slug] = struct{}{}
	}
	for _, t := range ctSyllabus {
		out[t.slug] = struct{}{}
	}
	return out
}

type officialTopicSeed struct {
	slug        string
	title       string
	description string
	explanation string
}

// Seed explanations are deliberately short — cmd/enrich-nuet-topics
// appends the full KEY POINTS / KEY FORMULAS / WORKED EXAMPLES /
// COMMON MISTAKES block beneath the enriched-section sentinel.
var mathSyllabus = []officialTopicSeed{
	{
		slug:        "standard-and-compound-units",
		title:       "Standard and Compound Units",
		description: "SI units, unit conversions, compound rates (m/s ↔ km/h, density, pressure).",
		explanation: "🌙 Standard and Compound Units\n\nThis topic checks whether you can convert between metric units and reason with compound rates such as speed, density and pressure. NUET frequently disguises a unit-conversion step inside a word problem.\n\nFocus on:\n• converting lengths, masses, times and volumes\n• compound rates: speed (m/s ↔ km/h), density (kg/m³), pressure\n• keeping the units consistent across multi-step calculations",
	},
	{
		slug:        "algebraic-expressions",
		title:       "Algebraic Expressions",
		description: "Simplifying, expanding and factorising expressions with one or more variables.",
		explanation: "🌙 Algebraic Expressions\n\nFoundation algebra: collect like terms, expand brackets, factorise simple polynomials, and manipulate algebraic fractions. Many later NUET topics chain straight off this skill.\n\nFocus on:\n• collecting like terms, distributive property\n• expanding (a+b)(c+d) and (a+b)²\n• factorising — common factor, quadratic, difference of squares\n• simplifying algebraic fractions",
	},
	{
		slug:        "exponents",
		title:       "Exponents",
		description: "Index laws, integer/fractional exponents, scientific notation.",
		explanation: "🌙 Exponents\n\nMastery of index laws lets you simplify expressions like a^m · a^n, (a^m)^n and (ab)^n quickly. Negative and fractional exponents (a^(1/n) = ⁿ√a) are tested every NUET cycle.\n\nFocus on:\n• product, quotient and power rules\n• negative exponents: a^(-n) = 1/aⁿ\n• fractional exponents and roots\n• standard form a × 10ⁿ",
	},
	{
		slug:        "ratio-and-proportion",
		title:       "Ratio and Proportion",
		description: "Sharing in a ratio, scaling, equivalent ratios.",
		explanation: "🌙 Ratio and Proportion\n\nProblems where one quantity scales with another in a fixed ratio. Often combined with percent change in NUET word problems.\n\nFocus on:\n• splitting a quantity in a given ratio\n• equivalent ratios and simplification\n• scale drawings and maps\n• unitary method for unfamiliar problems",
	},
	{
		slug:        "two-types-of-variations",
		title:       "Two Types of Variations",
		description: "Direct (y ∝ x) and inverse (y ∝ 1/x) variation, finding the constant.",
		explanation: "🌙 Two Types of Variations\n\nDirect variation: y = kx. Inverse variation: y = k/x. Sometimes y varies as a power: y = kx² or y = k/x³. Find k from a known pair, then solve for the unknown.\n\nFocus on:\n• distinguishing direct vs inverse from the wording\n• finding the constant of proportionality\n• combined and joint variation",
	},
	{
		slug:        "percents",
		title:       "Percents",
		description: "Percentage of a quantity, increase/decrease, reverse percentage.",
		explanation: "🌙 Percents\n\nPercent of, percent change, and reverse-percentage problems. The common trap: a 20% increase followed by a 20% decrease does not return the original value.\n\nFocus on:\n• converting between percent, decimal and fraction\n• percentage increase/decrease (multiplier method)\n• reverse percentage (finding the original)\n• compound interest as repeated multiplication",
	},
	{
		slug:        "word-problems",
		title:       "Word Problems",
		description: "Translating real-world scenarios into equations or inequalities.",
		explanation: "🌙 Word Problems\n\nThe hardest part is the setup, not the algebra. Read twice, define variables explicitly, then translate each sentence into an equation or inequality.\n\nFocus on:\n• age, distance/speed/time, mixture and rate problems\n• defining variables before writing equations\n• checking units and reasonableness of answers",
	},
	{
		slug:        "linear-inequalities",
		title:       "Linear Inequalities",
		description: "Solving and graphing inequalities, sign flip on negative multiplication.",
		explanation: "🌙 Linear Inequalities\n\nSolve like an equation, but flip the inequality sign whenever you multiply or divide by a negative number. Compound inequalities (a < x < b) and absolute-value inequalities are the next step up.\n\nFocus on:\n• solving ax + b < c\n• flipping the sign rule\n• compound inequalities\n• graphing the solution set on a number line",
	},
	{
		slug:        "slope-of-the-line",
		title:       "Slope of the Line",
		description: "Gradient, slope formula, slope of parallel and perpendicular lines.",
		explanation: "🌙 Slope of the Line\n\nThe slope m = (y₂ − y₁) / (x₂ − x₁). Parallel lines have equal slopes; perpendicular lines have slopes whose product is −1. Coordinate-geometry questions usually start here.\n\nFocus on:\n• slope from two points, from y = mx + c, from ax + by = c\n• parallel and perpendicular conditions\n• equation of a line through a point with a given slope",
	},
	{
		slug:        "transformations",
		title:       "Transformations",
		description: "Translating, reflecting, scaling functions and curves.",
		explanation: "🌙 Transformations\n\nWhen f(x) becomes f(x − h) + k, the graph shifts h units right and k units up. f(−x), −f(x), af(x), f(ax) cover reflection and scaling. Most-tested on parabolas.\n\nFocus on:\n• horizontal and vertical translations\n• reflections in the x- and y-axes\n• vertical and horizontal stretches\n• combining multiple transformations",
	},
	{
		slug:        "quadratic-functions",
		title:       "Quadratic Functions",
		description: "Standard, factored and vertex forms of f(x) = ax² + bx + c.",
		explanation: "🌙 Quadratic Functions\n\nKnow when each form is most useful: standard form for the y-intercept, factored form for roots, vertex form for the turning point. Convert between them with completing the square.\n\nFocus on:\n• standard, factored and vertex forms\n• completing the square\n• discriminant Δ = b² − 4ac and root types\n• axis of symmetry x = −b/(2a)",
	},
	{
		slug:        "examples-of-quadratic-functions",
		title:       "Examples of Quadratic Functions",
		description: "Worked-example questions on quadratics — projectile motion, area, optimisation.",
		explanation: "🌙 Examples of Quadratic Functions\n\nApplication problems where the unknown is modelled by a parabola: projectile height vs time, rectangular area for a fixed perimeter, profit as a function of price. The exam tests whether you can identify the maximum or minimum.\n\nFocus on:\n• projectile and motion problems\n• optimisation via the vertex\n• interpreting the y-intercept and roots in context",
	},
	{
		slug:        "graphs-of-quadratic-functions",
		title:       "Graphs of Quadratic Functions",
		description: "Sketching parabolas: roots, vertex, axis of symmetry, concavity.",
		explanation: "🌙 Graphs of Quadratic Functions\n\nSketch by finding the y-intercept, the roots (if any) and the vertex, then check the sign of a for concavity. Most NUET parabola questions rely on the vertex form.\n\nFocus on:\n• reading roots, vertex and intercepts off the graph\n• concavity (a > 0 opens up, a < 0 opens down)\n• axis of symmetry through the vertex",
	},
	{
		slug:        "quadratic-inequalities",
		title:       "Quadratic Inequalities",
		description: "Solving ax² + bx + c < 0 and > 0 by sign analysis.",
		explanation: "🌙 Quadratic Inequalities\n\nFactorise (or use the quadratic formula) to find the roots, then read off the sign by testing a value in each interval — or use the sketch.\n\nFocus on:\n• factor → number-line sign analysis\n• distinguishing < 0 / > 0 / ≤ 0 / ≥ 0 solution sets\n• absolute-value quadratic inequalities",
	},
	{
		slug:        "rational-expressions",
		title:       "Rational Expressions",
		description: "Simplifying, multiplying, dividing, adding and subtracting fractions with variables.",
		explanation: "🌙 Rational Expressions\n\nA rational expression is p(x)/q(x). Simplify by factoring and cancelling. Combine fractions over a common denominator. Watch for excluded values where the denominator is zero.\n\nFocus on:\n• factor before cancelling\n• common denominator for adding/subtracting\n• complex fractions (fractions inside fractions)",
	},
	{
		slug:        "sequences",
		title:       "Sequences",
		description: "Arithmetic, geometric, recursive sequences. Finding the n-th term and partial sums.",
		explanation: "🌙 Sequences\n\nArithmetic: aₙ = a₁ + (n−1)d. Geometric: aₙ = a₁ · rⁿ⁻¹. Recurrence-defined sequences require computing each term. Sum formulas appear in NUET regularly.\n\nFocus on:\n• identifying arithmetic vs geometric\n• n-th term formulas\n• arithmetic sum Sₙ = n/2 · (a₁ + aₙ)\n• geometric sum Sₙ = a₁(1 − rⁿ) / (1 − r)",
	},
	{
		slug:        "nonlinear-equations",
		title:       "Nonlinear Equations",
		description: "Equations involving radicals, fractions, and absolute values.",
		explanation: "🌙 Nonlinear Equations\n\nSolve equations that aren't pure polynomials: square roots, fractional, absolute-value, and equations with x in both an exponent and a base. Always check for extraneous solutions after squaring or removing absolute value.\n\nFocus on:\n• isolating the radical, then squaring\n• rejecting extraneous roots\n• splitting absolute-value equations into cases",
	},
	{
		slug:        "geometry",
		title:       "Geometry",
		description: "General plane geometry: angles, parallel lines, congruence, similarity.",
		explanation: "🌙 Geometry\n\nThe broad geometry topic that gets used as a building block in many NUET questions: angles on a line, around a point, between parallel lines; congruence and similarity criteria; basic perimeter and area formulas.\n\nFocus on:\n• angle properties on parallel lines (alternate, corresponding, co-interior)\n• congruence (SSS, SAS, ASA) and similarity (AA, SAS)\n• area and perimeter of standard shapes",
	},
	{
		slug:        "exponential-functions",
		title:       "Exponential Functions",
		description: "Functions of the form f(x) = aᵇˣ — growth, decay, half-life problems.",
		explanation: "🌙 Exponential Functions\n\nGrowth: y = a · bˣ with b > 1. Decay: 0 < b < 1. Doubling time and half-life are the typical NUET applications.\n\nFocus on:\n• identifying growth vs decay\n• y-intercept = a, asymptote y = 0\n• solving aᵇˣ = c using logs (introduced via inverse)",
	},
	{
		slug:        "symbol-functions",
		title:       "Symbol Functions",
		description: "Custom-defined operations like a ★ b = ... — interpret and compute.",
		explanation: "🌙 Symbol Functions\n\nNUET likes to define a brand-new operator (e.g. a ★ b = a² − 2b) and then ask you to evaluate it. The trick is just careful substitution; there's no special trick beyond reading the definition.\n\nFocus on:\n• reading the definition slowly\n• substituting numerical values\n• chaining operations (a ★ (b ★ c))",
	},
	{
		slug:        "triangles",
		title:       "Triangles",
		description: "Triangle properties: angle sum, area, congruence, similarity, special triangles.",
		explanation: "🌙 Triangles\n\nThe angle sum is 180°. Area = ½ · base · height (or ½ ab sin C). Congruence and similarity criteria + Pythagoras for right-angled triangles are constantly used as supporting steps.\n\nFocus on:\n• Pythagoras and its converse\n• 30-60-90 and 45-45-90 ratios\n• area = ½ ab sin C\n• triangle inequality",
	},
	{
		slug:        "vectors",
		title:       "Vectors",
		description: "Vector addition, magnitude, scalar multiplication, position vectors.",
		explanation: "🌙 Vectors\n\nA vector has direction and magnitude. Add component-wise. Magnitude |v| = √(x² + y²). Position vectors describe points relative to the origin.\n\nFocus on:\n• component arithmetic\n• magnitude and unit vectors\n• collinearity (parallel position vectors)\n• vector equation of a line",
	},
	{
		slug:        "bearings",
		title:       "Bearings",
		description: "Three-figure bearings and navigation problems on maps and scale drawings.",
		explanation: "🌙 Bearings\n\nA bearing is measured clockwise from north as a three-figure number (e.g. 045°, 230°). Most bearings questions are solved by drawing the diagram and applying right-angled trigonometry or Pythagoras. The 2026 specification (M5.13, M5.18) does not require the sine or cosine rules.\n\nFocus on:\n• drawing accurate diagrams from worded directions\n• converting bearings into triangle interior angles\n• right-angled trigonometry and Pythagoras applied to bearings problems",
	},
	{
		slug:        "polygons",
		title:       "Polygons",
		description: "Interior/exterior angles, regular polygons, special quadrilaterals.",
		explanation: "🌙 Polygons\n\nInterior angle sum of an n-gon = (n − 2) · 180°. Exterior angle sum is always 360°. Regular polygons share interior angles equal to (n − 2) · 180° / n.\n\nFocus on:\n• interior and exterior angle formulas\n• regular polygon properties\n• rhombus, kite, trapezium, parallelogram (special quadrilaterals)",
	},
	{
		slug:        "circles",
		title:       "Circles",
		description: "Circle theorems, chords, tangents, sectors, circumference and area.",
		explanation: "🌙 Circles\n\nThe big circle theorems: angle at the centre = 2 × angle at the circumference; angles in the same segment are equal; angle in a semicircle = 90°; tangent-radius perpendicular; alternate segment theorem.\n\nFocus on:\n• circle theorems with chords\n• tangent and chord relationships\n• arc length L = rθ; sector area A = ½r²θ (θ in radians)",
	},
	{
		slug:        "3d-figures",
		title:       "3D Figures",
		description: "Cylinders, spheres, cones, prisms — surface area and volume.",
		explanation: "🌙 3D Figures\n\nKnow the formulas cold: cylinder volume = πr²h, sphere = ⁴⁄₃πr³, cone = ⅓πr²h. Compound figures (e.g. cylinder + hemisphere) require adding pieces.\n\nFocus on:\n• cylinder, sphere, cone — volume and surface area\n• compound 3D figures\n• cross-sections of prisms",
	},
	{
		slug:        "trigonometry",
		title:       "Trigonometry",
		description: "Right-angled trig, exact ratios for standard angles, sine/cosine/tangent graphs.",
		explanation: "🌙 Trigonometry\n\nSOH-CAH-TOA in right-angled triangles, plus the graphs of y = sin x, y = cos x and y = tan x in degrees for angles of any size. The 2026 Cambridge specification (M5.18) explicitly does NOT require the sine rule or the cosine rule — focus on right-angled work and the exact values for 0°, 30°, 45°, 60°, 90°.\n\nFocus on:\n• SOH-CAH-TOA + Pythagoras\n• exact ratios for 0°/30°/45°/60°/90°\n• sketching y = sin x, y = cos x, y = tan x\n• applying trig in 3D figures",
	},
}

var ctSyllabus = []officialTopicSeed{
	{
		slug:        "verbal-reasoning-argument",
		title:       "Verbal Reasoning / Argument",
		description: "Reading short arguments and identifying their structure.",
		explanation: "🌙 Verbal Reasoning / Argument\n\nA short paragraph presents an argument; you must locate its claim, the reasons given, and any unstated steps. Foundation skill for every other CT question.\n\nFocus on:\n• distinguishing premises from the conclusion\n• linking words: therefore, because, but, however\n• not adding outside knowledge",
	},
	{
		slug:        "expression-of-conclusion",
		title:       "Summarising the Main Conclusion",
		description: "Picking the answer choice that best states the argument's conclusion.",
		explanation: "🌙 Expression of Conclusion\n\nThe argument has one main conclusion; the answer choices paraphrase it with varying accuracy. Avoid options that go beyond what the text actually claims, and reject options that are merely premises.\n\nFocus on:\n• identifying the main claim\n• rejecting overgeneralisations\n• distinguishing the conclusion from a supporting reason",
	},
	{
		slug:        "drawing-conclusion",
		title:       "Drawing a Conclusion",
		description: "What can be validly inferred from the given premises?",
		explanation: "🌙 Drawing Conclusion\n\nUnlike Expression of Conclusion (which restates), Drawing Conclusion asks you to infer something new that must follow. Look for the answer with the strongest logical support.\n\nFocus on:\n• necessary vs sufficient conditions\n• 'must be true' vs 'could be true'\n• transitive chains: A → B and B → C ⇒ A → C",
	},
	{
		slug:        "assumptions",
		title:       "Identifying an Assumption",
		description: "What unstated belief is needed for the argument to hold?",
		explanation: "🌙 Assumptions\n\nAn assumption is the missing link between the premises and the conclusion. The 'negation test' is the gold standard: negate each candidate; whichever destroys the argument is the assumption.\n\nFocus on:\n• locating the gap between premise and conclusion\n• applying the negation test\n• distinguishing assumptions from supporting evidence",
	},
	{
		slug:        "flaws-and-logical-fallacies",
		title:       "Detecting Reasoning Errors",
		description: "Naming the reasoning error in a flawed argument.",
		explanation: "🌙 Flaws and Logical Fallacies\n\nClassic fallacies: circular reasoning, false dilemma, post hoc, ad hominem, appeal to authority, hasty generalisation. NUET tests the description of the flaw, not its label.\n\nFocus on:\n• circular reasoning\n• false dilemma and false cause\n• generalising from a small sample\n• ad hominem and appeal to authority",
	},
	{
		slug:        "assessing-impact-of-additional-evidence",
		title:       "Assessing the Impact of Additional Evidence",
		description: "Does this new fact strengthen, weaken, or have no effect on the argument?",
		explanation: "🌙 Assessing Additional Evidence\n\nA new piece of information is offered after the argument; you decide whether it makes the conclusion more or less likely. Some options are red-herrings — irrelevant to the actual claim.\n\nFocus on:\n• checking if the evidence relates to the conclusion\n• distinguishing strengthen / weaken / neutral\n• ignoring information that is true but irrelevant",
	},
	{
		slug:        "weakening-and-strengthening",
		title:       "Weakening and Strengthening",
		description: "Pick the option that most weakens (or strengthens) the argument.",
		explanation: "🌙 Weakening and Strengthening\n\nFrame each option as an addition to the argument and ask whether the conclusion now follows more or less strongly. The right answer typically attacks (or supports) the unstated assumption.\n\nFocus on:\n• locating the assumption first\n• comparing the magnitude of effect\n• rejecting options that don't address the conclusion",
	},
	{
		slug:        "mock-test-review",
		title:       "Mock Test Review",
		description: "Studying past mistakes from full-mock attempts to find recurring errors.",
		explanation: "🌙 Mock Test Review\n\nNot a question type — a study habit. After each full mock, list every wrong answer with a one-line lesson, then drill that single sub-skill before the next attempt.",
	},
	{
		slug:        "applying-principle",
		title:       "Applying Principles",
		description: "A general principle is given; pick the option that follows it correctly.",
		explanation: "🌙 Applying Principle\n\nThe stem states a rule (e.g. 'a service is acceptable if and only if X and Y'). The answer choices describe situations; pick the one that conforms to the rule exactly.\n\nFocus on:\n• both directions of an 'if and only if'\n• checking every clause of the rule\n• distinguishing necessary from sufficient",
	},
	{
		slug:        "parallel-reasoning",
		title:       "Matching Arguments",
		description: "Identify the answer whose argument structure matches the stem's.",
		explanation: "🌙 Parallel Reasoning\n\nAbstract the stem's structure into a skeleton (e.g. 'all P are Q; X is P; therefore X is Q'). The right answer matches that skeleton even if the topic is unrelated.\n\nFocus on:\n• abstracting away the surface topic\n• preserving universal/existential quantifiers\n• matching the strength of the conclusion",
	},
	{
		slug:        "parallels-and-principles",
		title:       "Parallels and Principles",
		description: "Combined: identify the underlying principle, then find the parallel scenario.",
		explanation: "🌙 Parallels and Principles\n\nA hybrid: extract the principle that justifies the stem, then pick the option that the same principle would justify. Tests both abstraction and application.\n\nFocus on:\n• naming the principle in your own words\n• checking that each candidate is governed by the same principle\n• rejecting options that need a different principle",
	},
	{
		slug:        "problem-solving",
		title:       "Problem Solving",
		description: "General word-problem reasoning that doesn't fit the named CT categories.",
		explanation: "🌙 Problem Solving\n\nThe catch-all CT type: a worded scenario, a question, and five options. The challenge is the setup — read carefully, write down the variables, and avoid jumping to arithmetic.\n\nFocus on:\n• reading the question fully before computing\n• translating words into equations or diagrams\n• estimation to rule out impossible options",
	},
	{
		slug:        "relevant-selection",
		title:       "Relevant Selection",
		description: "From a list of facts, pick the ones that are needed to solve the problem.",
		explanation: "🌙 Relevant Selection\n\nYou are given more information than you need; identify which subset is sufficient to answer the question, and which is decoy.\n\nFocus on:\n• distinguishing necessary from incidental information\n• checking that no key fact is missing\n• avoiding the trap of using everything provided",
	},
	{
		slug:        "finding-procedures",
		title:       "Finding Procedures",
		description: "Pick the algorithm or step list that solves the stated task.",
		explanation: "🌙 Finding Procedures\n\nThe stem describes a goal; the options are different recipes. Trace each recipe step-by-step on a small example to see which produces the correct outcome.\n\nFocus on:\n• simulating each candidate procedure\n• rejecting procedures that miss a case\n• preferring the simpler valid procedure",
	},
	{
		slug:        "identifying-similarities",
		title:       "Identifying Similarity",
		description: "Pick the situation/object/diagram most similar to the one given.",
		explanation: "🌙 Identifying Similarities\n\nA prompt and five candidates. Decide on the relevant axis of similarity (structure? function? cause?) and judge each option on that axis.\n\nFocus on:\n• naming the axis of comparison explicitly\n• ignoring irrelevant surface features\n• looking for shared underlying structure",
	},
	{
		slug:        "complex-calculations",
		title:       "Complex Calculations",
		description: "Multi-step numerical computation under time pressure.",
		explanation: "🌙 Complex Calculations\n\nThe arithmetic is tractable but multi-step; one slip ruins the chain. Estimate first to predict the magnitude, then compute.\n\nFocus on:\n• rough estimation before exact arithmetic\n• keeping intermediate results clearly labelled\n• reading units carefully",
	},
	{
		slug:        "ct-equations",
		title:       "Equations",
		description: "Critical-thinking style equation problems mixed with reasoning.",
		explanation: "🌙 Equations (CT)\n\nUnlike a Math equation, this asks you to set up the right equation from a verbal description and choose between multiple plausible setups.\n\nFocus on:\n• translating relationships into equations\n• checking the equation against a known value\n• matching variable definitions to the question",
	},
	{
		slug:        "lateral-logic",
		title:       "Lateral Logic",
		description: "Puzzle-style logic: pigeonhole, parity, invariants.",
		explanation: "🌙 Lateral Logic\n\nLogic-puzzle questions where the obvious approach fails. Look for invariants, parity, or pigeonhole arguments.\n\nFocus on:\n• checking parity (even/odd) and invariants\n• pigeonhole arguments\n• small-case enumeration to spot a pattern",
	},
	{
		slug:        "spatial-measurements",
		title:       "Spatial Measurements",
		description: "Measuring distances, areas and angles inside a diagram.",
		explanation: "🌙 Spatial Measurements\n\nGiven a diagram with labelled lengths/angles, find an unknown measurement using geometry, similar triangles, or simple trigonometry.\n\nFocus on:\n• adding auxiliary lines\n• similar-triangle ratios\n• Pythagoras as a fallback",
	},
	{
		slug:        "visual-reasoning",
		title:       "Visual Reasoning",
		description: "Pattern matching with shapes, rotations, reflections, sequences of figures.",
		explanation: "🌙 Visual Reasoning\n\nA sequence or grid of shapes follows a rule (rotation, reflection, addition/removal of features). Pick the figure that continues the pattern.\n\nFocus on:\n• identifying rotational symmetry\n• reflection axes\n• combining two simple rules into one",
	},
	{
		slug:        "probabilities",
		title:       "Probabilities",
		description: "Discrete probability: events, independence, conditional probability.",
		explanation: "🌙 Probabilities\n\nP(A) = (favourable outcomes)/(total outcomes). Independent events: P(A and B) = P(A)·P(B). Mutually exclusive: P(A or B) = P(A)+P(B). The most common trap is double-counting overlap.\n\nFocus on:\n• counting outcomes correctly\n• independent vs mutually exclusive\n• conditional probability P(A|B) = P(A and B)/P(B)",
	},
	{
		slug:        "combinations",
		title:       "Combinations",
		description: "Counting selections without order: C(n, r) = n! / (r!(n−r)!).",
		explanation: "🌙 Combinations\n\nUse permutations P(n,r) when order matters; combinations C(n,r) when it doesn't. The trick is reading the wording carefully — 'arrangements' usually means permutations, 'committees' usually means combinations.\n\nFocus on:\n• distinguishing permutation vs combination from the wording\n• simplifying factorials before computing\n• stars-and-bars for distribution problems",
	},
}
