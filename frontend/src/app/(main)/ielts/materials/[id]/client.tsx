"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, StickyNote, PenLine, Save, ChevronLeft, ChevronRight,
  Maximize, Minimize, FileText, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";

type Material = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  type: string;
  difficulty: string;
  filePath: string;
};

type NoteData = {
  notes: string;
  exercises: Record<string, string>;
  lastPage: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  reading: "📖 Reading", writing: "✍️ Writing", speaking: "🗣️ Speaking",
  listening: "🎧 Listening", vocabulary: "📚 Vocabulary", grammar: "📝 Grammar",
  general: "📘 General",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  intermediate: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  advanced: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  all: "text-[var(--text-secondary)] bg-[var(--bg-soft)] border-[var(--border)]",
};

export function ReaderClient({ material, userId }: { material: Material; userId: string }) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<"pdf" | "notes" | "exercises">("pdf");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pdfUrl = material.filePath
    ? `/api/v1/files/${encodeURI(material.filePath)}`
    : "";

  // Load saved notes
  useEffect(() => {
    async function loadNotes() {
      try {
        const res = await fetch(`/api/materials/${material.id}/notes`, {
          headers: { "X-User-ID": userId },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.note) {
            setNotes(data.note.notes || "");
            setExercises(typeof data.note.exercises === "string"
              ? JSON.parse(data.note.exercises || "{}")
              : data.note.exercises || {});
          }
        }
      } catch { /* silent */ }
    }
    loadNotes();
  }, [material.id, userId]);

  // Auto-save notes (debounced)
  const saveNotes = useCallback(async (notesVal: string, exercisesVal: Record<string, string>) => {
    setSaving(true);
    try {
      await fetch(`/api/materials/${material.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-ID": userId },
        body: JSON.stringify({
          notes: notesVal,
          exercises: JSON.stringify(exercisesVal),
        }),
      });
      setLastSaved(new Date());
    } catch { /* silent */ }
    setSaving(false);
  }, [material.id, userId]);

  function handleNotesChange(val: string) {
    setNotes(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveNotes(val, exercises), 2000);
  }

  function handleExerciseChange(key: string, val: string) {
    const updated = { ...exercises, [key]: val };
    setExercises(updated);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveNotes(notes, updated), 2000);
  }

  // Exercise areas for common IELTS tasks
  const exerciseFields = [
    { key: "task1", label: "📝 Task 1 Answer", placeholder: "Write your Task 1 response here..." },
    { key: "task2", label: "📝 Task 2 Essay", placeholder: "Write your Task 2 essay here..." },
    { key: "answers", label: "✅ Answers", placeholder: "Write your answers here (e.g., 1. True, 2. False, 3. Not Given...)" },
    { key: "vocabulary", label: "📚 New Vocabulary", placeholder: "Write new words and their meanings..." },
    { key: "summary", label: "📋 Summary / Key Points", placeholder: "Summarize what you learned..." },
  ];

  return (
    <div className={`flex h-[calc(100dvh-4rem)] flex-col sm:h-[calc(100vh-4rem)] ${fullscreen ? "fixed inset-0 z-50 bg-[var(--bg-base)] h-screen" : ""}`}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 sm:px-4">
        <Link href="/ielts/materials" className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-base">{material.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{CATEGORY_LABELS[material.category] || material.category}</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold sm:text-[10px] ${DIFFICULTY_COLORS[material.difficulty] || DIFFICULTY_COLORS.all}`}>
              {material.difficulty}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
          {lastSaved && !saving && (
            <span className="text-[10px] text-emerald-500">Saved</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:hidden"
          >
            <StickyNote className="h-4 w-4" />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="flex border-b border-[var(--border)] bg-[var(--bg-surface)] sm:hidden">
        {[
          { key: "pdf" as const, icon: BookOpen, label: "Book" },
          { key: "notes" as const, icon: StickyNote, label: "Notes" },
          { key: "exercises" as const, icon: PenLine, label: "Exercises" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div className={`flex-1 ${activeTab !== "pdf" ? "hidden sm:block" : ""}`}>
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="h-full w-full border-0"
              title={material.title}
            />
          ) : material.content ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
                <div className="whitespace-pre-wrap text-sm leading-7">{material.content}</div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-[var(--text-muted)]" aria-hidden />
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{t("ielts.materials.noContent")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Notes & Exercises */}
        <div className={`border-l border-[var(--border)] bg-[var(--bg-elevated)] ${
          activeTab === "pdf" ? "hidden sm:flex" : "flex"
        } w-full flex-col sm:w-[380px] sm:min-w-[320px]`}>

          {/* Desktop tabs */}
          <div className="hidden sm:flex border-b border-[var(--border)]">
            {[
              { key: "notes" as const, icon: StickyNote, label: "Notes" },
              { key: "exercises" as const, icon: PenLine, label: "Exercises" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.key || (activeTab === "pdf" && tab.key === "notes")
                    ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {/* Notes tab */}
            {(activeTab === "notes" || (activeTab === "pdf" && sidebarOpen)) && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--text-primary)]">📝 My Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Write your notes, thoughts, key points here..."
                  className="w-full min-h-[200px] resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
                />
                <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                  Auto-saves after you stop typing
                </p>
              </div>
            )}

            {/* Exercises tab */}
            {activeTab === "exercises" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">✍️ Exercises</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Complete the exercises from the book below. Your answers are saved automatically.
                </p>
                {exerciseFields.map(field => (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">
                      {field.label}
                    </label>
                    <textarea
                      value={exercises[field.key] || ""}
                      onChange={(e) => handleExerciseChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={field.key === "task2" ? 8 : 4}
                      className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                ))}

                <Button
                  onClick={() => saveNotes(notes, exercises)}
                  disabled={saving}
                  className="w-full"
                  size="sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save All"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
