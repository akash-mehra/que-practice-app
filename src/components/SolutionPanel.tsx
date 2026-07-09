"use client";

import { useState } from "react";
import { BookOpenCheck, CheckCircle2, XCircle, ZoomIn } from "lucide-react";
import type { QuestionOption, QuestionSolution } from "@/types/question";
import ImageZoomModal from "./ImageZoomModal";

interface SolutionPanelProps {
  options: QuestionOption[];
  solution: QuestionSolution;
}

export default function SolutionPanel({ options, solution }: SolutionPanelProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const correctOption = options.find((o) => o.isCorrect);

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

