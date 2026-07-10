import type { QuestionOption, QuestionSolution } from "@/types/question";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function buildPrompt(vignette: string, options: QuestionOption[]): string {
  const correct = options.find((o) => o.isCorrect);
  const optionsList = options
    .map((o) => `${o.letter}. ${o.text}${o.isCorrect ? "  <-- correct answer" : ""}`)
    .join("\n");

  return `You are an expert USMLE Step 1 educator. The following clinical vignette question already has a known correct answer. Write a thorough, NBME-style explanation for it.

Vignette:
${vignette}

Answer choices:
${optionsList}

The correct answer is ${correct?.letter ?? "unknown"}.

Write:
1. A one-to-two sentence "educational_objective" stating the core testable fact.
2. A "main_rationale" of several sentences explaining the pathophysiology/clinical reasoning for why the correct answer is right.
3. A distinct, specific "incorrect_rationales" entry for every option that is NOT correct, explaining specifically why that choice is wrong — never a generic "this is incorrect" statement.

Format your output strictly as a single raw JSON object matching this exact schema, without markdown code fences, without backticks, and without any conversational text wrapper:

{
  "educational_objective": "string",
  "main_rationale": "string",
  "incorrect_rationales": {
    ${options
      .filter((o) => !o.isCorrect)
      .map((o) => `"${o.letter}": "string"`)
      .join(",\n    ")}
  }
}`;
}

export async function generateExplanation(
  apiKey: string,
  vignette: string,
  options: QuestionOption[]
): Promise<QuestionSolution> {
  if (!apiKey) throw new Error("Add your Gemini API key in Settings first.");

  const payload = {
    contents: [{ parts: [{ text: buildPrompt(vignette, options) }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
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
  const candidate = data.candidates?.[0];
  const finishReason: string | undefined = candidate?.finishReason;

  const rawText = (candidate?.content?.parts || [])
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();

  if (!rawText) {
    if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
      throw new Error("Gemini declined to explain this question (flagged by its safety filters).");
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
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleanText = cleanText.slice(firstBrace, lastBrace + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanText);
  } catch {
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Gemini's response was cut off before finishing. Try again.");
    }
    const preview = cleanText.slice(0, 160).replace(/\s+/g, " ");
    throw new Error(`Couldn't parse Gemini's response as JSON. Started with: "${preview}"`);
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.main_rationale !== "string" || !obj.main_rationale.trim()) {
    throw new Error("Gemini's response didn't include a usable explanation. Try again.");
  }

  return {
    educational_objective:
      typeof obj.educational_objective === "string" ? obj.educational_objective : "",
    main_rationale: obj.main_rationale,
    incorrect_rationales:
      typeof obj.incorrect_rationales === "object" && obj.incorrect_rationales !== null
        ? (obj.incorrect_rationales as Record<string, string>)
        : {},
  };
}

