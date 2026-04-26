import type { Metadata } from "next";
import Link from "next/link";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("blog.heading"),
    description: "IELTS кеңестері, оқу стратегиялары және нақты мысалдар. StudyWithRaissov блогы.",
    alternates: { canonical: "/blog" },
    openGraph: {
      title: `${t("blog.heading")} — StudyWithRaissov`,
      description: t("blog.subtitle"),
      url: "/blog",
    },
  };
}

type Post = {
  category: string;
  titleKey: string;
  descKey: string;
  date: string;
  readMin: number;
  author: string;
};

const POSTS: Post[] = [
  {
    category: "WRITING",
    titleKey: "blog.post1.title",
    descKey: "blog.post1.desc",
    date: "12 DEC 2025",
    readMin: 8,
    author: "Zh. Raissov",
  },
  {
    category: "SPEAKING",
    titleKey: "blog.post2.title",
    descKey: "blog.post2.desc",
    date: "8 DEC 2025",
    readMin: 6,
    author: "D. Qanatova",
  },
  {
    category: "READING",
    titleKey: "blog.post3.title",
    descKey: "blog.post3.desc",
    date: "5 DEC 2025",
    readMin: 5,
    author: "Zh. Raissov",
  },
  {
    category: "VOCAB",
    titleKey: "blog.post4.title",
    descKey: "blog.post4.desc",
    date: "2 DEC 2025",
    readMin: 7,
    author: "Zh. Raissov",
  },
  {
    category: "LISTENING",
    titleKey: "blog.post5.title",
    descKey: "blog.post5.desc",
    date: "28 FEB 2025",
    readMin: 6,
    author: "D. Qanatova",
  },
  {
    category: "TIPS",
    titleKey: "blog.post6.title",
    descKey: "blog.post6.desc",
    date: "25 FEB 2025",
    readMin: 4,
    author: "Zh. Raissov",
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

export default async function BlogPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/student/dashboard" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            {t("blog.back")}
          </Link>
          <h3 style={{ flex: 1 }}>{t("blog.heading")}</h3>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {t("blog.subtitle")}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="nd-lib-grid">
        {POSTS.map((post) => (
          <BlogCard key={post.titleKey} post={post} t={t} />
        ))}
      </div>
    </div>
  );
}

type TFn = (key: string) => string;

function BlogCard({ post, t }: { post: Post; t: TFn }) {
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
          {t(post.titleKey)}
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
          {t(post.descKey)}
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
          <span>{post.readMin} {t("blog.readMin")}</span>
          <span style={{ color: "var(--line)" }}>·</span>
          <span>{post.author}</span>
        </div>
      </div>
    </div>
  );
}
