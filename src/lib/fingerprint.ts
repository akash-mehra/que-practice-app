import type { PracticeQuestion } from "@/types/question";

/**
 * Normalizes vignette text for duplicate comparison: lowercase, strip
 * punctuation, collapse whitespace. Deliberately loose rather than an exact
 * hash — two extractions of "the same" question can differ by a trailing
 * period or double space, and those shouldn't count as different questions.
 */
export function normalizeForFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedId?: string;
}

/** Checks a single candidate question's vignette against an existing set. */
export function checkDuplicate(
  vignette: string,
  existing: PracticeQuestion[]
): DuplicateCheckResult {
  const fp = normalizeForFingerprint(vignette);
  if (!fp) return { isDuplicate: false };
  const match = existing.find((q) => normalizeForFingerprint(q.vignette) === fp);
  return match ? { isDuplicate: true, matchedId: match.id } : { isDuplicate: false };
}

export interface DuplicateFlaggedQuestion {
  question: PracticeQuestion;
  isDuplicate: boolean;
  matchedId?: string;
}

/**
 * Flags each candidate as duplicate/unique against the existing qbank AND
 * against earlier candidates in the same batch (so a batch that accidentally
 * contains its own internal repeats also gets caught).
 */
export function flagDuplicates(
  candidates: PracticeQuestion[],
  existing: PracticeQuestion[]
): DuplicateFlaggedQuestion[] {
  const seenInBatch: PracticeQuestion[] = [];
  return candidates.map((q) => {
    const againstExisting = checkDuplicate(q.vignette, existing);
    if (againstExisting.isDuplicate) {
      seenInBatch.push(q);
      return { question: q, isDuplicate: true, matchedId: againstExisting.matchedId };
    }
    const againstBatch = checkDuplicate(q.vignette, seenInBatch);
    seenInBatch.push(q);
    return { question: q, isDuplicate: againstBatch.isDuplicate, matchedId: againstBatch.matchedId };
  });
}

