"use client";

import { ChevronLeft, ChevronRight, Flag, Calculator, Notebook } from "lucide-react";

interface ExamFooterProps {
  flagged: boolean;
  onToggleFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitted: boolean;
  hasSelection: boolean;
}

export default function ExamFooter({
  flagged,
  onToggleFlag,
  onPrevious,
  onNext,
  onSubmit,
  submitted,
  hasSelection,
}: ExamFooterProps) {
  return (
    <footer className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--bg-1)] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-black/[0.03] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-1)] transition hover:bg-black/[0.06] hover:text-[var(--ink-0)]"
        >
          <ChevronLeft size={15} />
          Previous
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-black/[0.03] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-1)] transition hover:bg-black/[0.06] hover:text-[var(--ink-0)]"
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-black/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-1)] transition hover:bg-black/[0.06] hover:text-[var(--ink-0)]"
          title="Notes"
        >
          <Notebook size={14} />
          <span className="hidden sm:inline">Notes</span>
        </button>
        <button
          className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-black/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-1)] transition hover:bg-black/[0.06] hover:text-[var(--ink-0)]"
          title="Calculator"
        >
          <Calculator size={14} />
          <span className="hidden sm:inline">Calculator</span>
        </button>
        <button
          onClick={onToggleFlag}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition ${
            flagged
              ? "border-[rgba(255,180,84,0.4)] bg-[rgba(255,180,84,0.14)] text-[var(--amber)]"
              : "border-[var(--line)] bg-black/[0.03] text-[var(--ink-1)] hover:bg-black/[0.06] hover:text-[var(--ink-0)]"
          }`}
        >
          <Flag size={14} fill={flagged ? "currentColor" : "none"} />
          <span className="hidden sm:inline">{flagged ? "Flagged" : "Flag"}</span>
        </button>

        <button
          onClick={onSubmit}
          disabled={submitted || !hasSelection}
          className={`rounded-xl px-5 py-1.5 text-[13px] font-bold shadow-sm transition ${
            submitted
              ? "cursor-not-allowed bg-black/[0.045] text-[var(--ink-muted)]"
              : hasSelection
              ? "bg-[var(--accent)] text-white hover:opacity-90"
              : "cursor-not-allowed bg-black/[0.045] text-[var(--ink-muted)]"
          }`}
        >
          {submitted ? "Answer Submitted" : "Submit Answer"}
        </button>
      </div>
    </footer>
  );
}

