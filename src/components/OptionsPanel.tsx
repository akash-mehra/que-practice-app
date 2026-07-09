"use client";

import { Check, X, Undo2 } from "lucide-react";
import type { QuestionOption } from "@/types/question";

interface OptionsPanelProps {
  options: QuestionOption[];
  selected: string | null;
  struckOut: Set<string>;
  submitted: boolean;
  revealAnswer: boolean;
  onSelect: (letter: string) => void;
  onToggleStrike: (letter: string) => void;
}

export default function OptionsPanel({
  options,
  selected,
  struckOut,
  submitted,
  revealAnswer,
  onSelect,
  onToggleStrike,
}: OptionsPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--bg-1)] px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
          Select the best answer
        </span>
        {struckOut.size > 0 && !submitted && (
          <span className="text-[11px] text-[var(--ink-muted)]">
            Right-click an option to strike it out
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {options.map((opt) => {
          const isSelected = selected === opt.letter;
          const isStruck = struckOut.has(opt.letter);
          const showAnswerState = revealAnswer;
          const isCorrectAnswer = opt.isCorrect;

          let stateClasses =
            "border-[var(--line)] bg-black/[0.02] hover:border-[var(--glass-border)] hover:bg-black/[0.045]";

          if (showAnswerState) {
            if (isCorrectAnswer) {
              stateClasses = "border-[var(--ok)] bg-[rgba(74,222,156,0.1)]";
            } else if (isSelected && !isCorrectAnswer) {
              stateClasses = "border-[var(--danger)] bg-[rgba(255,107,107,0.1)]";
            } else {
              stateClasses = "border-[var(--line)] bg-black/[0.015] opacity-60";
            }
          } else if (isSelected) {
            stateClasses = "border-[var(--accent)] bg-[rgba(46,139,87,0.10)] ring-1 ring-[var(--accent)]";
          }

          return (
            <div key={opt.letter} className="relative">
              <button
                disabled={submitted}
                onClick={() => onSelect(opt.letter)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!submitted) onToggleStrike(opt.letter);
                }}
                className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left text-[14px] transition ${stateClasses} ${
                  submitted ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold ${
                    showAnswerState && isCorrectAnswer
                      ? "border-[var(--ok)] bg-[var(--ok)] text-[#0b2b22]"
                      : showAnswerState && isSelected && !isCorrectAnswer
                      ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                      : isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--ink-2)] bg-transparent text-[var(--ink-1)]"
                  }`}
                >
                  {showAnswerState && isCorrectAnswer ? (
                    <Check size={13} />
                  ) : showAnswerState && isSelected && !isCorrectAnswer ? (
                    <X size={13} />
                  ) : (
                    opt.letter
                  )}
                </span>
                <span
                  className={`pt-0.5 ${
                    isStruck && !submitted
                      ? "text-[var(--ink-muted)] line-through opacity-60"
                      : "text-[var(--ink-0)]"
                  }`}
                >
                  {opt.text}
                </span>
              </button>

              {isStruck && !submitted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStrike(opt.letter);
                  }}
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[var(--bg-2)]/90 px-1.5 py-0.5 text-[10px] text-[var(--ink-muted)] shadow-sm hover:text-[var(--ink-1)]"
                  title="Undo strike-through"
                >
                  <Undo2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <p className="mt-4 text-[11px] leading-relaxed text-[var(--ink-muted)]">
          Tip: right-click any answer choice to cross out distractors you&apos;ve eliminated.
        </p>
      )}
    </div>
  );
}

