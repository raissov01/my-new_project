"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateStudyPlan, getStudyPlan } from "../simulator/attempt-actions";

export function IELTSStudyPlanClient() {
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await getStudyPlan();
        if (!mounted) return;
        setPlan(resp.plan);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load study plan.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleGenerate(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const weakSections = String(formData.get("weakSections") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const strengths = String(formData.get("strengths") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const struggles = String(formData.get("struggles") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await generateStudyPlan({
        targetBand: String(formData.get("targetBand") ?? ""),
        currentBand: String(formData.get("currentBand") ?? ""),
        examDate: String(formData.get("examDate") ?? ""),
        examType: String(formData.get("examType") ?? "academic"),
        weeklyHours: Number(formData.get("weeklyHours") ?? 10),
        weakSections,
        strengths,
        struggles,
      });
      setPlan(response.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleGenerate(new FormData(event.currentTarget));
        }}
        className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 md:grid-cols-2"
      >
        <Field label="Target band" name="targetBand" defaultValue="6.5" />
        <Field label="Current band" name="currentBand" defaultValue="5.5" />
        <Field label="Exam date" name="examDate" type="date" />
        <Field label="Exam type" name="examType" defaultValue="academic" />
        <Field label="Weekly hours" name="weeklyHours" type="number" defaultValue="10" />
        <Field label="Weak sections (comma-separated)" name="weakSections" defaultValue="writing,speaking" />
        <Field label="Strengths (comma-separated)" name="strengths" defaultValue="reading,listening" />
        <Field label="Main struggles (comma-separated)" name="struggles" defaultValue="timing,grammar" />
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate study plan
          </Button>
        </div>
      </form>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">{error}</div> : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Current plan</h2>
        {plan ? (
          <pre className="mt-4 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
            {JSON.stringify(plan, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">No active plan available yet.</p>
        )}
      </section>
    </div>
  );
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <label className="space-y-2 text-sm text-[var(--text-secondary)]">
      <span>{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40" />
    </label>
  );
}
