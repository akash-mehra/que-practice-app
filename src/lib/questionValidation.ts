import type { PracticeQuestion, QuestionOption } from "@/types/question";

function isValidOption(o: unknown): o is QuestionOption {
  if (typeof o !== "object" || o === null) return false;
  const opt = o as Record<string, unknown>;
  return (
    typeof opt.letter === "string" &&
    typeof opt.text === "string" &&
    typeof opt.isCorrect === "boolean"
  );
}

export interface ValidationError {
  index: number;
  reason: string;
}

export interface ValidationResult {
  valid: PracticeQuestion[];
  errors: ValidationError[];
}

/**
 * Validates and normalizes a raw array of unknown items into PracticeQuestion
 * objects, matching the exact schema used across the app (Gemini generation,
 * JSON/TS import, and the seed data). Shared so every entry point into the
 * qbank enforces the same rules and the same error messages.
 */
export function validateQuestions(raw: unknown[], idPrefix: string): ValidationResult {
  const valid: PracticeQuestion[] = [];
  const errors: ValidationError[] = [];

  raw.forEach((item, i) => {
    if (typeof item !== "object" || item === null) {
      errors.push({ index: i, reason: "Not an object." });
      return;
    }
    const q = item as Record<string, unknown>;

    if (typeof q.vignette !== "string" || !q.vignette.trim()) {
      errors.push({ index: i, reason: "Missing or empty \"vignette\" text." });
      return;
    }
    if (!Array.isArray(q.options) || q.options.length < 4) {
      errors.push({ index: i, reason: "\"options\" must be an array of at least 4 choices." });
      return;
    }
    if (!q.options.every(isValidOption)) {
      errors.push({
        index: i,
        reason: "Each option needs a \"letter\", \"text\", and boolean \"isCorrect\".",
      });
      return;
    }
    const options = q.options as QuestionOption[];
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      errors.push({
        index: i,
        reason: `Exactly one option must have isCorrect: true (found ${correctCount}).`,
      });
      return;
    }

    const solutionRaw = q.solution as Record<string, unknown> | undefined;
    if (!solutionRaw || typeof solutionRaw.main_rationale !== "string" || !solutionRaw.main_rationale.trim()) {
      errors.push({ index: i, reason: "Missing \"solution.main_rationale\"." });
      return;
    }

    const providedId = typeof q.id === "string" && q.id.trim() ? q.id.trim() : undefined;

    valid.push({
      id: providedId ?? `${idPrefix}-${Date.now()}-${i}`,
      system: typeof q.system === "string" && q.system ? q.system : "General",
      discipline: typeof q.discipline === "string" && q.discipline ? q.discipline : "Pathology",
      vignette: q.vignette as string,
      vignette_image:
        typeof q.vignette_image === "string" && q.vignette_image ? q.vignette_image : undefined,
      options,
      solution: {
        educational_objective:
          typeof solutionRaw.educational_objective === "string"
            ? solutionRaw.educational_objective
            : "",
        explanation_image:
          typeof solutionRaw.explanation_image === "string" && solutionRaw.explanation_image
            ? solutionRaw.explanation_image
            : undefined,
        main_rationale: solutionRaw.main_rationale as string,
        incorrect_rationales:
          typeof solutionRaw.incorrect_rationales === "object" &&
          solutionRaw.incorrect_rationales !== null
            ? (solutionRaw.incorrect_rationales as Record<string, string>)
            : {},
      },
    });
  });

  return { valid, errors };
}

