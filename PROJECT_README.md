# Que Practice App

An interactive NBME-style USMLE practice question block, with a persistent
local question bank and a Gemini-powered PDF-to-question generation pipeline.
Fully static — designed to run on GitHub Pages with no backend.

## Setup
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Verified
- `npm run build` — compiles cleanly (Next.js 16 / Turbopack, TypeScript strict mode)
- `npm run lint` — no ESLint errors

## Structure
- `src/data/questions.json` — seed question(s), matching the schema below
- `src/types/question.ts` — `PracticeQuestion` type + per-question progress type
- `src/lib/qbank.ts` — localStorage-backed question bank + progress + API key storage
- `src/lib/geminiGenerate.ts` — Gemini 2.5 Flash PDF-to-questions pipeline
- `app/page.tsx` — top-level orchestrator: home screen, practice block, overlays
- `src/components/HomeScreen.tsx` — dashboard: stats, generate/lab-values cards, next-item preview
- `src/components/PracticeBlock.tsx` — state container for a practice session (selection, strike-through, tutor mode, submission, navigation)
- `src/components/ExamHeader.tsx` — top bar (item counter, system/discipline tags, Tutor Mode toggle, Lab Values, timer, home button)
- `src/components/VignettePanel.tsx` — vignette text with native click-drag highlighting and click-to-zoom image
- `src/components/OptionsPanel.tsx` — answer choices with select/right-click-strike-through/answer-reveal states
- `src/components/SolutionPanel.tsx` — post-submission review: educational objective, rationale, per-option breakdown
- `src/components/ExamFooter.tsx` — Previous/Next/Notes/Calculator/Flag/Submit
- `src/components/GenerateModal.tsx` — PDF upload + generation pipeline UI
- `src/components/SettingsModal.tsx` — Gemini API key management
- `src/components/LabValuesModal.tsx` — searchable normal lab values reference
- `src/components/ImageZoomModal.tsx` — shared lightbox for images

## Question schema
```json
{
  "id": "string",
  "system": "string",
  "discipline": "string",
  "vignette": "string",
  "vignette_image": "string | null",
  "options": [
    { "letter": "A", "text": "string", "isCorrect": true }
  ],
  "solution": {
    "educational_objective": "string",
    "explanation_image": "string | null",
    "main_rationale": "string",
    "incorrect_rationales": { "B": "string", "C": "string" }
  }
}
```

## Generating new questions from a PDF
1. Open Settings (gear icon on home) and paste a Gemini API key — stored only in this
   browser's `localStorage`, sent directly to Google's API, never to any other server.
2. Tap **Generate from a PDF** on the home screen, choose a PDF, pick a question count
   and optional subject focus, and generate.
3. Valid questions are appended to your local qbank (also `localStorage`) and immediately
   available in the practice block.

Note: the qbank and API key are per-browser/per-device — there's no sync across devices.

## Deploying to GitHub Pages
This project is configured for **static export** (no server needed).

1. Confirm `REPO_NAME` in `next.config.ts` matches your GitHub repo's exact name.
   It's currently set to `que-practice-app`.
2. Push this project to a new GitHub repo.
3. In the repo: **Settings → Pages → Source → GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab). The included
   `.github/workflows/deploy.yml` builds and publishes automatically.
5. Your site will be live at `https://<your-username>.github.io/<REPO_NAME>/`.

## Key interaction notes
- **Tutor Mode ON**: Submit Answer immediately colors the correct choice green (and the
  selected wrong choice red) and reveals the full Solution panel below the question.
- **Tutor Mode OFF**: Submit Answer locks the selection and records it, but rationale is
  withheld until "End Block & Review" is clicked — mirroring a real timed NBME board exam
  block where all remediation is deferred to block-end review.
- **Right-click** any option to strike it through (toggle again to undo) — disabled after
  submission.
- **Click-and-drag** inside the vignette text to highlight it.
- Click either the vignette image or the explanation image to open a full-screen zoom modal.
