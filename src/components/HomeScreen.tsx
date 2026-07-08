"use client";

import { Settings, ArrowRight, Flag, FlaskConical, BookOpenCheck, Sparkles } from "lucide-react";
import type { PracticeQuestion } from "@/types/question";

interface HomeScreenProps {
  nextQuestion: PracticeQuestion;
  totalQuestions: number;
  completedCount: number;
  flaggedCount: number;
  onStart: () => void;
  onOpenLabValues: () => void;
  onOpenSettings: () => void;
  onOpenGenerate: () => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning 👋";
  if (hour < 18) return "Good afternoon 👋";
  return "Good evening 👋";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomeScreen({
  nextQuestion,
  totalQuestions,
  completedCount,
  flaggedCount,
  onStart,
  onOpenLabValues,
  onOpenSettings,
  onOpenGenerate,
}: HomeScreenProps) {
  const teaser = nextQuestion.vignette.slice(0, 110).trim() + "…";
  const remaining = Math.max(totalQuestions - completedCount, 0);

  return (
    <div className="flex h-screen w-full flex-col overflow-y-auto bg-[var(--bg-0)] px-[22px] py-6 font-sans text-[var(--ink-0)]">
      {/* Greeting row */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {formatDate()}
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-bold tracking-tight text-[var(--ink-0)]">
            {getGreeting()}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/[0.06] text-[var(--ink-0)]"
          >
            <Settings size={19} />
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Account"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--accent)] font-[family-name:var(--font-display)] text-[15px] font-bold text-white"
          >
            A
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div
          className="rounded-[var(--radius-md)] border border-[var(--line)] p-4"
          style={{
            background:
              "linear-gradient(155deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
          }}
        >
          <div className="font-[family-name:var(--font-display)] text-[28px] font-bold leading-none text-[var(--accent-2)]">
            {completedCount}
          </div>
          <div className="mt-1.5 text-[12.5px] text-[var(--ink-1)]">Items completed</div>
        </div>
        <div
          className="rounded-[var(--radius-md)] border border-[var(--line)] p-4"
          style={{
            background:
              "linear-gradient(155deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
          }}
        >
          <div className="font-[family-name:var(--font-display)] text-[28px] font-bold leading-none text-[#ffb88c]">
            {remaining}
          </div>
          <div className="mt-1.5 text-[12.5px] text-[var(--ink-1)]">Items remaining</div>
        </div>
      </div>

      {/* Generate from PDF card */}
      <button
        onClick={onOpenGenerate}
        className="mb-3 flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/[0.05] p-4 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(91,231,196,0.14)] text-[var(--accent-2)]">
          <Sparkles size={20} />
        </span>
        <span>
          <div className="text-[15.5px] font-bold text-[var(--ink-0)]">Generate from a PDF</div>
          <p className="m-0 text-[12.5px] text-[var(--ink-1)]">
            Turn lecture notes or review PDFs into new practice questions.
          </p>
        </span>
      </button>

      {/* Lab values quick-access card */}
      <button
        onClick={onOpenLabValues}
        className="mb-4 flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/[0.05] p-4 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(139,124,246,0.16)] text-[var(--accent)]">
          <FlaskConical size={20} />
        </span>
        <span>
          <div className="text-[15.5px] font-bold text-[var(--ink-0)]">Normal Lab Values</div>
          <p className="m-0 text-[12.5px] text-[var(--ink-1)]">
            Search reference ranges before you start the block.
          </p>
        </span>
      </button>

      {/* Question of the day style card */}
      <div className="mb-5">
        <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-[var(--ink-1)]">
          <BookOpenCheck size={15} />
          Next item preview
        </div>
        <button
          onClick={onStart}
          className="relative block w-full overflow-hidden rounded-[var(--radius-lg)] border border-white/10 p-[22px] text-left"
          style={{ background: "linear-gradient(150deg,#3A2E63,#241A3F)" }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2.5 -bottom-6 select-none font-[family-name:var(--font-display)] text-[150px] font-extrabold leading-none text-white/[0.05]"
          >
            ?
          </span>
          <span className="relative inline-block rounded-full bg-[rgba(91,231,196,0.12)] px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wider text-[var(--accent-2)]">
            {nextQuestion.system}
          </span>
          <p className="relative mt-3.5 text-[18px] font-semibold leading-snug text-[var(--ink-0)]">
            {teaser}
          </p>
          <span className="relative mt-3.5 block text-[13px] text-[var(--ink-1)]">
            Tap to start the item
          </span>
        </button>
      </div>

      {/* Quick row */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={onStart}
          className="flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/[0.05] p-4 text-left"
        >
          <span className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--ink-0)]">
            <Flag size={16} className="text-[var(--amber)]" />
            {flaggedCount}
          </span>
          <span className="text-[12.5px] text-[var(--ink-1)]">Flagged items</span>
        </button>
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/[0.05] p-4">
          <span className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--ink-0)]">
            {totalQuestions}
          </span>
          <span className="text-[12.5px] text-[var(--ink-1)]">Total in qbank</span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="mt-auto flex w-full items-center justify-center gap-2.5 rounded-[20px] py-[19px] text-[16.5px] font-bold text-white"
        style={{
          background: "linear-gradient(135deg,var(--accent),#6c5ce7)",
          boxShadow: "0 14px 30px -10px rgba(139,124,246,0.55)",
        }}
      >
        <ArrowRight size={19} />
        Start Practice Block
      </button>
    </div>
  );
}
