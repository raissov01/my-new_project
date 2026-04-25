import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Блог",
  description: "IELTS кеңестері, оқу стратегиялары және нақты мысалдар. StudyWithRaissov блогы.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Блог — StudyWithRaissov",
    description: "IELTS кеңестері және оқу стратегиялары.",
    url: "/blog",
    locale: "kk_KZ",
  },
};

type Post = {
  category: string;
  title: string;
  desc: string;
  date: string;
  readMin: number;
  author: string;
};

const POSTS: Post[] = [
  {
    category: "WRITING",
    title: "IELTS Writing Task 2: 7.5 алу үшін 5 қадам",
    desc: "Қысқаша оқу жоспары, мысалдары және практикалық кеңестер.",
    date: "12 КАР 2025",
    readMin: 8,
    author: "Ж. Раиссов",
  },
  {
    category: "SPEAKING",
    title: "Speaking-те еркін сөйлеу — қалай үйренуге?",
    desc: "Қысқаша оқу жоспары, мысалдары және практикалық кеңестер.",
    date: "8 КАР 2025",
    readMin: 6,
    author: "Д. Қанатова",
  },
  {
    category: "READING",
    title: "Reading-тегі True/False/Not Given сыры",
    desc: "Қысқаша оқу жоспары, мысалдары және практикалық кеңестер.",
    date: "5 КАР 2025",
    readMin: 5,
    author: "Ж. Раиссов",
  },
  {
    category: "VOCAB",
    title: "500 academic сөз: үйренудің ең тез жолы",
    desc: "Қысқаша оқу жоспары, мысалдары және практикалық кеңестер.",
    date: "2 КАР 2025",
    readMin: 7,
    author: "Ж. Раиссов",
  },
  {
    category: "LISTENING",
    title: "Listening Section 4: лекцияны түсіну техникасы",
    desc: "Қысқаша оқу жоспары, мысалдары және практикалық кеңестер.",
    date: "28 АҚП 2025",
    readMin: 6,
    author: "Д. Қанатова",
  },
  {
    category: "TIPS",
    title: "AI көмекшіден қалай дұрыс кері байланыс алу?",
    desc: "Қысқаша оқу жоспары, мысалдары және практикалық кеңестер.",
    date: "25 АҚП 2025",
    readMin: 4,
    author: "Ж. Раиссов",
  },
];

const CATEGORY_GRADIENTS: Record<string, string> = {
  WRITING: "linear-gradient(135deg,#C2500A,#8F3A05)",
  SPEAKING: "linear-gradient(135deg,#2563eb,#1B47B8)",
  READING: "linear-gradient(135deg,#3F7D3F,#2E5F2E)",
  VOCAB: "linear-gradient(135deg,#E9B949,#B8801A)",
  LISTENING: "linear-gradient(135deg,#C2425C,#8F2F45)",
  TIPS: "linear-gradient(135deg,#1B1714,#3D342C)",
};

export default function BlogPage() {
  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/student/dashboard" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← Артқа
          </Link>
          <h3 style={{ flex: 1 }}>Блог</h3>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            IELTS кеңестері
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="nd-lib-grid">
        {POSTS.map((post) => (
          <BlogCard key={post.title} post={post} />
        ))}
      </div>
    </div>
  );
}

function BlogCard({ post }: { post: Post }) {
  const gradient = CATEGORY_GRADIENTS[post.category] ?? "linear-gradient(135deg,#1B1714,#3D342C)";

  return (
    <div className="nd-lib-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Cover */}
      <div
        style={{
          background: gradient,
          aspectRatio: "1.7 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 20px",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {post.category}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {/* Badge */}
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            background: "var(--terra-soft)",
            color: "var(--terra)",
            borderRadius: 6,
            padding: "3px 8px",
            alignSelf: "flex-start",
          }}
        >
          {post.category}
        </span>

        {/* Title */}
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--ink)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {post.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-mute)",
            margin: 0,
            lineHeight: 1.55,
            flex: 1,
          }}
        >
          {post.desc}
        </p>

        {/* Footer */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "var(--ink-soft)",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 4,
            borderTop: "1px solid var(--line)",
            paddingTop: 10,
          }}
        >
          <span>{post.date}</span>
          <span style={{ color: "var(--line)" }}>·</span>
          <span>{post.readMin} мин</span>
          <span style={{ color: "var(--line)" }}>·</span>
          <span>{post.author}</span>
        </div>
      </div>
    </div>
  );
}
