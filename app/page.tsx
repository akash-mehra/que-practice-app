"use client";

import { useEffect, useMemo, useState } from "react";
import PracticeBlock from "@/components/PracticeBlock";
import HomeScreen from "@/components/HomeScreen";
import LabValuesModal from "@/components/LabValuesModal";
import GenerateModal from "@/components/GenerateModal";
import SettingsModal from "@/components/SettingsModal";
import seedQuestions from "@/data/questions.json";
import type { PracticeQuestion, QuestionProgress } from "@/types/question";
import { loadQBank, appendToQBank, loadProgress } from "@/lib/qbank";

type Screen = "home" | "block";
type Overlay = "labValues" | "generate" | "settings" | null;

export default function Home() {
  const seed = seedQuestions as PracticeQuestion[];

  const [questions, setQuestions] = useState<PracticeQuestion[]>(seed);
  const [progress, setProgress] = useState<Record<string, QuestionProgress>>({});
  const [screen, setScreen] = useState<Screen>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount (client-only, avoids SSR/export mismatch).
  // Deliberately effect-based rather than a lazy useState initializer: localStorage
  // content differs between the statically-exported server HTML and the client, so
  // loading it in an effect (after the "hydrated" placeholder paints) avoids a
  // hydration mismatch instead of just relocating it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions(loadQBank(seed));
    setProgress(loadProgress());
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = useMemo(
    () => questions.filter((q) => progress[q.id]?.submitted).length,
    [questions, progress]
  );
  const flaggedCount = useMemo(
    () => questions.filter((q) => progress[q.id]?.flagged).length,
    [questions, progress]
  );

  const nextIndex = useMemo(() => {
    const firstIncomplete = questions.findIndex((q) => !progress[q.id]?.submitted);
    return firstIncomplete === -1 ? 0 : firstIncomplete;
  }, [questions, progress]);

  const nextQuestion = questions[nextIndex] ?? questions[0];

  const handleGenerated = (newQuestions: PracticeQuestion[]) => {
    const merged = appendToQBank(questions, newQuestions);
    setQuestions(merged);
  };

  const handleStart = (index: number) => {
    setStartIndex(index);
    setScreen("block");
  };

  if (!hydrated) {
    return <div className="h-screen w-full bg-[var(--bg-0)]" />;
  }

  return (
    <>
      {screen === "home" ? (
        <HomeScreen
          nextQuestion={nextQuestion}
          totalQuestions={questions.length}
          completedCount={completedCount}
          flaggedCount={flaggedCount}
          onStart={() => handleStart(nextIndex)}
          onOpenLabValues={() => setOverlay("labValues")}
          onOpenSettings={() => setOverlay("settings")}
          onOpenGenerate={() => setOverlay("generate")}
        />
      ) : (
        <PracticeBlock
          questions={questions}
          startIndex={startIndex}
          onGoHome={() => {
            setProgress(loadProgress());
            setScreen("home");
          }}
        />
      )}

      {overlay === "labValues" && <LabValuesModal onClose={() => setOverlay(null)} />}
      {overlay === "settings" && <SettingsModal onClose={() => setOverlay(null)} />}
      {overlay === "generate" && (
        <GenerateModal
          onClose={() => setOverlay(null)}
          onGenerated={handleGenerated}
          onNeedsApiKey={() => setOverlay("settings")}
        />
      )}
    </>
  );
}
