"use client";

import type { IELTSQuestion } from "@/features/ielts/api";

type QuestionRendererProps = {
  question: IELTSQuestion;
  index: number;
  value: string;
  revealed: boolean;
  onChange: (questionId: string, value: string) => void;
};

export function QuestionRenderer({
  question,
  index,
  value,
  revealed,
  onChange,
}: QuestionRendererProps) {
  const isCorrect =
    revealed &&
    question.answer &&
    value.trim().toLowerCase() === question.answer.trim().toLowerCase();
  const isWrong = revealed && value.trim() !== "" && !isCorrect;

  return (
    <div
      className={`rounded-[var(--radius-lg)] border p-4 ${
        revealed
          ? isCorrect
            ? "border-emerald-500/30 bg-emerald-500/5"
            : isWrong
              ? "border-red-500/30 bg-red-500/5"
              : "border-[var(--border)] bg-[var(--bg-soft)]"
          : "border-[var(--border)] bg-[var(--bg-soft)]"
      }`}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        <span className="mr-2 text-[var(--text-muted)]">Q{index}.</span>
        {question.prompt}
      </p>

      <div className="mt-3">
        <QuestionInput
          question={question}
          value={value}
          revealed={revealed}
          onChange={onChange}
        />
      </div>

      {revealed && question.answer && (
        <div className="mt-3 text-sm">
          <span className="font-medium text-emerald-500">
            Answer: {question.answer}
          </span>
          {question.explanation && (
            <p className="mt-1 text-[var(--text-secondary)]">
              {question.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  revealed,
  onChange,
}: {
  question: IELTSQuestion;
  value: string;
  revealed: boolean;
  onChange: (questionId: string, value: string) => void;
}) {
  switch (question.questionType) {
    case "true_false_not_given":
      return (
        <RadioGroup
          questionId={question.id}
          options={["True", "False", "Not Given"]}
          value={value}
          revealed={revealed}
          answer={question.answer}
          onChange={onChange}
        />
      );

    case "yes_no_not_given":
      return (
        <RadioGroup
          questionId={question.id}
          options={["Yes", "No", "Not Given"]}
          value={value}
          revealed={revealed}
          answer={question.answer}
          onChange={onChange}
        />
      );

    case "true_false":
      return (
        <RadioGroup
          questionId={question.id}
          options={["True", "False"]}
          value={value}
          revealed={revealed}
          answer={question.answer}
          onChange={onChange}
        />
      );

    case "multiple_choice":
      return (
        <RadioGroup
          questionId={question.id}
          options={question.options ?? []}
          value={value}
          revealed={revealed}
          answer={question.answer}
          onChange={onChange}
        />
      );

    case "matching_headings":
    case "matching_information":
    case "matching":
      return (
        <SelectInput
          questionId={question.id}
          options={question.options ?? []}
          value={value}
          revealed={revealed}
          onChange={onChange}
        />
      );

    case "sentence_completion":
    case "summary_completion":
    case "short_answer":
    case "fill_blank":
      return (
        <TextInput
          questionId={question.id}
          value={value}
          revealed={revealed}
          onChange={onChange}
          placeholder={
            question.questionType === "short_answer"
              ? "Write no more than 3 words"
              : "Complete the sentence"
          }
        />
      );

    default:
      // Fallback for task1, task2, part1, part2, part3 (writing/speaking)
      return (
        <TextInput
          questionId={question.id}
          value={value}
          revealed={revealed}
          onChange={onChange}
          placeholder="Type your answer"
        />
      );
  }
}

function RadioGroup({
  questionId,
  options,
  value,
  revealed,
  answer,
  onChange,
}: {
  questionId: string;
  options: string[];
  value: string;
  revealed: boolean;
  answer?: string;
  onChange: (questionId: string, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const isSelected = value === option;
        const isCorrectOption =
          revealed && answer && option.trim().toLowerCase() === answer.trim().toLowerCase();
        const isWrongSelection = revealed && isSelected && !isCorrectOption;

        return (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border p-3 text-sm transition-all ${
              isCorrectOption && revealed
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : isWrongSelection
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : isSelected
                    ? "border-[var(--primary)]/40 bg-[var(--primary-soft)] text-[var(--text-primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            <input
              type="radio"
              name={questionId}
              value={option}
              checked={isSelected}
              disabled={revealed}
              onChange={() => onChange(questionId, option)}
              className="sr-only"
            />
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)]"
                  : "border-[var(--border-strong)]"
              }`}
            >
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-white" />
              )}
            </span>
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function SelectInput({
  questionId,
  options,
  value,
  revealed,
  onChange,
}: {
  questionId: string;
  options: string[];
  value: string;
  revealed: boolean;
  onChange: (questionId: string, value: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={revealed}
      onChange={(e) => onChange(questionId, e.target.value)}
      className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
    >
      <option value="">— Select —</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function TextInput({
  questionId,
  value,
  revealed,
  onChange,
  placeholder,
}: {
  questionId: string;
  value: string;
  revealed: boolean;
  onChange: (questionId: string, value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={revealed}
      onChange={(e) => onChange(questionId, e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] disabled:opacity-50"
    />
  );
}
