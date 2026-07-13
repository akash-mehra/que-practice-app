"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  History,
  Copy,
} from "lucide-react";
import {
  generateQuestionsFromPdf,
  MAX_QUESTIONS_PER_BATCH,
  type PipelineStep,
  type GenerationMode,
} from "@/lib/geminiGenerate";
import { loadGeminiKey } from "@/lib/qbank";
import { flagDuplicates, type DuplicateFlaggedQuestion } from "@/lib/fingerprint";
import { savePdfSource, listPdfSources, getPdfFile, updateExtractedCount } from "@/lib/pdfStore";
import type { PracticeQuestion, PdfSourceMeta } from "@/types/question";

interface GenerateModalProps {
  onClose: () => void;
  onGenerated: (questions: PracticeQuestion[], sourcePdfId?: string) => void;
  onNeedsApiKey: () => void;
  existingQuestions: PracticeQuestion[];
}

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "read", label: "Reading PDF" },
  { key: "send", label: "Sending to Gemini 2.5 Flash" },
  { key: "parse", label: "Parsing generated questions" },
  { key: "save", label: "Validating questions" },
];

type Stage = "setup" | "pipeline" | "preview" | "done";

export default function GenerateModal({
  onClose,
  onGenerated,
  onNeedsApiKey,
  existingQuestions,
}: GenerateModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("setup");
  const [mode, setMode] = useState<GenerationMode>("generate");
  const [file, setFile] = useState<File | null>(null);
  const [activePdfId, setActivePdfId] = useState<string | null>(null);
  const [continuingFrom, setContinuingFrom] = useState<number | undefined>(undefined);
  const [pdfLibrary, setPdfLibrary] = useState<PdfSourceMeta[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [subjectHint, setSubjectHint] = useState("");
  const [currentStep, setCurrentStep] = useState<PipelineStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<DuplicateFlaggedQuestion[]>([]);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    listPdfSources()
      .then(setPdfLibrary)
      .catch(() => setPdfLibrary([]));
  }, []);

  const stepIndex = (step: PipelineStep | null) =>
    step ? STEPS.findIndex((s) => s.key === step) : -1;

  const handlePickNewFile = (f: File) => {
    setFile(f);
    setActivePdfId(null);
    setContinuingFrom(undefined);
  };

  const handleContinueFromLibrary = async (meta: PdfSourceMeta) => {
    setError(null);
    const storedFile = await getPdfFile(meta.id);
    if (!storedFile) {
      setError("Couldn't load that stored PDF — try uploading it again.");
      return;
    }
    setFile(storedFile);
    setActivePdfId(meta.id);
    setContinuingFrom(meta.extractedCount + 1);
    setMode("extract");
  };

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

    setStage("pipeline");
    try {
      const results = await generateQuestionsFromPdf({
        apiKey,
        file,
        questionCount,
        subjectHint,
        mode,
        rangeStart: mode === "extract" ? continuingFrom : undefined,
        onStep: setCurrentStep,
      });

      // Persist this PDF (new or continuing) so it's available for "Add More" later.
      let pdfId = activePdfId;
      if (!pdfId) {
        try {
          const meta = await savePdfSource(file);
          pdfId = meta.id;
          setActivePdfId(pdfId);
        } catch {
          // Non-fatal — the person just won't be able to "Add More" from this
          // source later. Generation itself already succeeded.
        }
      }
      if (pdfId) {
        const priorCount = continuingFrom ? continuingFrom - 1 : 0;
        updateExtractedCount(pdfId, priorCount + results.length).catch(() => {});
      }

      const flaggedResults = flagDuplicates(results, existingQuestions);
      setFlagged(flaggedResults);
      // Default: unique questions checked, duplicates unchecked.
      setIncluded(
        new Set(
          flaggedResults
            .map((f, i) => (f.isDuplicate ? -1 : i))
            .filter((i) => i !== -1)
        )
      );
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("setup");
      setCurrentStep(null);
    }
  };

  const toggleIncluded = (i: number) => {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleCommit = () => {
    const selected = flagged.filter((_, i) => included.has(i)).map((f) => f.question);
    onGenerated(selected, activePdfId ?? undefined);
    setSuccessCount(selected.length);
    setStage("done");
  };

  const duplicateCount = flagged.filter((f) => f.isDuplicate).length;

  if (stage === "done" && successCount !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,4,12,0.72)] p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--bg-1)] p-7 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-[var(--ok)]" />
          <h3 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--ink-0)]">
            {successCount} question{successCount === 1 ? "" : "s"} added as a new module
          </h3>
          <p className="mt-1.5 text-[13px] text-[var(--ink-1)]">
            Find it in your Module Library on the home screen.
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
      onClick={() => stage === "setup" && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] border border-b-0 border-[var(--glass-border)] bg-[var(--bg-1)] px-[22px] pb-8 pt-3.5"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--ink-0)]">
            <Sparkles size={18} className="text-[var(--accent-2)]" />
            {mode === "extract" ? "Extract from a PDF" : "Generate from a PDF"}
          </h3>
          {stage === "setup" && (
            <button onClick={onClose} className="text-[var(--ink-muted)] hover:text-[var(--ink-0)]">
              <X size={20} />
            </button>
          )}
        </div>

        {stage === "setup" && (
          <>
            {/* Mode toggle */}
            <div className="mb-4 flex rounded-xl border border-[var(--line)] bg-black/[0.02] p-1">
              <button
                onClick={() => setMode("generate")}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition ${
                  mode === "generate"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--ink-1)]"
                }`}
              >
                Generate new
              </button>
              <button
                onClick={() => setMode("extract")}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition ${
                  mode === "extract" ? "bg-[var(--accent)] text-white" : "text-[var(--ink-1)]"
                }`}
              >
                Extract exact
              </button>
            </div>
            <p className="mb-4 text-[12px] leading-relaxed text-[var(--ink-1)]">
              {mode === "generate"
                ? "Gemini writes original questions inspired by the PDF's content."
                : "Gemini transcribes questions already in the PDF word-for-word, without rewording."}
            </p>

            {/* PDF library */}
            {pdfLibrary.length > 0 && (
              <div className="mb-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink-1)]">
                  <History size={13} />
                  Continue from a saved PDF
                </label>
                <div className="flex flex-col gap-1.5">
                  {pdfLibrary.map((meta) => (
                    <button
                      key={meta.id}
                      onClick={() => handleContinueFromLibrary(meta)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[12.5px] ${
                        activePdfId === meta.id
                          ? "border-[var(--accent)] bg-[rgba(46,139,87,0.08)]"
                          : "border-[var(--line)] bg-black/[0.02]"
                      }`}
                    >
                      <span className="truncate text-[var(--ink-0)]">{meta.name}</span>
                      <span className="ml-2 shrink-0 text-[var(--ink-muted)]">
                        {meta.extractedCount} extracted
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePickNewFile(f);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--line)] bg-black/[0.02] p-4 text-left hover:bg-black/[0.035]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(46,139,87,0.14)] text-[var(--accent)]">
                <FileUp size={20} />
              </span>
              <span>
                <div className="text-[14px] font-semibold text-[var(--ink-0)]">
                  {file ? file.name : "Upload a new PDF"}
                </div>
                <p className="m-0 text-[12px] text-[var(--ink-1)]">
                  {file
                    ? continuingFrom
                      ? `Continuing from question ${continuingFrom}`
                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : "Up to 20 MB"}
                </p>
              </span>
            </button>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--ink-1)]">
              Number of questions (max {MAX_QUESTIONS_PER_BATCH})
            </label>
            <input
              type="range"
              min={1}
              max={MAX_QUESTIONS_PER_BATCH}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="mb-1 w-full accent-[var(--accent)]"
            />
            <div className="mb-4 text-[12px] text-[var(--ink-muted)]">
              {questionCount} question{questionCount === 1 ? "" : "s"}
              {continuingFrom ? ` (starting from #${continuingFrom})` : ""}
            </div>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--ink-1)]">
              Subject focus (optional)
            </label>
            <input
              type="text"
              value={subjectHint}
              onChange={(e) => setSubjectHint(e.target.value)}
              placeholder="e.g. Cardiovascular pathology"
              className="mb-5 w-full rounded-xl border border-[var(--line)] bg-black/[0.03] px-3.5 py-3 text-[14px] text-[var(--ink-0)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
            />

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgba(214,69,69,0.35)] bg-[rgba(214,69,69,0.08)] p-3 text-[12.5px] text-[var(--danger)]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] py-[16px] text-[15px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,var(--accent),var(--accent-2))",
                boxShadow: "0 14px 30px -10px rgba(46,139,87,0.40)",
              }}
            >
              <Sparkles size={17} />
              {mode === "extract" ? "Extract" : "Generate"} {questionCount} question
              {questionCount === 1 ? "" : "s"}
            </button>
          </>
        )}

        {stage === "pipeline" && (
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

        {stage === "preview" && (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[rgba(46,139,87,0.3)] bg-[rgba(46,139,87,0.08)] p-3.5 text-[13px] text-[var(--ink-0)]">
              <CheckCircle2 size={17} className="shrink-0 text-[var(--ok)]" />
              <span>
                <strong>{flagged.length}</strong> question{flagged.length === 1 ? "" : "s"}{" "}
                generated — <strong>{included.size}</strong> selected to add.
              </span>
            </div>

            {duplicateCount > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgba(201,138,18,0.35)] bg-[rgba(201,138,18,0.08)] p-3.5 text-[12.5px] text-[var(--ink-1)]">
                <Copy size={16} className="mt-0.5 shrink-0 text-[var(--amber)]" />
                <span>
                  <strong className="text-[var(--ink-0)]">{duplicateCount}</strong> look
                  {duplicateCount === 1 ? "s" : ""} like a duplicate of a question you already
                  have — unchecked by default. Check the box to include one anyway.
                </span>
              </div>
            )}

            <div className="mb-5 max-h-[320px] overflow-y-auto rounded-xl border border-[var(--line)] bg-black/[0.02] p-3">
              {flagged.map((f, i) => (
                <label
                  key={f.question.id}
                  className="flex cursor-pointer items-start gap-2.5 border-b border-[var(--line)] py-2.5 text-[12.5px] last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={included.has(i)}
                    onChange={() => toggleIncluded(i)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className={f.isDuplicate ? "text-[var(--ink-muted)]" : "text-[var(--ink-1)]"}>
                    <span className="font-semibold text-[var(--ink-0)]">
                      {i + 1}. {f.question.system}
                    </span>{" "}
                    {f.isDuplicate && (
                      <span className="text-[var(--amber)]">(possible duplicate) </span>
                    )}
                    — {f.question.vignette.slice(0, 70)}…
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setStage("setup")}
                className="flex-1 rounded-xl border border-[var(--line)] bg-black/[0.03] py-3 text-[13.5px] font-semibold text-[var(--ink-1)] hover:bg-black/[0.05]"
              >
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={included.size === 0}
                className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-[13.5px] font-bold text-white hover:opacity-90 disabled:opacity-40"
              >
                Add {included.size} Question{included.size === 1 ? "" : "s"} as New Module
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

