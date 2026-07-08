"use client";

import { useEffect, useState } from "react";
import { FlaskConical, GraduationCap, Clock, Home } from "lucide-react";

interface ExamHeaderProps {
  questionNumber: number;
  totalQuestions: number;
  system: string;
  discipline: string;
  tutorMode: boolean;
  onToggleTutorMode: () => void;
  onOpenLabValues: () => void;
  onGoHome?: () => void;
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

export default function ExamHeader({
  questionNumber,
  totalQuestions,
  system,
  discipline,
  tutorMode,
  onToggleTutorMode,
  onOpenLabValues,
  onGoHome,
}: ExamHeaderProps) {
  const [secondsLeft, setSecondsLeft] = useState(90 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const lowTime = secondsLeft < 300;

  return (
    <header className="flex items-center justify-between bg-[var(--bg-1)] px-4 py-2.5 border-b border-[var(--line)]">
      <div className="flex items-center gap-4">
        {onGoHome && (
          <button
            onClick={onGoHome}
            aria-label="Back to home"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-white/[0.04] text-[var(--ink-1)] transition hover:bg-white/[0.08] hover:text-[var(--ink-0)]"
          >
            <Home size={15} />
          </button>
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--ink-0)]">
            Item {questionNumber}{" "}
            <span className="text-[var(--ink-muted)] font-normal">of {totalQuestions}</span>
          </span>
          <span className="text-[11px] text-[var(--ink-muted)]">
            Block 1 &middot; USMLE Step 1 Practice
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 border-l border-[var(--line)] pl-4">
          <span className="rounded-full bg-[rgba(139,124,246,0.16)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
            {system}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-1)]">
            {discipline}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenLabValues}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-1)] transition hover:bg-white/[0.08] hover:text-[var(--ink-0)]"
        >
          <FlaskConical size={14} />
          Lab Values
        </button>

        <button
          onClick={onToggleTutorMode}
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold transition ${
            tutorMode
              ? "bg-[var(--accent-2)] text-[#0b2b22] hover:opacity-90"
              : "border border-[var(--line)] bg-white/[0.04] text-[var(--ink-1)] hover:bg-white/[0.08]"
          }`}
        >
          <GraduationCap size={14} />
          Tutor Mode: {tutorMode ? "ON" : "OFF"}
        </button>

        <div
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-mono font-semibold tabular-nums ${
            lowTime
              ? "bg-[rgba(255,107,107,0.16)] text-[var(--danger)]"
              : "bg-white/[0.06] text-[var(--ink-0)]"
          }`}
        >
          <Clock size={14} />
          {formatTime(secondsLeft)}
        </div>
      </div>
    </header>
  );
}
