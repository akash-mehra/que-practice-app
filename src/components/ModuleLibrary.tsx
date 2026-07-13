"use client";

import { ChevronLeft, ChevronRight, Layers, Clock } from "lucide-react";
import type { Module } from "@/types/question";

interface ModuleLibraryProps {
  modules: Module[];
  onSelectModule: (module: Module) => void;
  onGoHome: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ModuleLibrary({ modules, onSelectModule, onGoHome }: ModuleLibraryProps) {
  return (
    <div className="flex h-screen w-full flex-col overflow-y-auto bg-[var(--bg-0)] px-[22px] py-6 font-sans text-[var(--ink-0)]">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onGoHome}
          aria-label="Back to home"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-black/[0.03] text-[var(--ink-1)] hover:bg-black/[0.06] hover:text-[var(--ink-0)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[22px] font-bold text-[var(--ink-0)]">
            Module Library
          </h1>
          <p className="text-[12.5px] text-[var(--ink-1)]">
            {modules.length} module{modules.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Layers size={36} className="mb-3 text-[var(--ink-2)]" />
          <p className="text-[14px] font-semibold text-[var(--ink-0)]">No modules yet</p>
          <p className="mt-1 max-w-xs text-[12.5px] text-[var(--ink-1)]">
            Generate or import a batch of questions from the home screen — each batch
            automatically becomes its own module here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modules
            .slice()
            .reverse()
            .map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectModule(m)}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--line)] bg-black/[0.03] p-4 text-left transition hover:bg-black/[0.05]"
              >
                <span>
                  <div className="text-[15.5px] font-bold text-[var(--ink-0)]">{m.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
                    {formatDate(m.createdAt)}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[12px] text-[var(--ink-1)]">
                    <span>
                      {m.questionIds.length} question{m.questionIds.length === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {m.timerMinutes} min
                    </span>
                  </div>
                </span>
                <ChevronRight size={18} className="shrink-0 text-[var(--ink-muted)]" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

