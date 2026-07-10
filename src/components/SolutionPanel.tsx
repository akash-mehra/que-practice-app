"use client";

import { useState } from "react";
import { BookOpenCheck, CheckCircle2, XCircle, ZoomIn, Sparkles, Loader2, AlertCircle } from "lucide-react";
import type { QuestionOption, QuestionSolution } from "@/types/question";
import { NO_EXPLANATION_PLACEHOLDER } from "@/lib/importQuestions";
import { generateExplanation } from "@/lib/explainQuestion";
import { loadGeminiKey } from "@/lib/qbank";
import ImageZoomModal from "./ImageZoomModal";

interface SolutionPanelProps {
  vignette: string;
  options: QuestionOption[];
  solution: QuestionSolution;
  onExplained: (newSolution: QuestionSolution) => void;
  onNeedsApiKey: () => void;
}

export default function SolutionPanel({
  vignette,
  options,
  solution,
  onExplained,
  onNeedsApiKey,
}: SolutionPanelProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const correctOption = options.find((o) => o.isCorrect);

  const isPlaceholder = solution.main_rationale === NO_EXPLANATION_PLACEHOLDER;

  const handleGenerateExplanation = async () => {
    setGenError(null);
    const apiKey = loadGeminiKey();
    if (!apiKey) {
      onNeedsApiKey();
      return;
    }
    setGenerating(true);
    try {
      const newSolution = await generateExplanation(apiKey, vignette, options);
      onExplained(newSolution);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border-t border-[var(--line)] bg-[var(--bg-0)] px-6 py-6 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center gap-2">
          <BookOpenCheck className="text-[var(--accent-2)]" size={20} />
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink-0)]">
            Answer &amp; Explanation
          </h2>
          {correctOption && (
            <span className="ml-auto rounded-full bg-[rgba(74,222,156,0.14)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ok)]">
              Correct Answer: {correctOption.letter}
            </span>
          )}
        </div>

        {isPlaceholder ? (
          <div className="mb-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-black/[0.02] p-5 text-center">
            <p className="mb-3.5 text-[13.5px] text-[var(--ink-1)]">
              This question was imported without an explanation.
            </p>
            <button
              onClick={handleGenerateExplanation}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg,var(--accent),var(--accent-2))",
                boxShadow: "0 10px 24px -10px rgba(46,139,87,0.40)",
              }}
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {generating ? "Generating…" : "Generate AI Explanation"}
            </button>
            {genError && (
              <div className="mx-auto mt-3.5 flex max-w-md items-start gap-2 rounded-xl border border-[rgba(214,69,69,0.35)] bg-[rgba(214,69,69,0.08)] p-3 text-left text-[12.5px] text-[var(--danger)]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{genError}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Educational Objective callout — glass gradient card */}
            <div
              className="mb-6 rounded-[var(--radius-lg)] p-5"
              style={{
                background:
                  "linear-gradient(155deg, rgba(46,139,87,0.10), rgba(21,152,149,0.06))",
                border: "1px solid rgba(46,139,87,0.28)",
                boxShadow: "0 18px 40px -26px rgba(46,139,87,0.40)",
              }}
            >
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-2)]">
                Educational Objective
              </p>
              <p className="text-[14px] leading-relaxed text-[var(--ink-0)]">
                {solution.educational_objective}
              </p>
            </div>

            {/* Main rationale */}
            <div className="mb-6">
              <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-[var(--ink-1)]">
                {solution.main_rationale}
              </p>
            </div>
          </>
        )}

        {/* Explanation graphic */}
        {solution.explanation_image && (
          <div className="mb-8 flex flex-col items-center">
            <button
              onClick={() => setZoomOpen(true)}
              className="group relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={solution.explanation_image}
                alt="Explanation graphic"
                className="max-h-80 max-w-full object-cover transition group-hover:opacity-90"
              />
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                <ZoomIn size={13} />
                Click to enlarge
              </span>
            </button>
            <p className="mt-1.5 text-center text-[11px] italic text-[var(--ink-muted)]">
              Figure 2. Gross pathology correlating with the diagnosis above.
            </p>
          </div>
        )}

        {/* Option breakdown matrix */}
        {!isPlaceholder && (
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              Answer Choice Review
            </p>
            <div className="flex flex-col gap-3">
              {options.map((opt) => (
                <div
                  key={opt.letter}
                  className={`rounded-[var(--radius-md)] border px-4 py-3.5 ${
                    opt.isCorrect
                      ? "border-[rgba(74,222,156,0.35)] bg-[rgba(74,222,156,0.06)]"
                      : "border-[var(--line)] bg-black/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {opt.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--ok)]" size={17} />
                    ) : (
                      <XCircle className="mt-0.5 shrink-0 text-[var(--ink-2)]" size={17} />
                    )}
                    <div>
                      <p className="text-[13.5px] font-semibold text-[var(--ink-0)]">
                        {opt.letter}. {opt.text}
                      </p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink-1)]">
                        {opt.isCorrect
                          ? "This is the correct answer — see the full rationale above."
                          : solution.incorrect_rationales[opt.letter] ??
                            "Rationale not available for this choice."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {zoomOpen && solution.explanation_image && (
        <ImageZoomModal
          src={solution.explanation_image}
          alt="Explanation graphic enlarged"
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}

