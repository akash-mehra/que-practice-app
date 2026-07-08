import type { PracticeQuestion, QuestionOption } from "@/types/question";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export const MAX_PDF_PAGES = 300;
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB, comfortably under Gemini's inline-data limit

function buildPrompt(questionCount: number, subjectHint: string) {
  return `You are an expert USMLE Step 1 item-writer creating NBME-style multiple choice questions for a house officer preparing for a highly competitive residency entrance examination. Analyze the provided medical PDF document and write exactly ${questionCount} original, high-yield clinical vignette questions based on its content.${
    subjectHint ? ` Focus primarily on content related to: ${subjectHint}.` : ""
  }

Each question must be a realistic clinical vignette (patient age/sex, presenting complaint, relevant history, vitals/exam findings, and where appropriate a described imaging or lab result) followed by exactly 5 answer choices (A–E), exactly one of which is correct. Write a thorough explanation for the correct answer and a distinct, specific rationale for why each incorrect choice is wrong — never a generic "this is incorrect" statement.

Do not fabricate image URLs. Leave "vignette_image" and "explanation_image" as null in every question — never invent a URL.

Your output text must be clean clinical prose only — never include bracketed OCR/layout metadata such as [span_9], (start_span), or reference markers of any kind.

Format your output strictly as a raw JSON array matching this exact schema, without markdown code fences, without backticks, and without any conversational text wrapper:

[
  {
    "system": "string (e.g. Cardiovascular, Renal, Endocrine)",
    "discipline": "string (e.g. Pathology, Pharmacology, Physiology)",
    "vignette": "string — the full clinical vignette ending in a clear question stem",
    "vignette_image": null,
    "options": [
      { "letter": "A", "text": "string", "isCorrect": true },
      { "letter": "B", "text": "string", "isCorrect": false },
      { "letter": "C", "text": "string", "isCorrect": false },
      { "letter": "D", "text": "string", "isCorrect": false },
      { "letter": "E", "text": "string", "isCorrect": false }
    ],
    "solution": {
      "educational_objective": "string — one or two sentences stating the core testable fact",
      "explanation_image": null,
      "main_rationale": "string — several sentences of pathophysiology/clinical reasoning explaining the correct answer",
      "incorrect_rationales": {
        "B": "string",
        "C": "string",
        "D": "string",
        "E": "string"
      }
    }
  }
]`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.substring(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type PipelineStep = "read" | "send" | "parse" | "save";

export interface GenerateOptions {
  apiKey: string;
  file: File;
  questionCount: number;
  subjectHint: string;
  onStep?: (step: PipelineStep) => void;
}

function isValidOption(o: unknown): o is QuestionOption {
  if (typeof o !== "object" || o === null) return false;
  const opt = o as Record<string, unknown>;
  return (
    typeof opt.letter === "string" &&
    typeof opt.text === "string" &&
    typeof opt.isCorrect === "boolean"
  );
}

function validateAndNormalize(raw: unknown[], startIndex: number): PracticeQuestion[] {
  const out: PracticeQuestion[] = [];
  raw.forEach((item, i) => {
    if (typeof item !== "object" || item === null) return;
    const q = item as Record<string, unknown>;

    if (typeof q.vignette !== "string" || !q.vignette.trim()) return;
    if (!Array.isArray(q.options) || q.options.length < 4) return;
    if (!q.options.every(isValidOption)) return;
    const options = q.options as QuestionOption[];
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) return;

    const solutionRaw = q.solution as Record<string, unknown> | undefined;
    if (!solutionRaw || typeof solutionRaw.main_rationale !== "string") return;

    out.push({
      id: `gen-${Date.now()}-${startIndex + i}`,
      system: typeof q.system === "string" && q.system ? q.system : "General",
      discipline: typeof q.discipline === "string" && q.discipline ? q.discipline : "Pathology",
      vignette: q.vignette as string,
      vignette_image: undefined,
      options,
      solution: {
        educational_objective:
          typeof solutionRaw.educational_objective === "string"
            ? solutionRaw.educational_objective
            : "",
        explanation_image: undefined,
        main_rationale: solutionRaw.main_rationale as string,
        incorrect_rationales:
          typeof solutionRaw.incorrect_rationales === "object" &&
          solutionRaw.incorrect_rationales !== null
            ? (solutionRaw.incorrect_rationales as Record<string, string>)
            : {},
      },
    });
  });
  return out;
}

export async function generateQuestionsFromPdf(
  opts: GenerateOptions
): Promise<PracticeQuestion[]> {
  const { apiKey, file, questionCount, subjectHint, onStep } = opts;

  if (!apiKey) throw new Error("Add your Gemini API key in Settings first.");
  if (file.type !== "application/pdf") throw new Error("Please choose a PDF file.");
  if (file.size > MAX_PDF_BYTES) throw new Error("This PDF is too large (20 MB limit).");

  onStep?.("read");
  const base64Pdf = await fileToBase64(file);

  onStep?.("send");
  const payload = {
    contents: [
      {
        parts: [
          { text: buildPrompt(questionCount, subjectHint) },
          { inline_data: { mime_type: "application/pdf", data: base64Pdf } },
        ],
      },
    ],
    generationConfig: { temperature: 0.4 },
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();

  onStep?.("parse");
  const rawText = (data.candidates?.[0]?.content?.parts || [])
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();
  if (!rawText) throw new Error("Gemini returned an empty response.");

  let cleanText = rawText.trim();
  cleanText = cleanText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  const firstBracket = cleanText.indexOf("[");
  const lastBracket = cleanText.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1) {
    cleanText = cleanText.slice(firstBracket, lastBracket + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanText);
  } catch {
    throw new Error("Couldn't parse Gemini's response as JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini didn't return any questions.");
  }

  onStep?.("save");
  const validated = validateAndNormalize(parsed, 0);
  if (validated.length === 0) {
    throw new Error("Gemini's questions didn't match the expected format. Try again.");
  }

  return validated;
}
