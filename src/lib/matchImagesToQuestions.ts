import { locateQuestionSpan, classifyImages, type ContentEvent } from "./pdfImageMatch";
import type { PdfToken } from "./pdfImageExtractor";
import type { PracticeQuestion } from "@/types/question";

export interface UnmatchedImage {
  tokenId: string;
  dataUrl: string;
  page: number;
}

export interface MatchImagesResult {
  questions: PracticeQuestion[];
  unmatched: UnmatchedImage[];
}

/**
 * High-level entry point: takes the questions Gemini returned plus the raw
 * tokens extracted from the source PDF, locates each question's span in the
 * document, classifies every image against those spans (per the
 * stem-through-options / "belongs to the next question" rule — see
 * pdfImageMatch.ts for the exact logic), and returns questions with
 * `vignette_image` filled in wherever a confident match was found, plus
 * whatever images couldn't be confidently placed for manual assignment.
 */
export function matchImagesToQuestions(
  questions: PracticeQuestion[],
  tokens: PdfToken[]
): MatchImagesResult {
  const events: ContentEvent[] = tokens.map((t) =>
    t.type === "image"
      ? { order: t.order, type: "image" as const, imageId: t.tokenId }
      : { order: t.order, type: "text" as const, text: t.text }
  );

  const imageByTokenId = new Map(
    tokens.filter((t) => t.type === "image" && t.tokenId).map((t) => [t.tokenId!, t])
  );

  const spans = questions.map((q) =>
    locateQuestionSpan(q.id, `${q.vignette} ${q.options.map((o) => o.text).join(" ")}`, events)
  );

  const { matched, unmatched } = classifyImages(events, spans);

  const updatedQuestions = questions.map((q) => {
    const imageIds = matched[q.id];
    if (imageIds && imageIds.length > 0) {
      // Schema supports one vignette_image; if a question's span somehow
      // captured more than one image, keep the first and leave the rest
      // for manual assignment rather than silently discarding them.
      const [first, ...rest] = imageIds;
      const img = imageByTokenId.get(first);
      if (img?.dataUrl) {
        rest.forEach((id) => unmatched.push(id));
        return { ...q, vignette_image: img.dataUrl };
      }
    }
    return q;
  });

  const unmatchedImages: UnmatchedImage[] = unmatched
    .map((id) => imageByTokenId.get(id))
    .filter((img): img is PdfToken => !!img && !!img.dataUrl)
    .map((img) => ({ tokenId: img.tokenId!, dataUrl: img.dataUrl!, page: img.page }));

  return { questions: updatedQuestions, unmatched: unmatchedImages };
}

