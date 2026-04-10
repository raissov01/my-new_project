"use client";

import { useState, useTransition } from "react";
import { AlertCircle, BookOpen, Headphones, Mic, PenLine, Plus, Pencil, Trash2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type IELTSMaterial,
} from "./actions";

const CATEGORIES = ["reading", "writing", "speaking", "listening", "vocabulary", "grammar", "general"] as const;
const TYPES = ["lesson", "practice", "tip", "book", "mock_test", "feedback_prompt"] as const;

const categoryIcons: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
  listening: Headphones,
  vocabulary: BookOpen,
  grammar: BookOpen,
  general: BookOpen,
};

const categoryColors: Record<string, string> = {
  reading: "text-blue-400",
  writing: "text-emerald-400",
  speaking: "text-violet-400",
  listening: "text-cyan-400",
  vocabulary: "text-orange-400",
  grammar: "text-rose-400",
  general: "text-slate-400",
};

const typeLabels: Record<string, string> = {
  lesson: "admin.typeLesson",
  practice: "admin.typePractice",
  tip: "admin.typeTip",
  book: "admin.typeBook",
  mock_test: "admin.typeMockTest",
  feedback_prompt: "admin.typeFeedback",
};

type FormData = {
  title: string;
  content: string;
  category: (typeof CATEGORIES)[number];
  type: (typeof TYPES)[number];
  sortOrder: number;
};

const emptyForm: FormData = {
  title: "",
  content: "",
  category: "reading",
  type: "lesson",
  sortOrder: 0,
};

export function AdminPanelClient({
  initialMaterials,
}: {
  initialMaterials: IELTSMaterial[];
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [materials, setMaterials] = useState(initialMaterials);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = materials.filter((m) => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterType !== "all" && m.type !== filterType) return false;
    return true;
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(material: IELTSMaterial) {
    setEditingId(material.id);
    setForm({
      title: material.title,
      content: material.content,
      category: material.category,
      type: material.type,
      sortOrder: material.sortOrder,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setFormError(t("admin.errorRequired"));
      return;
    }

    startTransition(async () => {
      const result = editingId
        ? await updateMaterial(editingId, form.title, form.content, form.category, form.type, form.sortOrder)
        : await createMaterial(form.title, form.content, form.category, form.type, form.sortOrder);

      if (result.error) {
        setFormError(result.error);
        return;
      }

      toast("success", editingId ? t("admin.updated") : t("admin.created"));
      setModalOpen(false);

      // Refresh list — in a real app we'd refetch, but updating local state works for now
      if (editingId) {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? { ...m, title: form.title, content: form.content, category: form.category, type: form.type, sortOrder: form.sortOrder, updatedAt: new Date().toISOString() }
              : m
          )
        );
      } else {
        // Force page refresh to get the new item with ID from the server
        window.location.reload();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMaterial(id);
      if (result.error) {
        toast("error", result.error);
      } else {
        toast("success", t("admin.deleted"));
        setMaterials((prev) => prev.filter((m) => m.id !== id));
      }
      setDeleteId(null);
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">{t("admin.allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`admin.cat${c[0].toUpperCase()}${c.slice(1)}`)}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">{t("admin.allTypes")}</option>
            {TYPES.map((typ) => (
              <option key={typ} value={typ}>{t(typeLabels[typ])}</option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("admin.addMaterial")}
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-4 text-sm text-[var(--text-secondary)]">
        {filtered.length} {filtered.length === 1 ? t("admin.material") : t("admin.materials")}
      </div>

      {/* Materials list */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-4">
          {filtered.map((material) => {
            const Icon = categoryIcons[material.category];
            return (
              <div
                key={material.id}
                className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-0.5 ${categoryColors[material.category]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {material.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                          {t(`admin.cat${material.category[0].toUpperCase()}${material.category.slice(1)}`)}
                        </span>
                        <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
                          {t(typeLabels[material.type])}
                        </span>
                        {material.sortOrder > 0 && (
                          <span className="text-xs text-[var(--text-muted)]">
                            #{material.sortOrder}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {material.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openEdit(material)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(material.id)}
                      className="rounded-xl border border-red-500/20 bg-red-500/5 p-2.5 text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-14 text-center">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("admin.emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("admin.emptyBody")}</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t("admin.editMaterial") : t("admin.addMaterial")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("admin.fieldTitle")}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              {t("admin.fieldContent")}
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              required
              className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm transition-all placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder={t("admin.contentPlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                {t("admin.fieldCategory")}
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as FormData["category"] })}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`admin.cat${c[0].toUpperCase()}${c.slice(1)}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                {t("admin.fieldType")}
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as FormData["type"] })}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              >
                {TYPES.map((typ) => (
                  <option key={typ} value={typ}>{t(typeLabels[typ])}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            type="number"
            label={t("admin.fieldSortOrder")}
            value={String(form.sortOrder)}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            min={0}
            max={999}
            step={1}
          />

          {formError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" isLoading={isPending}>
              {editingId ? t("admin.save") : t("admin.create")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={isPending}>
              {t("set.cancel")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title={t("admin.confirmDelete")}
      >
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {t("admin.confirmDeleteBody")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="danger"
            onClick={() => deleteId && handleDelete(deleteId)}
            isLoading={isPending}
          >
            {t("admin.deleteBtn")}
          </Button>
          <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isPending}>
            {t("set.cancel")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
