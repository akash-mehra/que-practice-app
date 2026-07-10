/**
 * Parses pasted/uploaded text into a raw array ready for validateQuestions().
 *
 * Deliberately never uses eval()/Function() — running arbitrary uploaded code
 * client-side would risk exfiltrating whatever else lives in localStorage
 * (e.g. the Gemini API key), even though the whole feature is "just for me".
 * Instead this only ever calls JSON.parse, after a couple of safe, purely
 * textual cleanup passes:
 *   1. Try it as-is — covers plain JSON arrays.
 *   2. Strip a leading `export const NAME: Type[] =` / `const NAME =` style
 *      TypeScript variable declaration and a trailing `;` / `as const;` —
 *      covers "a .ts file that's really just a typed JSON array".
 *   3. Strip trailing commas before `]`/`}` — covers a common non-JSON habit.
 * If none of those produce valid JSON, this throws with a short preview of
 * where parsing broke down so the person can fix the source.
 */
export function parseQuestionsInput(input: string): unknown[] {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Paste or upload some question data first.");
  }

  const attempts: Array<() => string> = [
    () => trimmed,
    () =>
      trimmed
        .replace(/^\s*export\s+/, "")
        .replace(/^\s*const\s+\w+\s*(:\s*[^=]+)?=\s*/, "")
        .replace(/;\s*$/, "")
        .replace(/\s+as\s+const\s*$/, ""),
  ];

  let lastError: string = "";
  for (const attempt of attempts) {
    const candidate = attempt();
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      // Also try stripping trailing commas on this same candidate before
      // moving to the next attempt.
      try {
        const noTrailingCommas = candidate.replace(/,(\s*[\]}])/g, "$1");
        const parsed = JSON.parse(noTrailingCommas);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e2) {
        lastError = e2 instanceof Error ? e2.message : String(e2);
      }
    }
  }

  const preview = trimmed.slice(0, 160).replace(/\s+/g, " ");
  throw new Error(
    `Couldn't parse this as JSON (${lastError}). Content must be valid JSON — a plain array of ` +
      `question objects (double-quoted keys/strings, no trailing commas), optionally wrapped in ` +
      `a "const x = [...];" declaration. Started with: "${preview}${
        trimmed.length > 160 ? "…" : ""
      }"`
  );
}

/**
 * Best-effort normalization of a few known alternate question shapes into
 * our canonical one, run before validateQuestions(). This does NOT relax
 * validation — it just recognizes common real-world variants (e.g. an
 * answer-key style dataset with options as a letter-keyed object plus a
 * separate "correct_answer" field, and no rationale text at all) and maps
 * them onto the fields validateQuestions() actually checks. Anything it
 * doesn't recognize passes through unchanged, so it still fails validation
 * with a clear reason rather than being silently mis-imported.
 */
export function normalizeQuestionsShape(raw: unknown[]): unknown[] {
  return raw.map((item) => {
    if (typeof item !== "object" || item === null) return item;
    const q: Record<string, unknown> = { ...(item as Record<string, unknown>) };

    // Object-keyed options ({ "A": "text", "B": "text" }) + a separate
    // "correct_answer" / "answer" field -> our array-of-{letter,text,isCorrect}.
    if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
      const correctRaw = q.correct_answer ?? q.answer ?? q.correctAnswer;
      const correctLetter =
        typeof correctRaw === "string" ? correctRaw.trim().toUpperCase() : undefined;
      q.options = Object.entries(q.options as Record<string, unknown>).map(([letter, text]) => ({
        letter,
        text: typeof text === "string" ? text : String(text),
        isCorrect: letter.trim().toUpperCase() === correctLetter,
      }));
    }

    // No rationale/explanation content at all — treat as a valid "answer key
    // only" dataset rather than rejecting it outright.
    if (!q.solution || typeof q.solution !== "object") {
      q.solution = {
        main_rationale: "No explanation was provided with this imported question.",
        educational_objective: "",
        incorrect_rationales: {},
      };
    }

    if (!q.id) {
      const num = q.question_number ?? q.number ?? q.qid;
      if (typeof num !== "undefined") q.id = `import-q${num}`;
    }

    return q;
  });
}

