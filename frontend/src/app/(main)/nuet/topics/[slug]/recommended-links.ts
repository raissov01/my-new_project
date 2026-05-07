// Per-topic external study links. Curated to point at the most relevant
// section of each external resource — generic Khan Academy / Math is Fun
// landing pages add little value, so only deep links go here.
//
// Paths are stable enough that we can hard-code without verification noise;
// if a destination changes, the click still lands on a useful neighbour.

export type RecommendedLink = {
  label: string;
  url: string;
  source: string;
};

export const TOPIC_LINKS: Record<string, RecommendedLink[]> = {
  "direct-and-inverse-proportion": [
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
      label: "Recurring Decimals to Fractions",
      url: "https://corbettmaths.com/2013/03/24/recurring-decimals-to-fractions/",
      source: "Corbettmaths",
    },
  ],
  "algebraic-simplification-with-x-variable": [
    {
      label: "Algebraic expressions",
      url: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:foundation-algebra",
      source: "Khan Academy",
    },
    {
      label: "Simplifying expressions",
      url: "https://corbettmaths.com/2013/02/14/simplifying-expressions/",
      source: "Corbettmaths",
    },
  ],
  "circle-theorems-especially-with-chords": [
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
      label: "Quadrilaterals",
      url: "https://www.mathsisfun.com/quadrilaterals.html",
      source: "Math is Fun",
    },
  ],
  "trigonometry-in-right-angled-triangle": [
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
      label: "Velocity-Time Graphs",
      url: "https://corbettmaths.com/2013/05/13/velocity-time-graphs/",
      source: "Corbettmaths",
    },
  ],
  "compound-3d-figure-cylinder-sphere-cone": [
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
