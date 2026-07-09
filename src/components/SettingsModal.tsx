"use client";

import { useState } from "react";
import { X, KeyRound, Trash2 } from "lucide-react";
import { loadGeminiKey, saveGeminiKey, clearGeminiKey } from "@/lib/qbank";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [key, setKey] = useState(loadGeminiKey());
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    saveGeminiKey(key);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleClear = () => {
    clearGeminiKey();
    setKey("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(6,4,12,0.65)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] rounded-t-[28px] border border-b-0 border-[var(--glass-border)] bg-[var(--bg-1)] px-[22px] pb-8 pt-3.5"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />
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
      </div>
    </div>
  );
}

