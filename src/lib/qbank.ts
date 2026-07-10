import type { PracticeQuestion, QuestionProgress } from "@/types/question";

const QBANK_KEY = "qbank_v1";
const PROGRESS_KEY = "qbank_progress_v1";
const GEMINI_KEY_STORAGE = "qbank_gemini_api_key";

function isBrowser() {
  return typeof window !== "undefined";
}

/** Reads the full local question bank. Falls back to the given seed if nothing is stored yet. */
export function loadQBank(seed: PracticeQuestion[]): PracticeQuestion[] {
  if (!isBrowser()) return seed;
  try {
    const raw = window.localStorage.getItem(QBANK_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seed;
    return parsed as PracticeQuestion[];
  } catch {
    return seed;
  }
}

export function saveQBank(questions: PracticeQuestion[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(QBANK_KEY, JSON.stringify(questions));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.) — fail silently.
  }
}

export function appendToQBank(existing: PracticeQuestion[], newQuestions: PracticeQuestion[]) {
  const merged = [...existing, ...newQuestions];
  saveQBank(merged);
  return merged;
}

/** Replaces a single question in the qbank by id (e.g. after generating an AI explanation) and persists it. */
export function updateQuestionInQBank(
  existing: PracticeQuestion[],
  id: string,
  updates: Partial<PracticeQuestion>
): PracticeQuestion[] {
  const updated = existing.map((q) => (q.id === id ? { ...q, ...updates } : q));
  saveQBank(updated);
  return updated;
}

/** Per-question progress (selected answer, submitted state, flag), keyed by question id. */
export function loadProgress(): Record<string, QuestionProgress> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, QuestionProgress>;
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, QuestionProgress>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function loadGeminiKey(): string {
  if (!isBrowser()) return "";
  try {
    return window.localStorage.getItem(GEMINI_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function saveGeminiKey(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  } catch {
    // ignore
  }
}

export function clearGeminiKey() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {
    // ignore
  }
}

