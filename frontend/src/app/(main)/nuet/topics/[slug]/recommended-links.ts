// Per-topic external study links. Curated to point at the most relevant
// section of each external resource — generic landing pages add little
// value, so only deep links go here.
//
// Vitaliy Collection (https://decorous-giant-147.notion.site) deep-links
// were extracted from the public Notion record map and point at the
// matching topical sub-page; each contains real NUET past-leak questions
// with solutions hidden behind a toggle. CT topics fall back to broad
// reasoning resources since Vitaliy's collection is Math-only.

export type RecommendedLink = {
  label: string;
  url: string;
  source: string;
};

// Vitaliy NUET Math Collection sub-page IDs (no hyphens).
const V = (id: string) => `https://decorous-giant-147.notion.site/${id}`;
const V_RATIO = V("14178777b7b980339eb2f2bd5a4bcdf4");
const V_EXPRESSIONS = V("14178777b7b980d58bcaf30cab283efc");
const V_EQUATIONS = V("14178777b7b98074b3e7ee536c512246");
const V_INEQUALITIES = V("14178777b7b98042a5a1de7dcb3d6907");
const V_SEQUENCES = V("14178777b7b980cd885ef16599beb294");
const V_LINES = V("14178777b7b9801b88b2d65df0aff5a3");
const V_QUADRATICS = V("14178777b7b980138c71d08ea45fd868");
const V_TRIG = V("14178777b7b980e6aca0fe89aba8243a");
const V_CIRCLES = V("14178777b7b9801c929de3a4edabad95");
const V_POLYGONS = V("14178777b7b980f6aa36cfcc3e0e1f9e");
const V_QUADRILATERALS = V("14178777b7b98053941cd792210576d8");
const V_BEARING = V("14178777b7b9801093d4c2b51051dd70");
const V_3D = V("14178777b7b9801eaa0cd5560fc7cd39");
const V_ADDITIONAL = V("15578777b7b98090847ac728abe22ac1");

const KHAN_LSAT = "https://www.khanacademy.org/test-prep/lsat";

export const TOPIC_LINKS: Record<string, RecommendedLink[]> = {
  // ── Math ──
  "standard-and-compound-units": [
    { label: "Vitaliy: Additional Problems", url: V_ADDITIONAL, source: "Vitaliy NUET" },
    { label: "Unit conversion", url: "https://www.khanacademy.org/math/cc-sixth-grade-math/cc-6th-ratios-prop-topic/cc-6th-rates", source: "Khan Academy" },
    { label: "Compound Measures", url: "https://corbettmaths.com/2013/04/04/compound-measures/", source: "Corbettmaths" },
  ],
  "algebraic-expressions": [
    { label: "Vitaliy: Expressions", url: V_EXPRESSIONS, source: "Vitaliy NUET" },
    { label: "Algebraic expressions", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:foundation-algebra", source: "Khan Academy" },
    { label: "Simplifying expressions", url: "https://corbettmaths.com/2013/02/14/simplifying-expressions/", source: "Corbettmaths" },
  ],
  exponents: [
    { label: "Vitaliy: Expressions", url: V_EXPRESSIONS, source: "Vitaliy NUET" },
    { label: "Exponents (Powers)", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:exp-and-log", source: "Khan Academy" },
    { label: "Index Laws", url: "https://corbettmaths.com/2012/08/24/laws-of-indices/", source: "Corbettmaths" },
  ],
  "ratio-and-proportion": [
    { label: "Vitaliy: Ratio, proportions, percent", url: V_RATIO, source: "Vitaliy NUET" },
    { label: "Ratios", url: "https://www.mathsisfun.com/algebra/proportional.html", source: "Math is Fun" },
  ],
  "two-types-of-variations": [
    { label: "Vitaliy: Ratio, proportions, percent", url: V_RATIO, source: "Vitaliy NUET" },
    { label: "Direct & Inverse Variation", url: "https://www.mathsisfun.com/algebra/proportional.html", source: "Math is Fun" },
    { label: "Direct and Inverse Proportion", url: "https://corbettmaths.com/2013/04/04/direct-inverse-proportion/", source: "Corbettmaths" },
  ],
  percents: [
    { label: "Vitaliy: Ratio, proportions, percent", url: V_RATIO, source: "Vitaliy NUET" },
    { label: "Percent change", url: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-fractions-decimals/cc-7th-percent-word-problems", source: "Khan Academy" },
    { label: "Increase/Decrease by %", url: "https://corbettmaths.com/2013/04/01/increase-decrease-by-a-percentage/", source: "Corbettmaths" },
  ],
  "word-problems": [
    { label: "Vitaliy: Additional Problems", url: V_ADDITIONAL, source: "Vitaliy NUET" },
    { label: "Word problems", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:foundation-algebra", source: "Khan Academy" },
  ],
  "linear-inequalities": [
    { label: "Vitaliy: Inequalities", url: V_INEQUALITIES, source: "Vitaliy NUET" },
    { label: "Linear inequalities", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:absolute-value-piecewise-functions", source: "Khan Academy" },
    { label: "Solving Inequalities", url: "https://corbettmaths.com/2013/04/14/solving-inequalities/", source: "Corbettmaths" },
  ],
  "slope-of-the-line": [
    { label: "Vitaliy: Lines", url: V_LINES, source: "Vitaliy NUET" },
    { label: "Slope of a line", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs", source: "Khan Academy" },
    { label: "Parallel & Perpendicular", url: "https://www.mathsisfun.com/algebra/line-parallel-perpendicular.html", source: "Math is Fun" },
  ],
  transformations: [
    { label: "Vitaliy: Quadratics and Lines", url: V_QUADRATICS, source: "Vitaliy NUET" },
    { label: "Function transformations", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:functions", source: "Khan Academy" },
    { label: "Function Transformations", url: "https://www.mathsisfun.com/sets/function-transformations.html", source: "Math is Fun" },
  ],
  "quadratic-functions": [
    { label: "Vitaliy: Quadratics and Lines", url: V_QUADRATICS, source: "Vitaliy NUET" },
    { label: "Quadratic functions", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations", source: "Khan Academy" },
    { label: "Try in Desmos", url: "https://www.desmos.com/calculator", source: "Desmos" },
  ],
  "examples-of-quadratic-functions": [
    { label: "Vitaliy: Quadratics and Lines", url: V_QUADRATICS, source: "Vitaliy NUET" },
    { label: "Quadratic word problems", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations", source: "Khan Academy" },
  ],
  "graphs-of-quadratic-functions": [
    { label: "Vitaliy: Quadratics and Lines", url: V_QUADRATICS, source: "Vitaliy NUET" },
    { label: "Try in Desmos", url: "https://www.desmos.com/calculator", source: "Desmos" },
    { label: "Function Graphs", url: "https://www.mathsisfun.com/sets/function-transformations.html", source: "Math is Fun" },
  ],
  "quadratic-inequalities": [
    { label: "Vitaliy: Inequalities", url: V_INEQUALITIES, source: "Vitaliy NUET" },
    { label: "Quadratic inequalities", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations", source: "Khan Academy" },
  ],
  "rational-expressions": [
    { label: "Vitaliy: Expressions", url: V_EXPRESSIONS, source: "Vitaliy NUET" },
    { label: "Rational expressions", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:rational-expressions", source: "Khan Academy" },
  ],
  sequences: [
    { label: "Vitaliy: Sequences", url: V_SEQUENCES, source: "Vitaliy NUET" },
    { label: "Sequences", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:sequences", source: "Khan Academy" },
    { label: "Number Sequences", url: "https://www.mathsisfun.com/algebra/sequences-series.html", source: "Math is Fun" },
  ],
  "nonlinear-equations": [
    { label: "Vitaliy: Equations and Systems", url: V_EQUATIONS, source: "Vitaliy NUET" },
    { label: "Nonlinear equations", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:absolute-value-piecewise-functions", source: "Khan Academy" },
  ],
  geometry: [
    { label: "High-school geometry", url: "https://www.khanacademy.org/math/geometry", source: "Khan Academy" },
    { label: "Geometry", url: "https://www.mathsisfun.com/geometry/index.html", source: "Math is Fun" },
  ],
  "exponential-functions": [
    { label: "Vitaliy: Expressions", url: V_EXPRESSIONS, source: "Vitaliy NUET" },
    { label: "Exponential functions", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:exp-and-log", source: "Khan Academy" },
  ],
  "symbol-functions": [
    { label: "Vitaliy: Additional Problems", url: V_ADDITIONAL, source: "Vitaliy NUET" },
    { label: "Defined operations practice", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  triangles: [
    { label: "Vitaliy: Triangles and Trigonometry", url: V_TRIG, source: "Vitaliy NUET" },
    { label: "Triangle properties", url: "https://www.khanacademy.org/math/geometry/hs-geo-trig", source: "Khan Academy" },
    { label: "Triangles", url: "https://www.mathsisfun.com/triangle.html", source: "Math is Fun" },
  ],
  vectors: [
    { label: "Vitaliy: Triangles and Trigonometry", url: V_TRIG, source: "Vitaliy NUET" },
    { label: "Vectors", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:vectors", source: "Khan Academy" },
    { label: "Vectors", url: "https://www.mathsisfun.com/algebra/vectors.html", source: "Math is Fun" },
  ],
  bearings: [
    { label: "Vitaliy: Bearing", url: V_BEARING, source: "Vitaliy NUET" },
    { label: "Compass Bearings", url: "https://www.mathsisfun.com/geometry/compass-bearings.html", source: "Math is Fun" },
    { label: "Bearings", url: "https://corbettmaths.com/2013/03/27/bearings/", source: "Corbettmaths" },
  ],
  polygons: [
    { label: "Vitaliy: Quadrilaterals", url: V_QUADRILATERALS, source: "Vitaliy NUET" },
    { label: "Vitaliy: Regular Polygons", url: V_POLYGONS, source: "Vitaliy NUET" },
    { label: "Quadrilaterals", url: "https://www.mathsisfun.com/quadrilaterals.html", source: "Math is Fun" },
  ],
  circles: [
    { label: "Vitaliy: Circles", url: V_CIRCLES, source: "Vitaliy NUET" },
    { label: "Circle Theorems", url: "https://www.mathsisfun.com/geometry/circle-theorems.html", source: "Math is Fun" },
    { label: "Circle Theorems video", url: "https://corbettmaths.com/2013/04/02/circle-theorems/", source: "Corbettmaths" },
  ],
  "3d-figures": [
    { label: "Vitaliy: Geometry 3D", url: V_3D, source: "Vitaliy NUET" },
    { label: "Volume of Solids", url: "https://www.mathsisfun.com/geometry/cylinder.html", source: "Math is Fun" },
    { label: "3D Volume formulas", url: "https://corbettmaths.com/contents/", source: "Corbettmaths" },
  ],
  trigonometry: [
    { label: "Vitaliy: Triangles and Trigonometry", url: V_TRIG, source: "Vitaliy NUET" },
    { label: "Trigonometry", url: "https://www.khanacademy.org/math/trigonometry", source: "Khan Academy" },
    { label: "SOHCAHTOA", url: "https://www.mathsisfun.com/algebra/sohcahtoa.html", source: "Math is Fun" },
  ],

  // ── Critical Thinking ──
  // Khan Academy's LSAT prep covers most CT skills (assumptions,
  // weakening, strengthening, parallel reasoning). Math-flavoured CT
  // topics get the matching Vitaliy section as a fallback.
  "verbal-reasoning-argument": [
    { label: "LSAT Logical Reasoning", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "expression-of-conclusion": [
    { label: "LSAT — main point questions", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "drawing-conclusion": [
    { label: "LSAT — must be true", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  assumptions: [
    { label: "LSAT — necessary assumption", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "flaws-and-logical-fallacies": [
    { label: "LSAT — flaw questions", url: KHAN_LSAT, source: "Khan Academy" },
    { label: "List of fallacies", url: "https://www.txstate.edu/philosophy/resources/fallacy-definitions.html", source: "Texas State" },
  ],
  "assessing-impact-of-additional-evidence": [
    { label: "LSAT — strengthen/weaken", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "weakening-and-strengthening": [
    { label: "LSAT — strengthen/weaken", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "applying-principle": [
    { label: "LSAT — principle questions", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "parallel-reasoning": [
    { label: "LSAT — parallel reasoning", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "parallels-and-principles": [
    { label: "LSAT — principle + parallel", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "problem-solving": [
    { label: "Vitaliy: Additional Problems", url: V_ADDITIONAL, source: "Vitaliy NUET" },
    { label: "Problem solving", url: "https://www.khanacademy.org/math/arithmetic-home/multiply-divide", source: "Khan Academy" },
  ],
  "relevant-selection": [
    { label: "LSAT — relevant information", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "finding-procedures": [
    { label: "LSAT — must be true", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "identifying-similarities": [
    { label: "LSAT — analogy questions", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  "complex-calculations": [
    { label: "Vitaliy: Additional Problems", url: V_ADDITIONAL, source: "Vitaliy NUET" },
    { label: "Multi-step arithmetic", url: "https://www.khanacademy.org/math/arithmetic-home", source: "Khan Academy" },
  ],
  "ct-equations": [
    { label: "Vitaliy: Equations and Systems", url: V_EQUATIONS, source: "Vitaliy NUET" },
    { label: "Setting up equations", url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:foundation-algebra", source: "Khan Academy" },
  ],
  "lateral-logic": [
    { label: "Brilliant logic puzzles", url: "https://brilliant.org/courses/logic-deduction/", source: "Brilliant" },
  ],
  "spatial-measurements": [
    { label: "Geometry tools", url: "https://www.mathsisfun.com/geometry/index.html", source: "Math is Fun" },
  ],
  "visual-reasoning": [
    { label: "Pattern recognition", url: KHAN_LSAT, source: "Khan Academy" },
  ],
  probabilities: [
    { label: "Probability", url: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-probability-statistics", source: "Khan Academy" },
    { label: "Probability", url: "https://www.mathsisfun.com/data/probability.html", source: "Math is Fun" },
  ],
  combinations: [
    { label: "Permutations & Combinations", url: "https://www.khanacademy.org/math/precalculus/x9e81a4f98389efdf:prob-comb", source: "Khan Academy" },
    { label: "Combinations and Permutations", url: "https://www.mathsisfun.com/combinatorics/combinations-permutations.html", source: "Math is Fun" },
  ],
  "mock-test-review": [
    { label: "Take a full mock", url: "/nuet/simulator", source: "StudyWithRaissov" },
  ],
};
