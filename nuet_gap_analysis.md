# NUET Telegram → Site Gap Analysis

Source: 4099 records from `/tmp/nuet_dump.jsonl` (2026-05-23 crawl via `.telegram-session` / @raissov01).
Coverage: `contacts.Search`, `messages.SearchGlobal` (400 hits), dialog scan of 2004 chats → 17 NUET-titled channels (3657 messages dumped).
Site baseline: 1080 questions, 49 topics (27 Math + 22 CT), 18 PDF tests (7 mocks + 11 trials), 49 lesson stubs, MCQ-only, no video, no chat.

---

## 1. Channels indexed (by reach)

| Channel | Subs | What they ship |
|---|--:|---|
| @nufypet | 5136 | Official NU entrance test announcements; partnerships |
| @weglobalnuet | 4172 | Mocks (Math+CT), workbooks, IELTS, SAT, podcasts, advent-calendar format |
| @vital_reviews | 1671 | Vitaliy's Math teacher channel (already on `/nuet/resources`) |
| @nuet25 | 1373 | NU2027 applicant info channel |
| @mocknuet | 1241 | Mock test releases |
| @ZeroObstacles | 1016 | Nurzhuzbay U prep |
| @nuetmatem | 501 | NUET Math (Ilyas, YouTube cross-post) |
| @nuetchallim | 432 | Study chat — 2026 specs, CT textbook (+keys) |
| @stpnuetolympiad | 393 | NUET/SAT olympiad organizer |
| @kdacademykz | 386 | KD Academy — **468 video lessons** (largest video corpus) |
| @nuet2025 | 318 | NU2027 chat (KZ/RU) |
| @enlightenkz | 114 | Practice channel with instructor Q&A |
| @nuetexplorers | 112 | Niche |
| @uzdikland_nuet | 44 | Kuanysh — ҰБТ/NUET interesting problems |
| @nuetchalka_bot | bot | **9 official mocks (1–9) as PDFs**, 2024 Math spec, Nurayka math book |

External sources (from global.search, not NUET-titled):
- @nuradmissions — NU admission cutoffs by program (6253 views, no equivalent on site)
- @freebatyr — meta-list of useful NUET channels
- @stipendgo / @amino_acidic_1 — puzzle-style math problems
- @nututors, @nuetchalka_bot — paid mock distribution

---

## 2. Hard content gaps (highest leverage)

### 2.1 NUET 2026 specifications — site uses 2024  ✅ Partially shipped (2026-05-23)

- `@nuetchallim`: `NUET 2026 CT-PS specification.pdf`, `NUET 2026 Math Specification.pdf` (msg 884626/884625)
- `@weglobalnuet`: same pair (msg 868/869)
- Site `nuet_official_syllabus.go` referenced a 2024-era taxonomy.

**Shipped in this pass:**
- PDFs saved at `backend/nuet-materials/specs/2026/nuet-2026-{math,ct-ps}-specification.pdf` (Cambridge © UCLES 2023, licensed to NU).
- New `backend/internal/database/nuet_2026_spec.go` encodes the full Cambridge spec as Go data:
  - `Mathematics2026Spec()` — 5 sections, 65 sub-items (M1.1 … M5.19).
  - `CriticalThinking2026Spec()` — 3 Problem Solving + 7 Critical Thinking = 10 official categories.
  - `SpecCrosswalk2026()` — maps every Cambridge code to current site slug(s) or to `{}` if it's a gap.
  - `Spec2026PendingMathSlugs()` — the 10 platform slugs the site still owes content for.
- **Material fix to `OfficialNUETTopics()`:** M5.18 of the 2026 spec explicitly says *"Candidates are not expected to recall or use the sine or cosine rules."* The site's `trigonometry` and `bearings` topics were teaching exactly that. Their `description` and `explanation` fields are rewritten to drop the sine/cosine rule emphasis and add the right-angled-only focus + standard-angle exact values + sin/cos/tan graphs.
- **Title alignment** with 2026 official Cambridge wording (slugs unchanged for URL stability):
  - `expression-of-conclusion` → *Summarising the Main Conclusion*
  - `drawing-conclusion` → *Drawing a Conclusion*
  - `assumptions` → *Identifying an Assumption*
  - `flaws-and-logical-fallacies` → *Detecting Reasoning Errors*
  - `parallel-reasoning` → *Matching Arguments*
  - `applying-principle` → *Applying Principles*
  - `identifying-similarities` → *Identifying Similarity*

**Still pending — needs both seed lessons and at least one practice question before adding to `OfficialNUETTopics()`:**
`surds-and-rationalisation` (M2.11), `upper-and-lower-bounds` (M2.12), `rounding-and-error-intervals` (M2.13), `estimation-and-approximation` (M2.14), `prime-factorisation-hcf-lcm` (M2.3), `cubic-and-reciprocal-functions` (M4.12.c/d), `trigonometric-graphs` (M4.12.f), `distance-and-speed-time-graphs` (M4.14), `plans-and-elevations` (M5.12), `iterative-processes-compound-interest` (M3.11).

**Operational note:** `nuet_topics.title` is the only field that changed in DB on reseed; URLs (`slug`) and FK relations to `nuet_questions.topic_id` are stable. No data migration needed beyond running `seed-nuet` once.

### 2.2 9 additional full mocks from `@nuetchalka_bot`
- `NUET_MOCK_1.pdf` … `NUET_MOCK_9.pdf` (each with answers, msg 405117–405125)
- Site currently has **7 full mocks**. These 9 may overlap with the existing 7 from `backend/nuet-materials/json/`. Need fingerprint check: are these the same source, or different mock sets?
- **Recommendation:** download all 9, dedupe against existing `nuet_pdf_tests`, extract new questions through the existing seed pipeline (`reseed-nuet-questions`).

### 2.3 NUET CT TEXTBOOK (+keys)  ✅ Partially shipped (2026-05-23)

- `@nuetchallim` msg 850623: `NUET CT TEXTBOOK (+keys).pdf` — Bridge Education Center, Astana 2023, 330 pp, 400+ practice questions. Image-only PDF, so direct text extraction needs OCR.
- Site `nuet_lessons.json` audit revealed: all 22 CT lessons had only stub content (2 chapters / 2–8 blocks / 360–1100 chars each) — far from a usable textbook.

**Copyright stance taken:** Bridge's book is the property of Bridge Education Center. Questions and verbatim text are NOT copied. The book is downloaded for reference only (kept at `/tmp/nuet-ct-book/`, not committed to the repo). Lesson content was authored fresh, with paraphrased worked examples sourced from the openly distributed Cambridge 2026 NUET CT-PS specification PDF (already at `backend/nuet-materials/specs/2026/`).

**Shipped:** 10 official 2026 categories enriched in `backend/internal/database/nuet_lessons/nuet_lessons.json` via `/tmp/enrich_ct_lessons.py` (idempotent — re-runs append only new chapter IDs):

| Slug (2026 name) | Old | New |
|---|---:|---:|
| `expression-of-conclusion` (Summarising Main Conclusion) | 2 ch / 4 blocks | **6 ch / 14 blocks / 4301 chars / 26 min** |
| `drawing-conclusion` (Drawing a Conclusion) | 2 / 3 | 5 / 9 / 2784 / 24 |
| `assumptions` (Identifying an Assumption) | 2 / 3 | 5 / 8 / 2965 / 26 |
| `flaws-and-logical-fallacies` (Detecting Reasoning Errors) | 2 / 3 | 5 / 7 / 2861 / 28 |
| `assessing-impact-of-additional-evidence` | 2 / 3 | 5 / 7 / 2517 / 24 |
| `parallel-reasoning` (Matching Arguments) | 2 / 3 | 5 / 8 / 2573 / 24 |
| `applying-principle` (Applying Principles) | 1 / 2 | 4 / 6 / 2230 / 22 |
| `relevant-selection` (PS-1) | 1 / 2 | 4 / 6 / 1766 / 22 |
| `finding-procedures` (PS-2) | 1 / 2 | 4 / 7 / 1849 / 22 |
| `identifying-similarities` (PS-3) | 1 / 2 | 4 / 6 / 2211 / 22 |

Each lesson now has: concept paragraph + definitions + tactic list + Cambridge-spec worked example (paraphrased) + traps callout. Frontend (`lesson-blocks.tsx`) and TypeScript schema both validated.

**Still pending:** 12 CT/PS slugs not in the official 2026 ten — `verbal-reasoning-argument`, `weakening-and-strengthening`, `mock-test-review`, `parallels-and-principles`, `problem-solving`, `complex-calculations`, `ct-equations`, `lateral-logic`, `spatial-measurements`, `visual-reasoning`, `probabilities`, `combinations`. Several of these are not even in the 2026 spec — see §3 and the crosswalk in `nuet_2026_spec.go`. Decide per slug: enrich, merge, or deprecate.

### 2.4 Math practice workbooks (PDFs, ready to extract)
From `@weglobalnuet`:

| msg | File | Use |
|---|---|---|
| 882 | `501 Задача Алгебра.pdf` | Algebra drill bank (501 problems) |
| 873 | `Проценты.pdf` | Percent topic deep-dive |
| 926 | `Surface Area WorkBook WG.pdf` | Geometry — surface area topic |
| 858 | `ВСЕ ТЕРМИНЫ ДЛЯ NUET MATH.pdf` | English math vocabulary (KZ→EN mapping) |
| 840 | `NUET Math практика.pdf` + 841 `Ответы.pdf` | Mixed Math drill |
| 866 | `Properties of angles.pdf` | Geometry reference card |
| 864/865 | `TSA 2009.pdf` + answers | UK TSA past paper (CT-equivalent) |
| 807 | `'Identifying reasoning' questions CRIT.pdf` | CT strategy guide for one of the hardest question types |
| 802 | `Double Question Essays.pdf` | (IELTS-adjacent, lower priority) |

- Site has none of these as either reference cards or extractable drill banks.
- **Recommendation:** extract problems → add as topic-tagged practice questions; convert the math-terms PDF into a glossary page (currently no `/nuet/glossary`).

### 2.5 Video lessons (zero on site today)
- `@kdacademykz`: ~468 video files (course archive). Site has no video lessons; `nuet_roadmap_v2.md` lists Phase 5 video lessons as TODO.
- `@nuetmatem` cross-posts to `youtube.com/@ilyas_math6954`.
- `@vital_reviews` cross-posts YouTube content from teacher Vitaliy (already linked in `/nuet/resources`).
- **Recommendation:** rather than ingesting MP4s (rights/storage), add a curated "video index" per topic that deep-links to public YouTube videos. Schema addition: `nuet_topics.video_links jsonb`.

### 2.6 No "score targets by program" page
- `@nuradmissions` post (6253 views): exact NU admission minimums per program for the year.
- Site `/nuet/dashboard` shows raw score vs. fixed ReferenceLine=120. There's no "you need 1530 + IELTS 7.5 for CivEng" reference anywhere.
- **Recommendation:** add `/nuet/targets` page; static table of program cutoffs (Math+CT raw + IELTS combos) sourced from the latest admission round.

---

## 3. Format / UX gaps

| Gap | Evidence on Telegram | Site state |
|---|---|---|
| **Math glossary (EN terms)** | `ВСЕ ТЕРМИНЫ ДЛЯ NUET MATH.pdf` | none |
| **Numeric / fill-in questions** | Channels post non-MCQ problems regularly | MCQ A–E only |
| **Puzzle/problem-of-the-week** | `@stipendgo` semicircle problem (380 views) | only deterministic daily challenge |
| **Marathon / event mode** | `@kdacademykz` 3-day free marathon; `@weglobal_advent` daily series | none |
| **Olympiad / leaderboard** | `@stpnuetolympiad` runs paid NUET olympiad | none (memory `nuet_roadmap_v2.md` lists leaderboard as Phase 5 TODO) |
| **Difficulty calibration** | Channels mark "сложная задача" / "easy" tags | all `medium` |
| **Community chat per topic** | 5+ active NUET chats with 100+ msgs/day | no in-app peer discussion |
| **Foundation explainer** | `@weglobalnuet` msg 801 `Что такое Foundation?.pdf` | no `/nuet/about-nu` |
| **Strategy guides** | "Identifying reasoning" CRIT guide, angle properties card | lessons are textbook-only, no "exam tactics" tab |
| **Daily-challenge variety** | @kdacademykz posts daily challenge with strategy explanation | site DC is just 3 random Qs |

---

## 4. What the site already has vs. Telegram

Strong points worth not losing in any redesign:

- **1080 classified questions** is materially larger than what any single Telegram channel ships in extractable form. The competitive moat is in the question bank + per-question step-by-step LLM explanations.
- **Proctored simulator with violation tracking** — Telegram has nothing remotely close; that is unique.
- **Spaced-rep dismissals + roadmap weekly plan** — Telegram has motivational posts but no per-user state.
- **Daily-challenge with streak** — present, but format is plain. See §3 for upgrades.

---

## 5. Suggested priority order (smallest unit of useful work first)

| # | Task | Effort | Impact |
|---|---|---:|---:|
| 1 | Add `/nuet/targets` static page (program cutoffs from `@nuradmissions` post) | 0.5d | high — converts traffic to action |
| 2 | Download & diff 2026 specifications; update `OfficialNUETTopics()` if changed | 1d | high — correctness |
| 3 | Math glossary page (parse `ВСЕ ТЕРМИНЫ ДЛЯ NUET MATH.pdf`) | 0.5d | medium — KZ→EN bridge fixes a real pain point |
| 4 | Pull mocks 1–9 from `@nuetchalka_bot`, fingerprint-dedupe, ingest new ones | 1–2d | high — content growth |
| 5 | CT textbook (+keys) → enrich the 22 empty CT lesson stubs | 2–3d | high — pedagogy |
| 6 | "Exam tactics" tab on `/nuet/topics/[slug]` (parsed from strategy PDFs) | 1d | medium |
| 7 | Workbook extracts: 501 алгебра, percents, surface area as topic-tagged drills | 2d | medium |
| 8 | Video index: deep-link YouTube per topic (Vitaliy, ilyas_math, kdacademykz) | 1d | medium |
| 9 | TSA 2009 → import as CT practice set (label as "TSA — UK"), with the existing kk/ru policy untouched | 1d | medium |
| 10 | Foundation explainer + program cutoffs combined into a `/nuet/about-nu` info hub | 0.5d | low-medium |
| 11 | Difficulty calibration: bootstrap from views/forwards proxy or scrape `сложная` tags | 1–2d | medium |
| 12 | Marathon event mode (date-bound 3–5 day series with daily new content) | 3d | medium — repeat traffic |
| 13 | Leaderboard for mock/simulator attempts (opt-in) | 2d | medium |

---

## 6. Open questions before action

- Do the 9 mocks from `@nuetchalka_bot` overlap with the 7 currently in `backend/nuet-materials/json/`? Need to compare titles/IDs first.
- Copyright on `@weglobalnuet` materials — they explicitly say "из закрытой платформы". Do not redistribute as-is; extract problems as inspiration only or contact for permission.
- Should video lessons be embedded or referred out? Embedding triples storage cost; referring leaks users off-site.
- Telegram has 2 user "categories" actively engaging: 2025 applicants (`@nuet25`, `@nuet2025`) and tutors (`@nututors`, `@kdacademykz`). Should the site differentiate "student" vs. "tutor" surfaces, or stay student-only?

---

## 7. Raw artifacts on disk

- Dump: `/tmp/nuet_dump.jsonl` (4099 records, 17 NUET channels, 3657 channel messages, 400 global.search)
- Crawler source: `backend/cmd/tg-nuet/main.go`
- To re-run: `TELEGRAM_SESSION_PATH=$PWD/.telegram-session /tmp/tg-nuet -q NUET -global-limit 400 -per-channel 300 > nuet_dump.jsonl`
