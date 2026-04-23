"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Flag,
  Headphones,
  Loader2,
  Mic,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { IELTSMockExam, IELTSQuestion } from "@/features/ielts/api";
import { fetchIELTSMockExam, fetchIELTSQuestions } from "@/features/ielts/api";
import { useAutosave } from "@/features/ielts/use-autosave";
import { useExamMode } from "@/features/ielts/use-exam-mode";
import { ExamViolationModal } from "@/features/ielts/components/exam-violation-modal";
import { SpeakingRecorderPanel } from "@/features/ielts/components/speaking-recorder-panel";
import {
  abandonAttempt,
  autosaveAttempt,
  completeAttempt,
  logAttemptViolation,
  startAttempt,
} from "./attempt-actions";
import { evaluateSpeaking, type SpeakingResult } from "../speaking/actions";
import { evaluateWriting, type WritingResult } from "../writing/actions";

type MockType = "predictions" | "cambridge_style";
type Section = "full" | "reading" | "listening" | "writing" | "speaking";
type BandTarget = "5.0" | "5.5" | "6.0" | "6.5" | "7.0" | "7.5" | "8.0";
type Stage = "configure" | "loading" | "exam" | "results";

type QuestionGroup = {
  key: string;
  title: string;
  prompt: string;
  content?: string;
  audioScript?: string;
  topic?: string;
  questions: IELTSQuestion[];
};

export function SimulatorClient() {
  const { t } = useLocale();
  const [stage, setStage] = useState<Stage>("configure");
  const [mockType, setMockType] = useState<MockType>("predictions");
  const [section, setSection] = useState<Section>("full");
  const [bandTarget] = useState<BandTarget>("6.5");
  const [cambridgeExamSet, setCambridgeExamSet] = useState("auto");
  const [predictionExamSet, setPredictionExamSet] = useState("auto");
  const [cambridgeExamSets, setCambridgeExamSets] = useState<string[]>([]);
  const [predictionExamSets, setPredictionExamSets] = useState<string[]>([]);
  const [mock, setMock] = useState<IELTSMockExam | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({});
  const [writingResponses, setWritingResponses] = useState<Record<string, string>>({});
  const [writingResults, setWritingResults] = useState<Record<string, WritingResult>>({});
  const [speakingResponses, setSpeakingResponses] = useState<Record<string, string>>({});
  const [speakingResults, setSpeakingResults] = useState<Record<string, SpeakingResult>>({});
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState<string | null>(null);
  const [showListeningTranscript, setShowListeningTranscript] = useState<Record<string, boolean>>({});
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [playingGroupKey, setPlayingGroupKey] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(true);
  const [unlockedUpToIndex, setUnlockedUpToIndex] = useState(0);
  const [activeListeningGroupIndex, setActiveListeningGroupIndex] = useState(0);
  const [showListeningSectionConfirm, setShowListeningSectionConfirm] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<number | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const [passageFontSize, setPassageFontSize] = useState<0 | 1 | 2>(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasUserInteractionRef = useRef(false);

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const goToConfigure = useCallback(() => {
    setStage("configure");
    setAttemptId(null);
    setAttemptStartedAt(null);
    setIsTerminating(false);
  }, []);

  useEffect(() => {
    setSpeechEnabled(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingGroupKey(null);
  }, []);

  const markUserInteraction = useCallback(() => {
    hasUserInteractionRef.current = true;
  }, []);

  useEffect(
    () => () => {
      stopTimer();
      stopSpeaking();
    },
    [stopSpeaking, stopTimer]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadExamSets() {
      try {
        const response = await fetchIELTSQuestions({
          section: "writing",
          limit: 400,
        });

        if (cancelled) {
          return;
        }

        const allExamSets = response.items ?? [];
        const cambridgeSets = Array.from(
          new Set(
            allExamSets
              .map((item) => item.examSet)
              .filter((item) => item && item.startsWith("cambridge-"))
          )
        ).sort();
        const predictionsSets = Array.from(
          new Set(
            allExamSets
              .map((item) => item.examSet)
              .filter((item) => item && item.startsWith("predictions-"))
          )
        ).sort();

        setCambridgeExamSets(cambridgeSets);
        setPredictionExamSets(predictionsSets);
      } catch {
        if (!cancelled) {
          setCambridgeExamSets([]);
          setPredictionExamSets([]);
        }
      }
    }

    void loadExamSets();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentSection = mock?.sections[activeSectionIndex] ?? null;
  const groupedQuestions = useMemo(
    () => (currentSection ? buildQuestionGroups(currentSection.questions) : []),
    [currentSection]
  );
  const isCurrentSectionRevealed = currentSection
    ? Boolean(revealedSections[currentSection.key])
    : false;

  const mockTypes: { key: MockType; title: string; body: string }[] = [
    {
      key: "predictions",
      title: t("ielts.sim.predictions"),
      body: t("ielts.sim.predictionsBody"),
    },
    {
      key: "cambridge_style",
      title: t("ielts.sim.cambridge"),
      body: t("ielts.sim.cambridgeBody"),
    },
  ];

  const sections: { key: Section; title: string; icon: typeof BookOpen; time: string }[] = [
    { key: "full", title: t("ielts.sim.fullTest"), icon: ClipboardCheck, time: "2h 45min" },
    { key: "listening", title: t("ielts.simListening"), icon: Headphones, time: "30 min" },
    { key: "reading", title: t("ielts.simReading"), icon: BookOpen, time: "60 min" },
    { key: "writing", title: t("ielts.simWriting"), icon: PenLine, time: "60 min" },
    { key: "speaking", title: t("ielts.simSpeaking"), icon: Mic, time: "11-14 min" },
  ];

  const startSectionTimer = useCallback(
    (durationMinutes: number) => {
      stopTimer();
      if (durationMinutes <= 0) {
        setTimeLeft(0);
        return;
      }

      setTimeLeft(durationMinutes * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer]
  );

  useEffect(() => {
    if (stage !== "exam" || !currentSection) {
      return;
    }
    // Listening timer starts when audio begins, not immediately on section load
    if (currentSection.key === "listening") return;
    startSectionTimer(currentSection.durationMinutes);
  }, [activeSectionIndex, currentSection, stage, startSectionTimer]);

  async function handleStartMock() {
    setStage("loading");
    setError(null);
    stopSpeaking();
    stopTimer();

    try {
      const attemptType =
        section === "full"
          ? "full_mock"
          : section === "writing"
            ? "writing_practice"
            : section === "speaking"
              ? "speaking_practice"
              : "section_practice";

      const startedAttempt = await startAttempt({
        attemptType,
        mockType,
        examSet:
          mockType === "cambridge_style"
            ? cambridgeExamSet !== "auto"
              ? cambridgeExamSet
              : undefined
            : predictionExamSet !== "auto"
              ? predictionExamSet
              : undefined,
        section,
        bandTarget,
        strictMode,
      });

      const response = await fetchIELTSMockExam({
        mockType,
        section,
        band: bandTarget,
        examSet: (() => {
          if (mockType === "cambridge_style") {
            return cambridgeExamSet !== "auto" ? cambridgeExamSet : undefined;
          }
          return predictionExamSet !== "auto" ? predictionExamSet : undefined;
        })(),
      });

      setMock(response);
      setActiveSectionIndex(0);
      setUnlockedUpToIndex(0);
      setActiveListeningGroupIndex(0);
      setShowListeningSectionConfirm(false);
      setObjectiveAnswers({});
      setRevealedSections({});
      setWritingResponses({});
      setWritingResults({});
      setSpeakingResponses({});
      setSpeakingResults({});
      setShowListeningTranscript({});
      setAttemptId(startedAttempt.id);
      setAttemptStartedAt(Date.now());
      hasUserInteractionRef.current = false;

      if (strictMode) {
        await examMode.requestFullscreen();
      }

      setStage("exam");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load mock exam."
      );
      goToConfigure();
    }
  }

  function handleSectionTab(index: number) {
    if (!mock) return;
    if (index > unlockedUpToIndex) return;
    stopSpeaking();
    setActiveSectionIndex(index);
  }

  async function handleCompleteSection() {
    if (!mock || !currentSection) {
      return;
    }

    stopSpeaking();
    stopTimer();

    if (currentSection.key === "reading" || currentSection.key === "listening") {
      setRevealedSections((prev) => ({ ...prev, [currentSection.key]: true }));
    }

    if (activeSectionIndex < mock.sections.length - 1) {
      setUnlockedUpToIndex((prev) => Math.max(prev, activeSectionIndex + 1));
      setActiveSectionIndex((prev) => prev + 1);
      return;
    }

    if (attemptId) {
      const elapsed = attemptStartedAt
        ? Math.max(0, Math.floor((Date.now() - attemptStartedAt) / 1000))
        : 0;

      const writingBands = mock.sections
        .filter((item) => item.key === "writing")
        .flatMap((item) => item.questions)
        .map((question) => writingResults[question.id]?.overallBand)
        .filter((item): item is number => typeof item === "number");

      const speakingBands = mock.sections
        .filter((item) => item.key === "speaking")
        .flatMap((item) => item.questions)
        .map((question) => speakingResults[question.id]?.overallBand)
        .filter((item): item is number => typeof item === "number");

      const readingSection = mock.sections.find((item) => item.key === "reading");
      const listeningSection = mock.sections.find((item) => item.key === "listening");
      const readingStats = readingSection
        ? computeObjectiveStats(readingSection.questions, objectiveAnswers)
        : null;
      const listeningStats = listeningSection
        ? computeObjectiveStats(listeningSection.questions, objectiveAnswers)
        : null;

      const overallResults = {
        readingScore: readingStats?.correct ?? null,
        readingTotal: readingStats?.total ?? null,
        readingBand: readingStats ? objectivePercentToBand(readingStats.percent) : null,
        listeningScore: listeningStats?.correct ?? null,
        listeningTotal: listeningStats?.total ?? null,
        listeningBand: listeningStats ? objectivePercentToBand(listeningStats.percent) : null,
        writingBand:
          writingBands.length > 0
            ? Number((writingBands.reduce((sum, item) => sum + item, 0) / writingBands.length).toFixed(1))
            : null,
        speakingBand:
          speakingBands.length > 0
            ? Number((speakingBands.reduce((sum, item) => sum + item, 0) / speakingBands.length).toFixed(1))
            : null,
      };

      try {
        await autosave.forceSave();
        await completeAttempt(attemptId, {
          answers: answersPayload,
          timeTakenSecs: elapsed,
          results: overallResults,
        });
        autosave.clearLocal();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Failed to submit attempt. Your answers are saved locally."
        );
        return;
      }
    }

    setStage("results");
  }

  async function handleEvaluateWriting(question: IELTSQuestion) {
    const essay = (writingResponses[question.id] ?? "").trim();
    if (!essay) {
      setError("Write an answer before requesting AI examiner feedback.");
      return;
    }

    setError(null);
    setEvaluatingQuestionId(question.id);

    const { result, error: evaluationError } = await evaluateWriting(
      question.questionType,
      question.prompt,
      essay
    );

    setEvaluatingQuestionId(null);

    if (evaluationError) {
      setError(evaluationError);
      return;
    }

    if (result) {
      setWritingResults((prev) => ({ ...prev, [question.id]: result }));
    }
  }

  async function handleEvaluateSpeaking(question: IELTSQuestion) {
    const transcript = (speakingResponses[question.id] ?? "").trim();
    if (!transcript) {
      setError("Write or paste your spoken answer first.");
      return;
    }

    setError(null);
    setEvaluatingQuestionId(question.id);

    const { result, error: evaluationError } = await evaluateSpeaking(
      question.questionType,
      question.prompt,
      transcript
    );

    setEvaluatingQuestionId(null);

    if (evaluationError) {
      setError(evaluationError);
      return;
    }

    if (result) {
      setSpeakingResults((prev) => ({ ...prev, [question.id]: result }));
    }
  }

  function handleObjectiveAnswer(questionId: string, value: string) {
    markUserInteraction();
    setObjectiveAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handlePlayListening(group: QuestionGroup) {
    if (!speechEnabled || !group.audioScript) {
      return;
    }

    if (playingGroupKey === group.key) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(group.audioScript);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setPlayingGroupKey(null);
    utterance.onerror = () => setPlayingGroupKey(null);

    window.speechSynthesis.speak(utterance);
    setPlayingGroupKey(group.key);

    // Start section timer when audio first plays
    if (!timerRef.current && currentSection?.key === "listening") {
      startSectionTimer(currentSection.durationMinutes);
    }
  }

  function handleAdvanceListeningGroup() {
    setShowListeningSectionConfirm(false);
    stopSpeaking();
    setActiveListeningGroupIndex((prev) => prev + 1);
  }

  const resultSummary = useMemo(() => {
    if (!mock) {
      return null;
    }

    const reading = mock.sections.find((item) => item.key === "reading");
    const listening = mock.sections.find((item) => item.key === "listening");
    const writing = mock.sections.find((item) => item.key === "writing");
    const speaking = mock.sections.find((item) => item.key === "speaking");

    return {
      reading: reading ? computeObjectiveStats(reading.questions, objectiveAnswers) : null,
      listening: listening
        ? computeObjectiveStats(listening.questions, objectiveAnswers)
        : null,
      writingAverage: averageBand(
        writing?.questions.map((question) => writingResults[question.id]?.overallBand)
      ),
      speakingAverage: averageBand(
        speaking?.questions.map((question) => speakingResults[question.id]?.overallBand)
      ),
      pendingWriting:
        writing?.questions.filter((question) => !writingResults[question.id]).length ?? 0,
      pendingSpeaking:
        speaking?.questions.filter((question) => !speakingResults[question.id]).length ?? 0,
    };
  }, [mock, objectiveAnswers, speakingResults, writingResults]);

  const answersPayload = useMemo(() => {
    return {
      ...objectiveAnswers,
      ...Object.fromEntries(Object.entries(writingResponses).map(([key, value]) => [key, value])),
      ...Object.fromEntries(Object.entries(speakingResponses).map(([key, value]) => [key, value])),
    };
  }, [objectiveAnswers, speakingResponses, writingResponses]);

  const sectionProgress = useMemo(() => {
    if (!mock) return {};
    const map: Record<string, boolean> = {};
    for (const sectionItem of mock.sections) {
      map[sectionItem.key] = Boolean(revealedSections[sectionItem.key]);
    }
    return map;
  }, [mock, revealedSections]);

  const examMode = useExamMode({
    enabled: stage === "exam" && strictMode && Boolean(attemptId),
    attemptId: attemptId ?? undefined,
    policy: {
      fullscreenRequired: true,
      warnOnly: false,
      autoTerminateAt: 5,
      immediateTerminate: false,
    },
    onViolation: ({ type, details }) => {
      if (!attemptId) return;
      void logAttemptViolation(attemptId, { type, details });
    },
    onTerminate: () => {
      setIsTerminating(true);
    },
  });

  const autosave = useAutosave({
    enabled: stage === "exam" && Boolean(attemptId),
    storageKey: `ielts-attempt-${attemptId ?? "draft"}`,
    payload: {
      answers: answersPayload,
      sectionProgress,
      timeTakenSecs: attemptStartedAt ? Math.max(0, Math.floor((Date.now() - attemptStartedAt) / 1000)) : 0,
    },
    onSave: async (payload) => {
      if (!attemptId) return;
      await autosaveAttempt(attemptId, payload);
    },
  });

  useEffect(() => {
    if (stage !== "exam" || !attemptId || !hasUserInteractionRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void autosaveAttempt(attemptId, {
        answers: answersPayload,
        sectionProgress,
        timeTakenSecs: attemptStartedAt
          ? Math.max(0, Math.floor((Date.now() - attemptStartedAt) / 1000))
          : 0,
      });
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [answersPayload, attemptId, attemptStartedAt, sectionProgress, stage]);

  useEffect(() => {
    if (!isTerminating) return;

    async function terminateNow() {
      try {
        if (attemptId) {
          await autosave.forceSave();
          await abandonAttempt(attemptId);
        }
      } catch {
        // ignore termination network errors
      } finally {
        setIsTerminating(false);
        goToConfigure();
      }
    }

    void terminateNow();
  }, [attemptId, autosave, goToConfigure, isTerminating]);

  if (stage === "configure") {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("ielts.sim.chooseMockType")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("ielts.sim.buildDesc")}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {mockTypes.map((item) => (
              <SelectionCard
                key={item.key}
                active={mockType === item.key}
                onClick={() => setMockType(item.key)}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("ielts.sim.chooseSection")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    section === item.key
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      section === item.key
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{item.time}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          {mockType === "cambridge_style" ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t("ielts.sim.cambridgeSetLabel")}
              </label>
              <select
                value={cambridgeExamSet}
                onChange={(event) => setCambridgeExamSet(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="auto">{t("ielts.sim.cambridgeSetAuto")}</option>
                {cambridgeExamSets.map((item) => (
                  <option key={item} value={item}>
                    {formatExamSetLabel(item)}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                {t("ielts.sim.cambridgeSetDesc")}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-5">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t("ielts.sim.predictionsSetLabel")}
              </label>
              <select
                value={predictionExamSet}
                onChange={(event) => setPredictionExamSet(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="auto">{t("ielts.sim.predictionsSetAuto")}</option>
                {predictionExamSets.map((item) => (
                  <option key={item} value={item}>
                    {formatExamSetLabel(item)}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {t("ielts.sim.predictionsSetDesc")}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {t("ielts.sim.readyTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {mockTypes.find((item) => item.key === mockType)?.title} ·{" "}
                {sections.find((item) => item.key === section)?.title}
              </p>
            </div>
            <Button size="lg" onClick={handleStartMock}>
              <Target className="h-4 w-4" />
              {t("ielts.sim.startExam")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
            <label className="flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
              <span>{t("ielts.sim.strictMode")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={strictMode}
                onClick={() => setStrictMode((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  strictMode ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    strictMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
        {examMode.warningMessage ? (
          <ErrorBanner message={examMode.warningMessage} onClose={examMode.clearWarning} />
        ) : null}
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bg-surface)] shadow-[var(--shadow-lg)]">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
          {t("ielts.sim.loadingTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("ielts.sim.loadingBody")}
        </p>
      </div>
    );
  }

  if (stage === "results" && mock && resultSummary) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--primary)]">
              {mock.mockType === "cambridge_style" ? t("ielts.sim.cambridgeMock") : t("ielts.sim.predictionsMock")}
            </span>
            {mock.examSet ? (
              <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                {formatExamSetLabel(mock.examSet)}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
            {t("ielts.sim.resultTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("ielts.sim.resultBody")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {resultSummary.reading ? (
            <ScoreCard
              title={t("ielts.simReading")}
              value={`Band ${rawScoreToBand(resultSummary.reading.correct, resultSummary.reading.total).toFixed(1)}`}
              subtitle={`${resultSummary.reading.correct}/${resultSummary.reading.total} ${t("ielts.sim.resultCorrect")} · ${resultSummary.reading.percent}%`}
              tone="text-blue-400"
            />
          ) : null}
          {resultSummary.listening ? (
            <ScoreCard
              title={t("ielts.simListening")}
              value={`Band ${rawScoreToBand(resultSummary.listening.correct, resultSummary.listening.total).toFixed(1)}`}
              subtitle={`${resultSummary.listening.correct}/${resultSummary.listening.total} ${t("ielts.sim.resultCorrect")} · ${resultSummary.listening.percent}%`}
              tone="text-cyan-400"
            />
          ) : null}
          <ScoreCard
            title={t("ielts.simWriting")}
            value={
              resultSummary.writingAverage !== null
                ? `Band ${resultSummary.writingAverage.toFixed(1)}`
                : t("ielts.sim.pending")
            }
            subtitle={
              resultSummary.pendingWriting > 0
                ? t("ielts.sim.pendingEval", { count: resultSummary.pendingWriting })
                : t("ielts.sim.writingAllDone")
            }
            tone="text-emerald-400"
          />
          <ScoreCard
            title={t("ielts.simSpeaking")}
            value={
              resultSummary.speakingAverage !== null
                ? `Band ${resultSummary.speakingAverage.toFixed(1)}`
                : t("ielts.sim.pending")
            }
            subtitle={
              resultSummary.pendingSpeaking > 0
                ? t("ielts.sim.pendingEval", { count: resultSummary.pendingSpeaking })
                : t("ielts.sim.speakingAllDone")
            }
            tone="text-violet-400"
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("ielts.sim.simulatesTitle")}
          </h3>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
            <li>{t("ielts.sim.simulates1")}</li>
            <li>{t("ielts.sim.simulates2")}</li>
            <li>{t("ielts.sim.simulates3")}</li>
            <li>{t("ielts.sim.simulates4")}</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              const allRevealed: Record<string, boolean> = {};
              for (const sec of mock.sections) allRevealed[sec.key] = true;
              setRevealedSections(allRevealed);
              setActiveSectionIndex(0);
              setStage("exam");
            }}
          >
            <BookOpen className="h-4 w-4" />
            {t("ielts.sim.reviewAnswers")}
          </Button>
          <Button variant="secondary" onClick={handleStartMock}>
            <RotateCcw className="h-4 w-4" />
            {t("ielts.sim.retakeExam")}
          </Button>
          <Button variant="secondary" onClick={goToConfigure}>
            <Target className="h-4 w-4" />
            {t("ielts.sim.configureMock")}
          </Button>
          <Link href="/ielts/writing">
            <Button variant="outline">
              <PenLine className="h-4 w-4" />
              {t("ielts.sim.deepWriting")}
            </Button>
          </Link>
          <Link href="/ielts/speaking">
            <Button variant="outline">
              <Mic className="h-4 w-4" />
              {t("ielts.sim.deepSpeaking")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!mock || !currentSection) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[var(--bg-surface)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--primary)]">
            {mock.mockType === "cambridge_style" ? t("ielts.sim.cambridgeMock") : t("ielts.sim.predictionsMock")}
          </span>
          {mock.examSet ? (
            <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              {formatExamSetLabel(mock.examSet)}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {currentSection.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {currentSection.instructions}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t("ielts.sim.sectionTimer")}
            </p>
            <p className={`mt-1 text-2xl font-semibold ${timeLeft < 60 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {mock.sections.map((item, index) => {
            const isLocked = index > unlockedUpToIndex;
            return (
              <button
                key={item.key}
                onClick={() => handleSectionTab(index)}
                disabled={isLocked}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  activeSectionIndex === index
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : isLocked
                      ? "cursor-not-allowed border-[var(--border)] text-[var(--text-muted)] opacity-40"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {item.title}
              </button>
            );
          })}
        </div>
      </div>

      {currentSection.key === "reading" && (
        <ReadingSplitPanel
          groups={groupedQuestions}
          objectiveAnswers={objectiveAnswers}
          flaggedQuestions={flaggedQuestions}
          revealed={isCurrentSectionRevealed}
          passageFontSize={passageFontSize}
          onSetFontSize={setPassageFontSize}
          onToggleFlag={toggleFlag}
          onAnswer={handleObjectiveAnswer}
        />
      )}

      {currentSection.key === "listening" && (
        <div className="space-y-5">
          {groupedQuestions.length > 1 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {t("ielts.sim.listeningSectionLabel")}
              </span>
              <div className="flex gap-2">
                {groupedQuestions.map((g, idx) => (
                  <div
                    key={g.key}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      isCurrentSectionRevealed || idx < activeListeningGroupIndex
                        ? "bg-[var(--primary)] text-white"
                        : idx === activeListeningGroupIndex
                          ? "border-2 border-[var(--primary)] text-[var(--primary)]"
                          : "border border-[var(--border)] text-[var(--text-muted)] opacity-40"
                    }`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(isCurrentSectionRevealed ? groupedQuestions : [groupedQuestions[activeListeningGroupIndex]].filter((g): g is QuestionGroup => Boolean(g))).map((group) => {
            const groupIndex = groupedQuestions.indexOf(group);
            const questionStartIndex = groupedQuestions
              .slice(0, groupIndex)
              .reduce((acc, g) => acc + g.questions.length, 0);
            const isLastGroup = groupIndex === groupedQuestions.length - 1;
            return (
            <section
              key={group.key}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {group.title}
                  </h3>
                  {group.topic ? (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {t("ielts.sim.topic")}: {group.topic}
                    </p>
                  ) : null}
                </div>

                {group.audioScript ? (
                  <div className="flex flex-wrap gap-2">
                    {speechEnabled ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePlayListening(group)}
                      >
                        {playingGroupKey === group.key ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {playingGroupKey === group.key ? t("ielts.sim.stopAudio") : t("ielts.sim.playAudio")}
                      </Button>
                    ) : null}
                    {isCurrentSectionRevealed ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setShowListeningTranscript((prev) => ({
                            ...prev,
                            [group.key]: !prev[group.key],
                          }))
                        }
                      >
                        <Volume2 className="h-4 w-4" />
                        {showListeningTranscript[group.key] ? t("ielts.sim.hideScript") : t("ielts.sim.showScript")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {group.content ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                    {group.content}
                  </p>
                </div>
              ) : null}

              {group.audioScript && showListeningTranscript[group.key] ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-400">
                    {t("ielts.sim.audioScript")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                    {group.audioScript}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                {group.questions.map((question, localIndex) => (
                  <ObjectiveQuestionCard
                    key={question.id}
                    index={questionStartIndex + localIndex + 1}
                    question={question}
                    value={objectiveAnswers[question.id] ?? ""}
                    revealed={isCurrentSectionRevealed}
                    onChange={handleObjectiveAnswer}
                  />
                ))}
              </div>

              {!isCurrentSectionRevealed && !isLastGroup && (
                <div className="mt-5 flex justify-end">
                  <Button onClick={() => setShowListeningSectionConfirm(true)}>
                    {t("ielts.sim.listeningNextSection")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>
            );
          })}
        </div>
      )}

      {currentSection.key === "writing" && (
        <div className="space-y-5">
          {currentSection.questions.map((question) => {
            const result = writingResults[question.id];
            const essay = writingResponses[question.id] ?? "";
            const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

            return (
              <section
                key={question.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                    {question.questionType === "task1"
                      ? t("ielts.writingTask1")
                      : t("ielts.writingTask2")}
                  </span>
                  {question.topic ? (
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      {question.topic}
                    </span>
                  ) : null}
                  {question.bandTarget ? (
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      Band {question.bandTarget}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  {question.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {question.prompt}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    {wordCount} {t("ielts.sim.words")}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleEvaluateWriting(question)}
                    disabled={evaluatingQuestionId === question.id}
                  >
                    {evaluatingQuestionId === question.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {t("ielts.sim.getAiEval")}
                  </Button>
                </div>

                <textarea
                  value={essay}
                  onChange={(event) => {
                    markUserInteraction();
                    setWritingResponses((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }));
                  }}
                  rows={14}
                  placeholder={t("ielts.wr.essayPlaceholder")}
                  className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                />

                {result ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-sm font-semibold text-emerald-400">
                      Band {result.overallBand}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {result.feedback.bandExplanation || result.feedback.detailedFeedback}
                    </p>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {currentSection.key === "speaking" && (
        <div className="space-y-5">
          {currentSection.questions.map((question) => {
            const result = speakingResults[question.id];
            const transcript = speakingResponses[question.id] ?? "";
            const cuePoints = question.content
              ? question.content.split("\n").map((item) => item.trim()).filter(Boolean)
              : [];

            return (
              <section
                key={question.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-400">
                    {question.questionType.toUpperCase()}
                  </span>
                  {question.topic ? (
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      {question.topic}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  {question.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {question.prompt}
                </p>

                {cuePoints.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {t("ielts.sim.cuePoints")}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {cuePoints.map((item, index) => (
                        <li
                          key={`${question.id}-cue-${index}`}
                          className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4">
                  <SpeakingRecorderPanel
                    compact
                    onUseTranscript={(value) => {
                      markUserInteraction();
                      setSpeakingResponses((prev) => ({
                        ...prev,
                        [question.id]: value,
                      }));
                    }}
                  />
                </div>

                <textarea
                  value={transcript}
                  onChange={(event) => {
                    markUserInteraction();
                    setSpeakingResponses((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }));
                  }}
                  rows={8}
                  placeholder={t("ielts.sp.responsePlaceholder")}
                  className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-400 focus:ring-2 focus:ring-violet-500/40"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleEvaluateSpeaking(question)}
                    disabled={evaluatingQuestionId === question.id}
                  >
                    {evaluatingQuestionId === question.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {t("ielts.sim.getAiEval")}
                  </Button>
                </div>

                {result ? (
                  <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <p className="text-sm font-semibold text-violet-400">
                      Band {result.overallBand}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {result.feedback.bandExplanation || result.feedback.detailedFeedback}
                    </p>
                    {extractFollowUps(result.feedback).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {extractFollowUps(result.feedback).map((item, index) => (
                          <span
                            key={`${question.id}-follow-${index}`}
                            className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {error ? <ErrorBanner message={error} /> : null}
      {examMode.warningMessage ? (
        <ErrorBanner message={examMode.warningMessage} onClose={examMode.clearWarning} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!(currentSection.key === "listening" && activeListeningGroupIndex < groupedQuestions.length - 1) && (
          <Button onClick={handleCompleteSection}>
            {activeSectionIndex === mock.sections.length - 1
              ? t("ielts.sim.finishMock")
              : currentSection.key === "reading" || currentSection.key === "listening"
                ? t("ielts.sim.checkAndContinue")
                : t("ielts.sim.continueNext")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        <Button variant="secondary" onClick={examMode.askExit}>
          <RotateCcw className="h-4 w-4" />
          {t("ielts.sim.exitReconfigure")}
        </Button>
      </div>

      <ExamViolationModal
        open={examMode.showExitConfirm}
        title={t("ielts.sim.terminateTitle")}
        message={t("ielts.sim.terminateMessage")}
        cancelLabel={t("ielts.sim.stayInExam")}
        confirmLabel={t("ielts.sim.terminateExit")}
        confirmTone="danger"
        onCancel={examMode.cancelExit}
        onConfirm={() => {
          void examMode.confirmExit();
          setIsTerminating(true);
        }}
      />
      <ExamViolationModal
        open={showListeningSectionConfirm}
        title={t("ielts.sim.listeningConfirmTitle")}
        message={t("ielts.sim.listeningConfirmMessage", { n: activeListeningGroupIndex + 1 })}
        cancelLabel={t("ielts.sim.listeningConfirmCancel")}
        confirmLabel={t("ielts.sim.listeningConfirmConfirm")}
        onCancel={() => setShowListeningSectionConfirm(false)}
        onConfirm={handleAdvanceListeningGroup}
      />
      </div>
    </div>
  );
}

function buildQuestionGroups(questions: IELTSQuestion[]): QuestionGroup[] {
  const groups = new Map<string, QuestionGroup>();

  for (const question of questions) {
    const key = question.questionGroup || question.id;
    const existing = groups.get(key);

    if (existing) {
      existing.questions.push(question);
      continue;
    }

    groups.set(key, {
      key,
      title: question.title,
      prompt: question.prompt,
      content: question.content,
      audioScript: question.audioScript,
      topic: question.topic,
      questions: [question],
    });
  }

  return Array.from(groups.values());
}

function averageBand(values?: Array<number | undefined>) {
  if (!values || values.length === 0) {
    return null;
  }

  const filtered = values.filter((item): item is number => typeof item === "number");
  if (filtered.length === 0) {
    return null;
  }

  const total = filtered.reduce((sum, value) => sum + value, 0);
  return total / filtered.length;
}

function computeObjectiveStats(
  questions: IELTSQuestion[],
  answers: Record<string, string>
) {
  const total = questions.length;
  let correct = 0;

  for (const question of questions) {
    const expected = normalizeAnswer(question.answer ?? "");
    const actual = normalizeAnswer(answers[question.id] ?? "");
    if (expected !== "" && expected === actual) {
      correct += 1;
    }
  }

  return {
    total,
    correct,
    percent: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatExamSetLabel(value: string) {
  if (value.startsWith("cambridge-")) {
    const [, book, marker, testNumber] = value.split("-");
    if (book && marker === "test" && testNumber) {
      return `Cambridge ${book} · Test ${testNumber}`;
    }
  }

  if (value.startsWith("predictions-")) {
    const [, year, marker, setNumber] = value.split("-");
    if (year && marker === "set" && setNumber) {
      return `Predictions ${year} · Set ${setNumber}`;
    }
  }

  return value.replace(/-/g, " ");
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function rawScoreToBand(correct: number, total: number): number {
  // Official IELTS Listening/Reading band scale (40-question sections)
  const scale: Record<number, number> = {
    40: 9.0, 39: 9.0, 38: 8.5, 37: 8.5, 36: 8.5,
    35: 8.0, 34: 7.5, 33: 7.0, 32: 7.0, 31: 6.5,
    30: 6.5, 29: 6.0, 28: 6.0, 27: 5.5, 26: 5.5,
    25: 5.0, 24: 5.0, 23: 4.5, 22: 4.5, 21: 4.0,
    20: 4.0, 19: 3.5, 18: 3.5, 17: 3.0, 16: 3.0,
    15: 2.5, 14: 2.5, 13: 2.0,
  };
  if (total === 40 && correct in scale) return scale[correct];
  return objectivePercentToBand(Math.round((correct / total) * 100));
}

function objectivePercentToBand(percent: number) {
  if (percent >= 90) return 9.0;
  if (percent >= 85) return 8.5;
  if (percent >= 80) return 8.0;
  if (percent >= 75) return 7.5;
  if (percent >= 70) return 7.0;
  if (percent >= 63) return 6.5;
  if (percent >= 55) return 6.0;
  if (percent >= 47) return 5.5;
  if (percent >= 40) return 5.0;
  if (percent >= 32) return 4.5;
  return 4.0;
}

function extractFollowUps(feedback?: SpeakingResult["feedback"]) {
  if (!feedback) {
    return [];
  }

  return Array.from(
    new Set(
      [...(feedback.followUpQuestions ?? []), feedback.followUpQuestion]
        .map((item) => item?.trim())
        .filter(Boolean) as string[]
    )
  );
}

function objectiveOptions(question: IELTSQuestion) {
  if (question.options && question.options.length > 0) {
    return question.options;
  }

  if (question.questionType === "true_false") {
    return ["true", "false", "not given"];
  }

  return [];
}

function SelectionCard({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition-all ${
        active
          ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-[var(--shadow-sm)]"
          : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            active ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border)]"
          }`}
        >
          {active ? <CheckCircle2 className="h-3 w-3 text-white" /> : null}
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{body}</p>
        </div>
      </div>
    </button>
  );
}

function ScoreCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
      <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function ObjectiveQuestionCard({
  index,
  question,
  value,
  revealed,
  flagged,
  onToggleFlag,
  onChange,
}: {
  index: number;
  question: IELTSQuestion;
  value: string;
  revealed: boolean;
  flagged?: boolean;
  onToggleFlag?: (id: string) => void;
  onChange: (questionId: string, value: string) => void;
}) {
  const { t } = useLocale();
  const options = objectiveOptions(question);
  const isCorrect =
    revealed && normalizeAnswer(value) === normalizeAnswer(question.answer ?? "");
  const qtypeKey = `ielts.qtype.${question.questionType}` as Parameters<typeof t>[0];
  const qtypeLabel = t(qtypeKey) ?? question.questionType.replace(/_/g, " ").toUpperCase();

  return (
    <div
      className={`rounded-2xl border p-4 ${
        flagged && !revealed
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-[var(--border)] bg-[var(--bg-surface)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Q{index}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {qtypeLabel}
        </span>
        {revealed ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              isCorrect
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {isCorrect ? t("ielts.sim.correctBadge") : t("ielts.sim.checkAnswer")}
          </span>
        ) : null}
        {onToggleFlag && !revealed ? (
          <button
            type="button"
            onClick={() => onToggleFlag(question.id)}
            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              flagged
                ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500/40 hover:text-amber-400"
            }`}
          >
            <Flag className="h-3 w-3" />
            {flagged ? t("ielts.sim.unflag") : t("ielts.sim.flag")}
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium leading-6 text-[var(--text-primary)]">
        {question.prompt}
      </p>

      {options.length > 0 ? (
        <div className="mt-3 grid gap-2" role="radiogroup">
          {options.map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all ${
                value === option
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={option}
                checked={value === option}
                onChange={() => onChange(question.id, option)}
                className="h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(question.id, event.target.value)}
          placeholder="Type your answer"
          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
        />
      )}

      {revealed ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t("ielts.sim.correctAnswerLabel")}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {question.answer}
          </p>
          {question.explanation ? (
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {question.explanation}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReadingSplitPanel({
  groups,
  objectiveAnswers,
  flaggedQuestions,
  revealed,
  passageFontSize,
  onSetFontSize,
  onToggleFlag,
  onAnswer,
}: {
  groups: QuestionGroup[];
  objectiveAnswers: Record<string, string>;
  flaggedQuestions: Set<string>;
  revealed: boolean;
  passageFontSize: 0 | 1 | 2;
  onSetFontSize: (n: 0 | 1 | 2) => void;
  onToggleFlag: (id: string) => void;
  onAnswer: (id: string, value: string) => void;
}) {
  const { t } = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [splitPct, setSplitPct] = useState(52);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const questionOffsets = groups.map((_, gi) =>
    groups.slice(0, gi).reduce((acc, g) => acc + g.questions.length, 0)
  );
  const allQuestions = groups.flatMap((g) => g.questions);
  const group = groups[activeIndex] ?? groups[0];

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(70, Math.max(30, pct)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const scrollToQuestion = useCallback((qid: string) => {
    for (let gi = 0; gi < groups.length; gi++) {
      if (groups[gi].questions.some((q) => q.id === qid)) {
        setActiveIndex(gi);
        setTimeout(() => {
          questionRefs.current[qid]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 60);
        return;
      }
    }
  }, [groups]);

  const fontSizeClass = ["text-sm", "text-base", "text-lg"][passageFontSize];

  return (
    <div className="flex flex-col gap-3">
      {/* Top toolbar: passage tabs + font size */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g, gi) => {
            const start = questionOffsets[gi];
            const end = start + g.questions.length;
            const answeredCount = g.questions.filter((q) => (objectiveAnswers[q.id] ?? "") !== "").length;
            return (
              <button
                key={g.key}
                onClick={() => setActiveIndex(gi)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeIndex === gi
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {t("ielts.sim.passageN", { n: gi + 1 })}
                <span className="rounded-full border border-current/20 bg-current/10 px-1.5 py-px text-[9px] font-semibold">
                  Q{start + 1}–{end}
                </span>
                {!revealed && answeredCount > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-px text-[9px] font-semibold text-emerald-400">
                    {answeredCount}/{g.questions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Font size controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t("ielts.sim.fontSize")}
          </span>
          {([0, 1, 2] as const).map((n) => {
            const labels = ["A−", "A", "A+"];
            return (
              <button
                key={n}
                onClick={() => onSetFontSize(n)}
                className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg border px-1.5 text-xs font-bold transition-colors ${
                  passageFontSize === n
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {labels[n]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split panel */}
      <div
        ref={containerRef}
        className="flex overflow-hidden rounded-2xl border border-[var(--border)]"
        style={{ height: "calc(100vh - 360px)", minHeight: "420px" }}
      >
        {/* Left: passage text */}
        <div
          className="overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4"
          style={{ width: `${splitPct}%` }}
        >
          <h3 className="text-base font-bold text-[var(--text-primary)]">{group.title}</h3>
          {group.topic ? (
            <p className="mt-1 text-xs text-[var(--text-muted)]">{group.topic}</p>
          ) : null}
          {group.content ? (
            <p
              className={`mt-4 whitespace-pre-wrap leading-[1.9] text-[var(--text-secondary)] ${fontSizeClass}`}
            >
              {group.content}
            </p>
          ) : (
            <p className="mt-4 text-sm italic text-[var(--text-muted)]">
              {t("ielts.sim.noPassageContent")}
            </p>
          )}
        </div>

        {/* Resizable divider */}
        <div
          onMouseDown={handleDividerMouseDown}
          className="group flex w-2 shrink-0 cursor-col-resize select-none items-center justify-center bg-[var(--border)] transition-colors hover:bg-[var(--primary)]/30"
        >
          <div className="h-10 w-0.5 rounded-full bg-[var(--text-muted)] opacity-40 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Right: questions */}
        <div
          className="overflow-y-auto px-5 py-4"
          style={{ width: `${100 - splitPct - 0.2}%` }}
        >
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t("ielts.sim.questionsRange", {
              from: questionOffsets[activeIndex] + 1,
              to: questionOffsets[activeIndex] + group.questions.length,
            })}
          </p>
          <div className="space-y-4">
            {group.questions.map((q, li) => (
              <div
                key={q.id}
                ref={(el) => {
                  questionRefs.current[q.id] = el;
                }}
              >
                <ObjectiveQuestionCard
                  index={questionOffsets[activeIndex] + li + 1}
                  question={q}
                  value={objectiveAnswers[q.id] ?? ""}
                  revealed={revealed}
                  flagged={flaggedQuestions.has(q.id)}
                  onToggleFlag={onToggleFlag}
                  onChange={onAnswer}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question navigator */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {t("ielts.sim.questionNav")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allQuestions.map((q, idx) => {
            const answered = (objectiveAnswers[q.id] ?? "") !== "";
            const flaggedQ = flaggedQuestions.has(q.id);
            const correct = revealed && normalizeAnswer(objectiveAnswers[q.id] ?? "") === normalizeAnswer(q.answer ?? "");
            const wrong = revealed && answered && !correct;
            return (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(q.id)}
                title={`Q${idx + 1}${flaggedQ ? " ⚑" : ""}`}
                className={`flex h-7 w-7 items-center justify-center rounded text-[11px] font-semibold transition-colors ${
                  revealed
                    ? correct
                      ? "bg-emerald-500/20 text-emerald-400"
                      : wrong
                        ? "bg-red-500/20 text-red-400"
                        : "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                    : flaggedQ
                      ? "bg-amber-500/25 text-amber-400"
                      : answered
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-soft)]"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        {!revealed && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[var(--primary-soft)]" />
              {t("ielts.sim.answered")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-500/25" />
              {t("ielts.sim.flagged")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[var(--bg-surface)] border border-[var(--border)]" />
              {t("ielts.sim.unanswered")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-red-400 hover:text-red-300"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
