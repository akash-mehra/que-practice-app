import type { PracticeQuestion } from "@/types/question";
import { validateQuestions } from "./questionValidation";
import { NO_EXPLANATION_PLACEHOLDER } from "./importQuestions";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export const MAX_PDF_PAGES = 300;
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB, comfortably under Gemini's inline-data limit
export const MAX_QUESTIONS_PER_BATCH = 20;

export type GenerationMode = "generate" | "extract";

const SHARED_SCHEMA_BLOCK = `Format your output strictly as a raw JSON array matching this exact schema, without markdown code fences, without backticks, and without any conversational text wrapper:

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
      "main_rationale": "string",
      "incorrect_rationales": {
        "B": "string",
        "C": "string",
        "D": "string",
        "E": "string"
      }
    }
  }
]`;

function buildGeneratePrompt(questionCount: number, subjectHint: string): string {
  return `You are an expert USMLE Step 1 item-writer creating NBME-style multiple choice questions for a house officer preparing for a highly competitive residency entrance examination. Analyze the provided medical PDF document and write exactly ${questionCount} original, high-yield clinical vignette questions based on its content.${
    subjectHint ? ` Focus primarily on content related to: ${subjectHint}.` : ""
  }

Each question must be a realistic clinical vignette (patient age/sex, presenting complaint, relevant history, vitals/exam findings, and where appropriate a described imaging or lab result) followed by exactly 5 answer choices (A–E), exactly one of which is correct. Write a thorough explanation for the correct answer and a distinct, specific rationale for why each incorrect choice is wrong — never a generic "this is incorrect" statement.

Do not fabricate image URLs. Leave "vignette_image" and "explanation_image" as null in every question — never invent a URL.

Your output text must be clean clinical prose only — never include bracketed OCR/layout metadata such as [span_9], (start_span), or reference markers of any kind.

${SHARED_SCHEMA_BLOCK}`;
}

function buildExtractPrompt(
  questionCount: number,
  subjectHint: string,
  rangeStart?: number
): string {
  const rangeInstruction =
    rangeStart && rangeStart > 1
      ? `\n\nThis document contains more questions than fit in one request, and some have already been extracted. Based on the question numbering or sequential order used in the document itself, SKIP the first ${
          rangeStart - 1
        } question(s) and extract exactly the next ${questionCount} question(s) — i.e. starting from question number ${rangeStart} in the document's own order. If the document has no explicit numbering, count sequentially from the very beginning of the document to determine where to start.`
      : `\n\nExtract the first ${questionCount} question(s) in the document's own order, starting from the beginning.`;

  return `You are digitizing a PDF that already contains real, pre-written exam questions — you are transcribing, not authoring. Extract exactly ${questionCount} question(s) from the provided PDF.${
    subjectHint ? ` Prioritize questions related to: ${subjectHint}.` : ""
  }

CRITICAL: Reproduce the vignette text and every answer option EXACTLY as written in the source document. Do NOT paraphrase, summarize, reword, or "clean up" the language — preserve the original wording, including its exact phrasing, precisely. You may only fix obvious OCR artifacts (stray characters, broken line breaks, misplaced spaces) without changing the actual wording or meaning of any sentence.

If the source document includes a written explanation/rationale for a question, transcribe that faithfully too (do not paraphrase it either). If the source has NO explanation for a given question, set "main_rationale" to exactly this string: "${NO_EXPLANATION_PLACEHOLDER}" — do not invent an explanation that isn't in the source.

Do not fabricate image URLs. Leave "vignette_image" and "explanation_image" as null in every question.

Your output text must be clean clinical prose only — never include bracketed OCR/layout metadata such as [span_9], (start_span), or reference markers of any kind.${rangeInstruction}

${SHARED_SCHEMA_BLOCK}`;
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
  mode?: GenerationMode;
  /** 1-indexed position in the document to continue extracting from (Extract mode "Add More"). */
  rangeStart?: number;
  onStep?: (step: PipelineStep) => void;
}

export async function generateQuestionsFromPdf(
  opts: GenerateOptions
): Promise<PracticeQuestion[]> {
  const {
    apiKey,
    file,
    questionCount,
    subjectHint,
    mode = "generate",
    rangeStart,
    onStep,
  } = opts;

  if (!apiKey) throw new Error("Add your Gemini API key in Settings first.");
  if (file.type !== "application/pdf") throw new Error("Please choose a PDF file.");
  if (file.size > MAX_PDF_BYTES) throw new Error("This PDF is too large (20 MB limit).");

  const cappedCount = Math.max(1, Math.min(questionCount, MAX_QUESTIONS_PER_BATCH));

  onStep?.("read");
  const base64Pdf = await fileToBase64(file);

  onStep?.("send");
  const prompt =
    mode === "extract"
      ? buildExtractPrompt(cappedCount, subjectHint, rangeStart)
      : buildGeneratePrompt(cappedCount, subjectHint);

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "application/pdf", data: base64Pdf } },
        ],
      },
    ],
    generationConfig: {
      // Extract mode should stick closely to source wording rather than
      // creatively rephrasing — a lower temperature helps with that.
      temperature: mode === "extract" ? 0.15 : 0.4,
      // Forces Gemini to return raw JSON directly (no markdown fences or
      // conversational preamble), which is far more reliable than asking
      // nicely in the prompt alone.
      responseMimeType: "application/json",
      // Detailed vignettes + 5 rationale-annotated options per question add
      // up fast. A low ceiling here is the most common cause of "response
      // got cut off mid-JSON" parse failures, especially at higher question
      // counts — so we ask for generous headroom.
      maxOutputTokens: 65536,
    },
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
  const candidate = data.candidates?.[0];
  const finishReason: string | undefined = candidate?.finishReason;

  const rawText = (candidate?.content?.parts || [])
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();

  if (!rawText) {
    if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
      throw new Error(
        "Gemini declined to process this PDF (flagged by its safety filters). Try a different document."
      );
    }
    throw new Error(
      `Gemini returned an empty response${finishReason ? ` (finishReason: ${finishReason})` : ""}.`
    );
  }

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
    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        `Gemini's response was cut off before finishing (hit the output token limit) — try requesting fewer questions (e.g. ${Math.max(
          1,
          Math.floor(cappedCount / 2)
        )} instead of ${cappedCount}).`
      );
    }
    const preview = cleanText.slice(0, 160).replace(/\s+/g, " ");
    throw new Error(
      `Couldn't parse Gemini's response as JSON${
        finishReason ? ` (finishReason: ${finishReason})` : ""
      }. Response started with: "${preview}${cleanText.length > 160 ? "…" : ""}"`
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini didn't return any questions.");
  }

  onStep?.("save");
  const { valid } = validateQuestions(parsed, "gen");
  if (valid.length === 0) {
    throw new Error("Gemini's questions didn't match the expected format. Try again.");
  }

  return valid;
}

