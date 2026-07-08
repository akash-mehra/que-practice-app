"use client";

import { useRef, useState } from "react";
import { X, FileUp, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { generateQuestionsFromPdf, type PipelineStep } from "@/lib/geminiGenerate";
import { loadGeminiKey } from "@/lib/qbank";
import type { PracticeQuestion } from "@/types/question";

interface GenerateModalProps {
  onClose: () => void;
  onGenerated: (questions: PracticeQuestion[]) => void;
  onNeedsApiKey: () => void;
}

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "read", label: "Reading PDF" },
  { key: "send", label: "Sending to Gemini 2.5 Flash" },
  { key: "parse", label: "Parsing generated questions" },
  { key: "save", label: "Saving to your local qbank" },
];

export default function GenerateModal({
  onClose,
  onGenerated,
  onNeedsApiKey,
}: GenerateModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [subjectHint, setSubjectHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentStep, setCurrentStep] = useState<PipelineStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const stepIndex = (step: PipelineStep | null) =>
    step ? STEPS.findIndex((s) => s.key === step) : -1;

  const handleGenerate = async () => {
    setError(null);
    if (!file) {
      setError("Choose a PDF first.");
      return;
    }
    const apiKey = loadGeminiKey();
    if (!apiKey) {
      onNeedsApiKey();
      return;
    }

    setBusy(true);
    try {
      const questions = await generateQuestionsFromPdf({
        apiKey,
        file,
        questionCount,
        subjectHint,
        onStep: setCurrentStep,
      });
      onGenerated(questions);
      setSuccessCount(questions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
      setCurrentStep(null);
    }
  };

  if (successCount !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,4,12,0.72)] p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--bg-1)] p-7 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-[var(--ok)]" />
          <h3 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--ink-0)]">
            {successCount} question{successCount === 1 ? "" : "s"} added
          </h3>
          <p className="mt-1.5 text-[13px] text-[var(--ink-1)]">
            Successfully generated and synced to your local qbank.
          </p>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-[var(--accent)] py-3 text-[13.5px] font-bold text-white hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(6,4,12,0.65)] backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] border border-b-0 border-[var(--glass-border)] bg-[var(--bg-1)] px-[22px] pb-8 pt-3.5"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--ink-0)]">
            <Sparkles size={18} className="text-[var(--accent-2)]" />
            Generate from a PDF
          </h3>
          {!busy && (
            <button onClick={onClose} className="text-[var(--ink-muted)] hover:text-[var(--ink-0)]">
              <X size={20} />
            </button>
          )}
        </div>

        {!busy && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--line)] bg-white/[0.03] p-4 text-left hover:bg-white/[0.05]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(139,124,246,0.16)] text-[var(--accent)]">
                <FileUp size={20} />
              </span>
              <span>
                <div className="text-[14px] font-semibold text-[var(--ink-0)]">
                  {file ? file.name : "Choose a PDF"}
                </div>
                <p className="m-0 text-[12px] text-[var(--ink-1)]">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : "Lecture notes, First Aid chapters, review PDFs — up to 20 MB"}
                </p>
              </span>
            </button>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--ink-1)]">
              Number of questions
            </label>
            <input
              type="range"
              min={1}
              max={25}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="mb-1 w-full accent-[var(--accent)]"
            />
            <div className="mb-4 text-[12px] text-[var(--ink-muted)]">
              {questionCount} question{questionCount === 1 ? "" : "s"}
            </div>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--ink-1)]">
              Subject focus (optional)
            </label>
            <input
              type="text"
              value={subjectHint}
              onChange={(e) => setSubjectHint(e.target.value)}
              placeholder="e.g. Cardiovascular pathology"
              className="mb-5 w-full rounded-xl border border-[var(--line)] bg-white/[0.04] px-3.5 py-3 text-[14px] text-[var(--ink-0)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
            />

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.08)] p-3 text-[12.5px] text-[var(--danger)]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] py-[16px] text-[15px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,var(--accent),#6c5ce7)",
                boxShadow: "0 14px 30px -10px rgba(139,124,246,0.55)",
              }}
            >
              <Sparkles size={17} />
              Generate {questionCount} question{questionCount === 1 ? "" : "s"}
            </button>
          </>
        )}

        {busy && (
          <div className="py-2">
            {STEPS.map((step, i) => {
              const idx = stepIndex(currentStep);
              const state = i < idx ? "done" : i === idx ? "active" : "pending";
              return (
                <div key={step.key} className="mb-3 flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] ${
                      state === "done"
                        ? "border-[var(--ok)] bg-[var(--ok)] text-[#0b2b22]"
                        : state === "active"
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {state === "done" ? (
                      <CheckCircle2 size={14} />
                    ) : state === "active" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={`text-[13.5px] ${
                      state === "pending" ? "text-[var(--ink-muted)]" : "text-[var(--ink-0)]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
