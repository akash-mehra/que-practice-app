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

