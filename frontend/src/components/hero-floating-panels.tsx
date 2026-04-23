"use client";

import { useEffect, useRef } from "react";

export function HeroFloatingPanels() {
  const p1Ref = useRef<HTMLDivElement>(null);
  const p2Ref = useRef<HTMLDivElement>(null);
  const p3Ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const flipInnerRef = useRef<HTMLDivElement>(null);
  const flippedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // No parallax on touch-only devices
    if (window.matchMedia("(hover: none)").matches) return;

    const panels = [
      { el: p1Ref.current, mx: 18, my: 12 },
      { el: p2Ref.current, mx: 28, my: 18 },
      { el: p3Ref.current, mx: 14, my: 9 },
    ];

    const handleMove = (e: MouseEvent) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));

      panels.forEach(({ el, mx, my }) => {
        if (!el) return;
        el.style.setProperty("--px", (dx * mx).toFixed(2));
        el.style.setProperty("--py", (dy * my).toFixed(2));
      });
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const handleFlip = () => {
    flippedRef.current = !flippedRef.current;
    if (flipInnerRef.current) {
      flipInnerRef.current.style.transform = flippedRef.current
        ? "rotateY(180deg)"
        : "rotateY(0deg)";
    }
  };

  const skills = [
    { name: "Listening", score: "8.0", pct: 89 },
    { name: "Reading",   score: "7.5", pct: 83 },
    { name: "Writing",   score: "7.0", pct: 78 },
    { name: "Speaking",  score: "7.5", pct: 83 },
  ];

  return (
    <div ref={sceneRef} className="hero-scene" aria-hidden="true">
      {/* Ambient glow blobs */}
      <div className="hero-scene-glow hero-scene-glow-purple" />
      <div className="hero-scene-glow hero-scene-glow-teal" />

      {/* ── Panel 1: Flashcard ──────────────────────────────── */}
      <div className="hero-fp-wrapper hero-fp-w1">
        <div
          ref={p1Ref}
          className="hero-panel hero-panel-flashcard"
          onClick={handleFlip}
          role="presentation"
        >
          <div ref={flipInnerRef} className="hero-fc-inner">
            {/* Front face */}
            <div className="hero-fc-face hero-fc-front">
              <div className="hero-panel-eyebrow">
                <span className="hero-dot hero-dot-purple" />
                Flashcard
              </div>
              <div className="hero-fc-word">ubiquitous</div>
              <div className="hero-fc-phonetic">/juːˈbɪk.wɪ.təs/</div>
              <div className="hero-panel-hint">tap to flip →</div>
            </div>
            {/* Back face */}
            <div className="hero-fc-face hero-fc-back">
              <div className="hero-panel-eyebrow">
                <span className="hero-dot hero-dot-purple" />
                Definition
              </div>
              <div className="hero-fc-def">
                Present, appearing, or found everywhere.
              </div>
              <div className="hero-fc-example">
                &ldquo;Technology is ubiquitous in modern life.&rdquo;
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel 2: AI Writing Feedback ───────────────────── */}
      <div className="hero-fp-wrapper hero-fp-w2">
        <div ref={p2Ref} className="hero-panel hero-panel-feedback">
          <div className="hero-panel-header">
            <div className="hero-panel-eyebrow">
              <span className="hero-dot hero-dot-teal" />
              AI Writing Feedback
            </div>
            <div className="hero-score-badge">7.5/9</div>
          </div>
          <div className="hero-feedback-title">Task 2 Assessment</div>
          <div className="hero-feedback-items">
            <div className="hero-feedback-item hero-feedback-good">
              <span>✓</span>
              <span>Strong cohesive devices</span>
            </div>
            <div className="hero-feedback-item hero-feedback-tip">
              <span>↑</span>
              <span>Vary sentence structure</span>
            </div>
            <div className="hero-feedback-item hero-feedback-tip">
              <span>↑</span>
              <span>Expand vocabulary range</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel 3: Mock Test Results ──────────────────────── */}
      <div className="hero-fp-wrapper hero-fp-w3">
        <div ref={p3Ref} className="hero-panel hero-panel-results">
          <div className="hero-panel-eyebrow">
            <span className="hero-dot hero-dot-purple" />
            Mock Test Results
          </div>
          <div className="hero-band-score">
            <span className="hero-band-num">7.5</span>
            <span className="hero-band-label">Overall Band</span>
          </div>
          <div className="hero-skills">
            {skills.map(({ name, score, pct }) => (
              <div key={name} className="hero-skill-row">
                <span className="hero-skill-name">{name}</span>
                <div className="hero-skill-bar">
                  <div className="hero-skill-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="hero-skill-score">{score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
