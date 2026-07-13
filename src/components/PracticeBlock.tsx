"use client";

import { useState } from "react";
import type { PracticeQuestion, QuestionProgress, QuestionSolution } from "@/types/question";
import { loadProgress, saveProgress } from "@/lib/qbank";
import ExamHeader from "./ExamHeader";
import ExamFooter from "./ExamFooter";
import VignettePanel from "./VignettePanel";
import OptionsPanel from "./OptionsPanel";
import SolutionPanel from "./SolutionPanel";
import LabValuesModal from "./LabValuesModal";
import SettingsModal from "./SettingsModal";

interface PracticeBlockProps {
  questions: PracticeQuestion[];
  startIndex?: number;
  onGoHome?: () => void;
  onQuestionUpdated?: (id: string, solution: QuestionSolution) => void;
  moduleName?: string;
  timerMinutes?: number;
}

const emptyProgress: QuestionProgress = {
  selected: null,
  submitted: false,
  flagged: false,
  blockEnded: false,
};

export default function PracticeBlock({
  questions,
  startIndex = 0,
  onGoHome,
  onQuestionUpdated,
  moduleName,
  timerMinutes,
}: PracticeBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(startIndex, 0), Math.max(questions.length - 1, 0))
  );
  const question = questions[currentIndex];

  // Lazily hydrated from localStorage once — safe under static export because
  // loadProgress() itself no-ops on the server (no `window`).
  const [allProgress, setAllProgress] = useState<Record<string, QuestionProgress>>(() =>
    loadProgress()
  );
  const [tutorMode, setTutorMode] = useState(true);
  const [labValuesOpen, setLabValuesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Strike-through marks are intentionally session-only (not persisted) and
  // must reset whenever the active question changes. Rather than an effect,
  // this follows React's documented "adjust state during render" pattern:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [struckOut, setStruckOut] = useState<Set<string>>(new Set());
  const [struckOutForId, setStruckOutForId] = useState<string | undefined>(question?.id);
  if (question && question.id !== struckOutForId) {
    setStruckOutForId(question.id);
    setStruckOut(new Set());
  }

  const progressFor = question ? allProgress[question.id] ?? emptyProgress : emptyProgress;
  const { selected, submitted, flagged, blockEnded } = progressFor;

  const updateProgress = (patch: Partial<QuestionProgress>) => {
    if (!question) return;
    setAllProgress((prev) => {
      const nextEntry = { ...(prev[question.id] ?? emptyProgress), ...patch };
      const next = { ...prev, [question.id]: nextEntry };
      saveProgress(next);
      return next;
    });
  };

  const showSolution = tutorMode ? submitted : submitted && blockEnded;

  const handleSelect = (letter: string) => {
    if (submitted) return;
    updateProgress({ selected: letter });
  };

  const handleToggleStrike = (letter: string) => {
    setStruckOut((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!selected) return;
    updateProgress({ submitted: true });
  };

  const goToIndex = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    setCurrentIndex(i);
  };

  if (!question) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--bg-0)] px-6 text-center text-[var(--ink-1)]">
        <p>No questions in your qbank yet.</p>
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="mt-4 rounded-xl bg-[var(--accent)] px-5 py-2 text-[13px] font-semibold text-white"
          >
            Back to home
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--bg-0)] font-sans">
      <ExamHeader
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        system={question.system}
        discipline={question.discipline}
        tutorMode={tutorMode}
        onToggleTutorMode={() => setTutorMode((v) => !v)}
        onOpenLabValues={() => setLabValuesOpen(true)}
        onGoHome={onGoHome}
        timerMinutes={timerMinutes}
        blockLabel={moduleName ? `${moduleName} · USMLE Step 1 Practice` : undefined}
      />

      <main className={`flex flex-1 flex-col ${showSolution ? "overflow-y-auto" : "overflow-hidden"}`}>
        <div
          className={`grid grid-cols-1 grid-rows-2 overflow-hidden md:grid-cols-2 md:grid-rows-1 ${
            showSolution ? "h-[52vh] shrink-0 md:h-[56vh]" : "flex-1"
          }`}
        >
          <div className="min-h-0 overflow-hidden border-b border-[var(--line)] md:border-b-0 md:border-r">
            <VignettePanel
              vignette={question.vignette}
              vignetteImage={question.vignette_image}
              flagged={flagged}
              onToggleFlag={() => updateProgress({ flagged: !flagged })}
            />
          </div>
          <div className="min-h-0 overflow-hidden">
            <OptionsPanel
              options={question.options}
              selected={selected}
              struckOut={struckOut}
              submitted={submitted}
              revealAnswer={showSolution}
              onSelect={handleSelect}
              onToggleStrike={handleToggleStrike}
            />
          </div>
        </div>

        {submitted && !tutorMode && !blockEnded && (
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--line)] bg-[var(--bg-1)] px-6 py-4">
            <p className="text-[13px] text-[var(--ink-1)]">
              Your answer has been recorded. Since Tutor Mode is off, rationale is withheld
              until the block ends — just like a real timed NBME-style board exam block.
            </p>
            <button
              onClick={() => updateProgress({ blockEnded: true })}
              className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
            >
              End Block &amp; Review
            </button>
          </div>
        )}

        {showSolution && (
          <div className="shrink-0">
            <SolutionPanel
              vignette={question.vignette}
              options={question.options}
              solution={question.solution}
              onExplained={(newSolution) => onQuestionUpdated?.(question.id, newSolution)}
              onNeedsApiKey={() => setSettingsOpen(true)}
            />
          </div>
        )}
      </main>

      <ExamFooter
        flagged={flagged}
        onToggleFlag={() => updateProgress({ flagged: !flagged })}
        onPrevious={() => goToIndex(currentIndex - 1)}
        onNext={() => goToIndex(currentIndex + 1)}
        onSubmit={handleSubmit}
        submitted={submitted}
        hasSelection={!!selected}
      />

      {labValuesOpen && <LabValuesModal onClose={() => setLabValuesOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

