import { ImageResponse } from "next/og";

export const alt = "StudyWithRaissov — Premium IELTS Preparation Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1a2e 100%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative accent blob */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(249,115,22,0.15)",
            border: "1px solid rgba(249,115,22,0.4)",
            borderRadius: 999,
            padding: "6px 18px",
            marginBottom: 28,
          }}
        >
          <span style={{ color: "#f97316", fontSize: 15, fontWeight: 600 }}>
            IELTS · Flashcards · Quizzes
          </span>
        </div>

        {/* Heading */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.1,
            letterSpacing: "-2px",
            marginBottom: 24,
          }}
        >
          <span>StudyWith</span>
          <span style={{ color: "#f97316" }}>Raissov</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: "#94a3b8",
            fontWeight: 400,
            maxWidth: 720,
          }}
        >
          Флешкарталар, квиздер, IELTS тренажёры — бәрі бір жерде
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            top: 64,
            right: 72,
            fontSize: 18,
            color: "#475569",
            fontWeight: 500,
          }}
        >
          studywithraissov.com
        </div>
      </div>
    ),
    { ...size },
  );
}
