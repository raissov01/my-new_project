// Per-topic external study links. Curated to point at the most relevant
// section of each external resource — generic Khan Academy / Math is Fun
// landing pages add little value, so only deep links go here.
//
// Paths are stable enough that we can hard-code without verification noise;
// if a destination changes, the click still lands on a useful neighbour.
//
// Vitaliy Collection (https://decorous-giant-147.notion.site) deep-links
// were extracted from the public Notion record map and point at the
// matching topical sub-page; each contains real NUET past-leak questions
// with solutions hidden behind a toggle.

export type RecommendedLink = {
  label: string;
  url: string;
  source: string;
};

// Vitaliy NUET Math Collection sub-page IDs (no hyphens). Notion public
// site URL format: {workspace}.notion.site/{idWithoutHyphens}.
const VITALIY = (id: string) => `https://decorous-giant-147.notion.site/${id}`;

export const TOPIC_LINKS: Record<string, RecommendedLink[]> = {
  "direct-and-inverse-proportion": [
    {
      label: "Vitaliy: Ratio, proportions, percent",
      url: VITALIY("14178777b7b980339eb2f2bd5a4bcdf4"),
      source: "Vitaliy NUET",
    },
    {
      label: "Direct & Inverse Proportion",
      url: "https://www.mathsisfun.com/algebra/proportional.html",
      source: "Math is Fun",
    },
    {
      label: "Direct and Inverse Proportion",
      url: "https://corbettmaths.com/2013/04/04/direct-inverse-proportion/",
      source: "Corbettmaths",
    },
  ],
  "recurring-decimals": [
    {
      label: "Vitaliy: Expressions",
      url: VITALIY("14178777b7b980d58bcaf30cab283efc"),
      source: "Vitaliy NUET",
    },
    {
      label: "Recurring Decimals to Fractions",
      url: "https://corbettmaths.com/2013/03/24/recurring-decimals-to-fractions/",
      source: "Corbettmaths",
    },
  ],
  "algebraic-simplification-with-x-variable": [
    {
      label: "Vitaliy: Expressions",
      url: VITALIY("14178777b7b980d58bcaf30cab283efc"),
      source: "Vitaliy NUET",
    },
    {
      label: "Vitaliy: Equations and Systems",
      url: VITALIY("14178777b7b98074b3e7ee536c512246"),
      source: "Vitaliy NUET",
    },
    {
      label: "Algebraic expressions",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:foundation-algebra",
      source: "Khan Academy",
    },
  ],
  "circle-theorems-especially-with-chords": [
    {
      label: "Vitaliy: Circles",
      url: VITALIY("14178777b7b9801c929de3a4edabad95"),
      source: "Vitaliy NUET",
    },
    {
      label: "Circle Theorems",
      url: "https://www.mathsisfun.com/geometry/circle-theorems.html",
      source: "Math is Fun",
    },
    {
      label: "Circle Theorems video",
      url: "https://corbettmaths.com/2013/04/02/circle-theorems/",
      source: "Corbettmaths",
    },
  ],
  "percentages-word-problem-decrease-increase": [
    {
      label: "Vitaliy: Ratio, proportions, percent",
      url: VITALIY("14178777b7b980339eb2f2bd5a4bcdf4"),
      source: "Vitaliy NUET",
    },
    {
      label: "Percent change",
      url: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-fractions-decimals/cc-7th-percent-word-problems",
      source: "Khan Academy",
    },
    {
      label: "Increase/Decrease by a Percentage",
      url: "https://corbettmaths.com/2013/04/01/increase-decrease-by-a-percentage/",
      source: "Corbettmaths",
    },
  ],
  "rounding-to-significant-figures-standard-form": [
    {
      label: "Vitaliy: Additional Problems",
      url: VITALIY("15578777b7b98090847ac728abe22ac1"),
      source: "Vitaliy NUET",
    },
    {
      label: "Standard Form",
      url: "https://www.mathsisfun.com/numbers/standard-notation.html",
      source: "Math is Fun",
    },
    {
      label: "Significant Figures",
      url: "https://corbettmaths.com/2013/04/04/significant-figures/",
      source: "Corbettmaths",
    },
  ],
  "graph-transformation-usually-parabola": [
    {
      label: "Vitaliy: Quadratics and Lines",
      url: VITALIY("14178777b7b980138c71d08ea45fd868"),
      source: "Vitaliy NUET",
    },
    {
      label: "Function transformations",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:functions",
      source: "Khan Academy",
    },
    {
      label: "Function Transformations",
      url: "https://www.mathsisfun.com/sets/function-transformations.html",
      source: "Math is Fun",
    },
  ],
  "vertex-turning-point-of-parabola": [
    {
      label: "Vitaliy: Quadratics and Lines",
      url: VITALIY("14178777b7b980138c71d08ea45fd868"),
      source: "Vitaliy NUET",
    },
    {
      label: "Quadratic vertex form",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations",
      source: "Khan Academy",
    },
    {
      label: "Try in Desmos",
      url: "https://www.desmos.com/calculator",
      source: "Desmos",
    },
  ],
  vectors: [
    {
      label: "Vitaliy: Triangles and Trigonometry",
      url: VITALIY("14178777b7b980e6aca0fe89aba8243a"),
      source: "Vitaliy NUET",
    },
    {
      label: "Vectors",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:vectors",
      source: "Khan Academy",
    },
    {
      label: "Vectors",
      url: "https://www.mathsisfun.com/algebra/vectors.html",
      source: "Math is Fun",
    },
  ],
  bearings: [
    {
      label: "Vitaliy: Bearing",
      url: VITALIY("14178777b7b9801093d4c2b51051dd70"),
      source: "Vitaliy NUET",
    },
    {
      label: "Bearings",
      url: "https://corbettmaths.com/2013/03/27/bearings/",
      source: "Corbettmaths",
    },
    {
      label: "Compass Bearings",
      url: "https://www.mathsisfun.com/geometry/compass-bearings.html",
      source: "Math is Fun",
    },
  ],
  "parallel-and-perpendicular-lines": [
    {
      label: "Vitaliy: Lines",
      url: VITALIY("14178777b7b9801b88b2d65df0aff5a3"),
      source: "Vitaliy NUET",
    },
    {
      label: "Parallel & Perpendicular Lines",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs",
      source: "Khan Academy",
    },
    {
      label: "Parallel and Perpendicular Lines",
      url: "https://www.mathsisfun.com/algebra/line-parallel-perpendicular.html",
      source: "Math is Fun",
    },
  ],
  "coordinate-geometry": [
    {
      label: "Vitaliy: Lines",
      url: VITALIY("14178777b7b9801b88b2d65df0aff5a3"),
      source: "Vitaliy NUET",
    },
    {
      label: "Coordinate plane",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs",
      source: "Khan Academy",
    },
    {
      label: "Try in Desmos",
      url: "https://www.desmos.com/calculator",
      source: "Desmos",
    },
  ],
  "rhombus-kite-trapezium": [
    {
      label: "Vitaliy: Quadrilaterals",
      url: VITALIY("14178777b7b98053941cd792210576d8"),
      source: "Vitaliy NUET",
    },
    {
      label: "Quadrilaterals",
      url: "https://www.mathsisfun.com/quadrilaterals.html",
      source: "Math is Fun",
    },
  ],
  "trigonometry-in-right-angled-triangle": [
    {
      label: "Vitaliy: Triangles and Trigonometry",
      url: VITALIY("14178777b7b980e6aca0fe89aba8243a"),
      source: "Vitaliy NUET",
    },
    {
      label: "Right Triangle Trigonometry",
      url: "https://www.khanacademy.org/math/trigonometry/trigonometry-right-triangles",
      source: "Khan Academy",
    },
    {
      label: "SOHCAHTOA",
      url: "https://www.mathsisfun.com/algebra/sohcahtoa.html",
      source: "Math is Fun",
    },
  ],
  "exponents-with-bases-2-3-and-5": [
    {
      label: "Vitaliy: Expressions",
      url: VITALIY("14178777b7b980d58bcaf30cab283efc"),
      source: "Vitaliy NUET",
    },
    {
      label: "Exponents (Powers)",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:exp-and-log",
      source: "Khan Academy",
    },
    {
      label: "Index Laws",
      url: "https://corbettmaths.com/2012/08/24/laws-of-indices/",
      source: "Corbettmaths",
    },
  ],
  "real-life-graphs-velocity-time": [
    {
      label: "Vitaliy: Additional Problems",
      url: VITALIY("15578777b7b98090847ac728abe22ac1"),
      source: "Vitaliy NUET",
    },
    {
      label: "Velocity-Time Graphs",
      url: "https://corbettmaths.com/2013/05/13/velocity-time-graphs/",
      source: "Corbettmaths",
    },
  ],
  "compound-3d-figure-cylinder-sphere-cone": [
    {
      label: "Vitaliy: Geometry 3D",
      url: VITALIY("14178777b7b9801eaa0cd5560fc7cd39"),
      source: "Vitaliy NUET",
    },
    {
      label: "Volume of Solids",
      url: "https://www.mathsisfun.com/geometry/cylinder.html",
      source: "Math is Fun",
    },
    {
      label: "Volume of Cylinder, Cone, Sphere",
      url: "https://corbettmaths.com/contents/",
      source: "Corbettmaths",
    },
  ],
  "logical-reasoning": [
    {
      label: "Logical reasoning",
      url: "https://www.khanacademy.org/math/cc-eighth-grade-math/cc-8th-numbers-operations",
      source: "Khan Academy",
    },
  ],
  "argument-analysis": [
    {
      label: "TSA argument practice",
      url: "https://www.khanacademy.org/test-prep/lsat",
      source: "Khan Academy",
    },
  ],
  "problem-solving": [
    {
      label: "Problem solving",
      url: "https://www.khanacademy.org/math/arithmetic-home/multiply-divide",
      source: "Khan Academy",
    },
  ],
  "data-interpretation": [
    {
      label: "Reading charts and graphs",
      url: "https://www.khanacademy.org/math/cc-sixth-grade-math/cc-6th-data-statistics",
      source: "Khan Academy",
    },
  ],
  "pattern-recognition": [
    {
      label: "Patterns and sequences",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:sequences",
      source: "Khan Academy",
    },
  ],
};
