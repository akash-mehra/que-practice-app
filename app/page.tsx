"use client";

import { useEffect, useMemo, useState } from "react";
import PracticeBlock from "@/components/PracticeBlock";
import HomeScreen from "@/components/HomeScreen";
import ModuleLibrary from "@/components/ModuleLibrary";
import LabValuesModal from "@/components/LabValuesModal";
import GenerateModal from "@/components/GenerateModal";
import SettingsModal from "@/components/SettingsModal";
import ImportModal from "@/components/ImportModal";
import seedQuestions from "@/data/questions.json";
import type { Module, PracticeQuestion, QuestionProgress, QuestionSolution } from "@/types/question";
import {
  loadQBank,
  appendToQBank,
  updateQuestionInQBank,
  loadProgress,
  loadModules,
  createModule,
  deleteModule,
} from "@/lib/qbank";

type Screen = "home" | "block" | "moduleLibrary";
type Overlay = "labValues" | "generate" | "settings" | "import" | null;

export default function Home() {
  const seed = seedQuestions as PracticeQuestion[];

  const [questions, setQuestions] = useState<PracticeQuestion[]>(seed);
  const [progress, setProgress] = useState<Record<string, QuestionProgress>>({});
  const [modules, setModules] = useState<Module[]>([]);
  const [screen, setScreen] = useState<Screen>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
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
    setModules(loadModules());
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

  /** Shared by both Generate and Import: merges new questions into the qbank AND wraps them as a new Module. */
  const handleBatchAdded = (newQuestions: PracticeQuestion[], sourcePdfId?: string) => {
    if (newQuestions.length === 0) return;
    const merged = appendToQBank(questions, newQuestions);
    setQuestions(merged);
    const { modules: nextModules } = createModule(
      modules,
      newQuestions.map((q) => q.id),
      { sourcePdfId }
    );
    setModules(nextModules);
  };

  const handleQuestionUpdated = (id: string, solution: QuestionSolution) => {
    const updated = updateQuestionInQBank(questions, id, { solution });
    setQuestions(updated);
  };

  const handleDeleteModule = (moduleId: string) => {
    const result = deleteModule(modules, questions, progress, moduleId);
    setModules(result.modules);
    setQuestions(result.questions);
    setProgress(result.progress);
  };

  const handleStart = (index: number) => {
    setActiveModule(null);
    setStartIndex(index);
    setScreen("block");
  };

  const handleStartModule = (module: Module) => {
    setActiveModule(module);
    setStartIndex(0);
    setScreen("block");
  };

  if (!hydrated) {
    return <div className="h-screen w-full bg-[var(--bg-0)]" />;
  }

  // When practicing a specific module, scope the question list to just that
  // module's questions (order preserved as originally added).
  const activeQuestions = activeModule
    ? questions.filter((q) => activeModule.questionIds.includes(q.id))
    : questions;

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          nextQuestion={nextQuestion}
          totalQuestions={questions.length}
          completedCount={completedCount}
          flaggedCount={flaggedCount}
          moduleCount={modules.length}
          onStart={() => handleStart(nextIndex)}
          onOpenLabValues={() => setOverlay("labValues")}
          onOpenSettings={() => setOverlay("settings")}
          onOpenGenerate={() => setOverlay("generate")}
          onOpenImport={() => setOverlay("import")}
          onOpenModuleLibrary={() => setScreen("moduleLibrary")}
        />
      )}

      {screen === "moduleLibrary" && (
        <ModuleLibrary
          modules={modules}
          onSelectModule={handleStartModule}
          onGoHome={() => setScreen("home")}
        />
      )}

      {screen === "block" && (
        <PracticeBlock
          questions={activeQuestions}
          startIndex={startIndex}
          moduleName={activeModule?.name}
          timerMinutes={activeModule?.timerMinutes}
          onGoHome={() => {
            setProgress(loadProgress());
            setActiveModule(null);
            setScreen(activeModule ? "moduleLibrary" : "home");
          }}
          onQuestionUpdated={handleQuestionUpdated}
        />
      )}

      {overlay === "labValues" && <LabValuesModal onClose={() => setOverlay(null)} />}
      {overlay === "settings" && (
        <SettingsModal
          onClose={() => setOverlay(null)}
          modules={modules}
          onDeleteModule={handleDeleteModule}
        />
      )}
      {overlay === "generate" && (
        <GenerateModal
          onClose={() => setOverlay(null)}
          onGenerated={handleBatchAdded}
          onNeedsApiKey={() => setOverlay("settings")}
          existingQuestions={questions}
        />
      )}
      {overlay === "import" && (
        <ImportModal
          onClose={() => setOverlay(null)}
          onImported={handleBatchAdded}
          existingQuestions={questions}
        />
      )}
    </>
  );
}

