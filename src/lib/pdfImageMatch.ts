/**
 * Pure matching/classification logic for associating images extracted from a
 * PDF with the questions Gemini generated from that PDF. Deliberately has no
 * dependency on pdf.js or the DOM, so it can be tested with plain data —
 * the extraction layer (pdfImageExtract.ts) is what actually reads the PDF
 * and produces the inputs this expects.
 *
 * The rule (as specified): an image belongs to whichever question's
 * stem-through-options span it falls inside. An image that falls in the gap
 * AFTER one question's options end and BEFORE the next question's stem
 * begins belongs to the NEXT question, never the previous one — that gap is
 * lead-in space for what's coming, not trailing space for what just ended.
 * A question whose span can't be confidently located contributes no matches
 * — we never guess an image onto a question we can't place.
 */

export interface ContentEvent {
  /** Sequential order this event appears in the document (text reading order). */
  order: number;
  type: "text" | "image";
  /** For text events: the raw text content. */
  text?: string;
  /** For image events: a reference back to the extracted image. */
  imageId?: string;
}

export interface QuestionSpan {
  questionId: string;
  /** order index where this question's stem begins (inclusive), or null if unlocated. */
  startOrder: number | null;
  /** order index where this question's options end (inclusive), or null if unlocated. */
  endOrder: number | null;
}

export interface MatchResult {
  matched: Record<string, string[]>; // questionId -> imageId[]
  unmatched: string[]; // imageId[]
}

/** Normalizes text for fuzzy comparison: lowercase, collapse whitespace, strip punctuation noise. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

/**
 * Finds where a question's combined text (stem + options) most plausibly
 * starts and ends within the ordered content events, using a sliding-window
 * substring search over normalized text. Returns null start/end (not a
 * best-effort guess) when no window clears the similarity threshold —
 * callers should treat that question as unlocated rather than trust a weak
 * match.
 */
export function locateQuestionSpan(
  questionId: string,
  questionText: string,
  events: ContentEvent[],
  similarityThreshold = 0.75
): QuestionSpan {
  const textEvents = events.filter((e) => e.type === "text" && e.text);
  const normalizedQuestion = normalizeText(questionText);
  if (!normalizedQuestion || textEvents.length === 0) {
    return { questionId, startOrder: null, endOrder: null };
  }

  const questionWords = normalizedQuestion.split(" ").filter(Boolean);
  if (questionWords.length === 0) {
    return { questionId, startOrder: null, endOrder: null };
  }

  const streamWords: { word: string; order: number }[] = [];
  for (const e of textEvents) {
    const norm = normalizeText(e.text!);
    for (const w of norm.split(" ").filter(Boolean)) {
      streamWords.push({ word: w, order: e.order });
    }
  }
  if (streamWords.length === 0) {
    return { questionId, startOrder: null, endOrder: null };
  }

  const qLen = questionWords.length;

  // Score every possible window of EXACTLY qLen words by POSITION-ALIGNED
  // match (word[i] in the window must match query word[i] at the same
  // relative offset) rather than unordered set overlap. This is what
  // actually distinguishes "this is a contiguous run of the right question's
  // text" from "this window happens to contain some of the same common
  // words (option letters, repeated medical terms) scattered from a
  // DIFFERENT question" — the latter scores well on set-overlap but poorly
  // on position-aligned overlap, which is exactly the failure mode this
  // guards against.
  let bestScore = 0;
  let bestStart = -1;
  const lastStart = streamWords.length - qLen;
  for (let i = 0; i <= Math.max(lastStart, 0); i++) {
    let hits = 0;
    const windowLen = Math.min(qLen, streamWords.length - i);
    for (let j = 0; j < windowLen; j++) {
      if (streamWords[i + j].word === questionWords[j]) hits++;
    }
    const score = hits / qLen;
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
    if (bestScore === 1) break; // perfect match, no need to keep scanning
  }

  if (bestScore < similarityThreshold || bestStart === -1) {
    return { questionId, startOrder: null, endOrder: null };
  }

  const bestEnd = Math.min(bestStart + qLen - 1, streamWords.length - 1);
  return {
    questionId,
    startOrder: streamWords[bestStart].order,
    endOrder: streamWords[bestEnd].order,
  };
}

/**
 * Classifies every image event against the located question spans, in
 * document order, applying the "belongs to the next question" rule for the
 * gap between one question's end and the next question's start.
 */
export function classifyImages(events: ContentEvent[], spans: QuestionSpan[]): MatchResult {
  const matched: Record<string, string[]> = {};
  const unmatched: string[] = [];

  // Only spans we could actually locate participate in matching, sorted by
  // where they start so we can find "the next located question" for any gap.
  const located = spans
    .filter((s): s is QuestionSpan & { startOrder: number; endOrder: number } =>
      s.startOrder !== null && s.endOrder !== null
    )
    .sort((a, b) => a.startOrder - b.startOrder);

  const imageEvents = events.filter((e) => e.type === "image" && e.imageId);

  for (const img of imageEvents) {
    let target: string | null = null;

    // Case 1: the image falls inside some question's own stem-to-options span.
    const inside = located.find((s) => img.order >= s.startOrder && img.order <= s.endOrder);
    if (inside) {
      target = inside.questionId;
    } else {
      // Case 2: falls in a gap -> belongs to the next question whose span
      // starts after this image, never to a question that already ended.
      const next = located.find((s) => s.startOrder > img.order);
      target = next ? next.questionId : null;
    }

    if (target) {
      if (!matched[target]) matched[target] = [];
      matched[target].push(img.imageId!);
    } else {
      unmatched.push(img.imageId!);
    }
  }

  return { matched, unmatched };
}

