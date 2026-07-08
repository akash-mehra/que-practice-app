export interface QuestionOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionSolution {
  educational_objective: string;
  explanation_image?: string;
  main_rationale: string;
  incorrect_rationales: Record<string, string>;
}

export interface PracticeQuestion {
  id: string;
  system: string;
  discipline: string;
  vignette: string;
  vignette_image?: string;
  options: QuestionOption[];
  solution: QuestionSolution;
}

export interface QuestionProgress {
  selected: string | null;
  submitted: boolean;
  flagged: boolean;
  blockEnded: boolean;
}
