"use client";

import { useState } from "react";
import { X, KeyRound, Trash2, Layers, AlertTriangle } from "lucide-react";
import { loadGeminiKey, saveGeminiKey, clearGeminiKey } from "@/lib/qbank";
import type { Module } from "@/types/question";

interface SettingsModalProps {
  onClose: () => void;
  modules?: Module[];
  onDeleteModule?: (id: string) => void;
}

export default function SettingsModal({ onClose, modules = [], onDeleteModule }: SettingsModalProps) {
  const [key, setKey] = useState(loadGeminiKey());
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleSave = () => {
    saveGeminiKey(key);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleClear = () => {
    clearGeminiKey();
    setKey("");
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteModule?.(id);
    setConfirmingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(6,4,12,0.65)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] border border-b-0 border-[var(--glass-border)] bg-[var(--bg-1)] px-[22px] pb-8 pt-3.5"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--ink-0)]">
            Developer Settings
          </h3>
          <button onClick={onClose} className="text-[var(--ink-muted)] hover:text-[var(--ink-0)]">
            <X size={20} />
          </button>
        </div>

        <label className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink-1)]">
          <KeyRound size={14} />
          Gemini API Key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza…"
          className="w-full rounded-xl border border-[var(--line)] bg-black/[0.03] px-3.5 py-3 text-[14px] text-[var(--ink-0)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
        />

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-[13.5px] font-bold text-white hover:opacity-90"
          >
            {savedFlash ? "Saved ✓" : "Save Key"}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-black/[0.03] px-4 py-3 text-[13.5px] font-semibold text-[var(--ink-1)] hover:bg-black/[0.06]"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
          Your Gemini API key (used for generating new questions from PDFs) is stored only in
          this browser&apos;s local storage — it is never sent to any server other than
          Google&apos;s Gemini API directly.
        </p>

        {/* Module management */}
        <div className="mt-7 border-t border-[var(--line)] pt-5">
          <label className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink-1)]">
            <Layers size={14} />
            Manage Modules
          </label>

          {modules.length === 0 ? (
            <p className="text-[12.5px] text-[var(--ink-muted)]">No modules yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-[var(--line)] bg-black/[0.02] p-3"
                >
                  {confirmingId === m.id ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                      <div className="flex-1">
                        <p className="text-[12.5px] font-semibold text-[var(--ink-0)]">
                          Delete {m.name} and its {m.questionIds.length} question
                          {m.questionIds.length === 1 ? "" : "s"}?
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
                          This can&apos;t be undone, including any AI explanations saved for
                          these questions.
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => handleConfirmDelete(m.id)}
                            className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90"
                          >
                            Delete permanently
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-1)] hover:bg-black/[0.04]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>
                        <div className="text-[13px] font-semibold text-[var(--ink-0)]">
                          {m.name}
                        </div>
                        <div className="text-[11.5px] text-[var(--ink-muted)]">
                          {m.questionIds.length} question{m.questionIds.length === 1 ? "" : "s"}
                        </div>
                      </span>
                      <button
                        onClick={() => setConfirmingId(m.id)}
                        aria-label={`Delete ${m.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[rgba(214,69,69,0.1)] hover:text-[var(--danger)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

