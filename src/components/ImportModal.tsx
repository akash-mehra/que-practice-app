"use client";

import { useRef, useState } from "react";
import { X, FileJson, Upload, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { parseQuestionsInput } from "@/lib/importQuestions";
import { validateQuestions, type ValidationError } from "@/lib/questionValidation";
import type { PracticeQuestion } from "@/types/question";

interface ImportModalProps {
  onClose: () => void;
  onImported: (questions: PracticeQuestion[]) => void;
}

type Stage = "input" | "preview" | "done";

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [validQuestions, setValidQuestions] = useState<PracticeQuestion[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleFilePick = async (file: File) => {
    setFileName(file.name);
    const content = await file.text();
    setText(content);
  };

  const handlePreview = () => {
    setError(null);
    try {
      const raw = parseQuestionsInput(text);
      const { valid, errors } = validateQuestions(raw, "import");
      if (valid.length === 0) {
        setError(
          errors.length > 0
            ? `None of the ${raw.length} item(s) matched the required schema. First issue: ${errors[0].reason}`
            : "No questions found in that input."
        );
        return;
      }
      setValidQuestions(valid);
      setValidationErrors(errors);
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong parsing that input.");
    }
  };

  const handleConfirmImport = () => {
    onImported(validQuestions);
    setImportedCount(validQuestions.length);
    setStage("done");
  };

  if (stage === "done" && importedCount !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,4,12,0.72)] p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--bg-1)] p-7 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-[var(--ok)]" />
          <h3 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--ink-0)]">
            {importedCount} question{importedCount === 1 ? "" : "s"} imported
          </h3>
          <p className="mt-1.5 text-[13px] text-[var(--ink-1)]">
            Added to your local qbank and ready to practice.
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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] border border-b-0 border-[var(--glass-border)] bg-[var(--bg-1)] px-[22px] pb-8 pt-3.5"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--ink-0)]">
            <FileJson size={18} className="text-[var(--accent-2)]" />
            Import Questions
          </h3>
          <button onClick={onClose} className="text-[var(--ink-muted)] hover:text-[var(--ink-0)]">
            <X size={20} />
          </button>
        </div>

        {stage === "input" && (
          <>
            <p className="mb-4 text-[13px] leading-relaxed text-[var(--ink-1)]">
              Already have questions from another tool? Upload or paste a JSON array matching
              our schema — a plain array of question objects, optionally wrapped in a
              &nbsp;<code className="rounded bg-black/[0.05] px-1 py-0.5 text-[12px]">const x = [...]</code>&nbsp;
              declaration if it came out of a TypeScript file.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.ts,.txt,application/json,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFilePick(f);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--line)] bg-black/[0.02] p-4 text-left hover:bg-black/[0.035]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(46,139,87,0.14)] text-[var(--accent)]">
                <Upload size={20} />
              </span>
              <span>
                <div className="text-[14px] font-semibold text-[var(--ink-0)]">
                  {fileName ? fileName : "Upload a .json or .ts file"}
                </div>
                <p className="m-0 text-[12px] text-[var(--ink-1)]">
                  {fileName ? "Tap to choose a different file" : "Or paste directly below"}
                </p>
              </span>
            </button>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--ink-1)]">
              Paste question data
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileName(null);
              }}
              rows={8}
              placeholder='[{"system": "Cardiovascular", "vignette": "...", "options": [...], "solution": {...}}]'
              className="mb-4 w-full resize-none rounded-xl border border-[var(--line)] bg-black/[0.03] px-3.5 py-3 font-mono text-[12.5px] text-[var(--ink-0)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
            />

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[rgba(214,69,69,0.35)] bg-[rgba(214,69,69,0.08)] p-3 text-[12.5px] text-[var(--danger)]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={!text.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] py-[16px] text-[15px] font-bold text-white disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg,var(--accent),var(--accent-2))",
                boxShadow: "0 14px 30px -10px rgba(46,139,87,0.40)",
              }}
            >
              <FileJson size={17} />
              Preview
            </button>
          </>
        )}

        {stage === "preview" && (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[rgba(46,139,87,0.3)] bg-[rgba(46,139,87,0.08)] p-3.5 text-[13px] text-[var(--ink-0)]">
              <CheckCircle2 size={17} className="shrink-0 text-[var(--ok)]" />
              <span>
                <strong>{validQuestions.length}</strong> question
                {validQuestions.length === 1 ? "" : "s"} ready to import.
              </span>
            </div>

            {validationErrors.length > 0 && (
              <div className="mb-4 rounded-xl border border-[rgba(201,138,18,0.35)] bg-[rgba(201,138,18,0.08)] p-3.5">
                <button
                  onClick={() => setShowErrors((v) => !v)}
                  className="flex w-full items-center justify-between text-left text-[13px] font-semibold text-[var(--amber)]"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    {validationErrors.length} item{validationErrors.length === 1 ? "" : "s"}{" "}
                    skipped
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showErrors ? "rotate-180" : ""}`}
                  />
                </button>
                {showErrors && (
                  <ul className="mt-2.5 space-y-1.5 text-[12px] text-[var(--ink-1)]">
                    {validationErrors.slice(0, 20).map((e) => (
                      <li key={e.index}>
                        Item {e.index + 1}: {e.reason}
                      </li>
                    ))}
                    {validationErrors.length > 20 && (
                      <li>…and {validationErrors.length - 20} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            <div className="mb-5 max-h-[220px] overflow-y-auto rounded-xl border border-[var(--line)] bg-black/[0.02] p-3">
              {validQuestions.slice(0, 30).map((q, i) => (
                <div
                  key={q.id}
                  className="border-b border-[var(--line)] py-2 text-[12.5px] text-[var(--ink-1)] last:border-b-0"
                >
                  <span className="font-semibold text-[var(--ink-0)]">
                    {i + 1}. {q.system}
                  </span>{" "}
                  — {q.vignette.slice(0, 70)}…
                </div>
              ))}
              {validQuestions.length > 30 && (
                <div className="pt-2 text-[12px] text-[var(--ink-muted)]">
                  …and {validQuestions.length - 30} more
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setStage("input")}
                className="flex-1 rounded-xl border border-[var(--line)] bg-black/[0.03] py-3 text-[13.5px] font-semibold text-[var(--ink-1)] hover:bg-black/[0.05]"
              >
                Back
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-[2] rounded-xl bg-[var(--accent)] py-3 text-[13.5px] font-bold text-white hover:opacity-90"
              >
                Add {validQuestions.length} Question{validQuestions.length === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

