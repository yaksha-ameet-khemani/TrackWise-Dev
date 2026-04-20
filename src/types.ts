export interface Entry {
  id: string;
  date: string;
  client: string;
  programName: string;
  trackName: string;
  skill: string;
  questionShared: string;
  type: "MFA" | "SF" | "MCQ" | "MFA-Manual" | `MFA + MCQ` | `SF + MCQ`;
  skillAssist: string;
  milestone: string;
  learningPath: string;
  grading: "AutoGraded" | "Manual" | "AI-Autograded";
  csdm: string;
  autogradingEta: string;
  status: string;
  issues: string;
  courseCorrection: string;
  remarks: string;
  // Replacement tracking
  isReplaced: boolean;
  replacedById: string;
  replacementReason: string;
  replacesId: string;
}

export type Tab = "dashboard" | "add" | "entries" | "updated-dashboard" | "admin";
export type ShowReplaced = "active" | "replaced" | "all";

export interface Filters {
  client: string;
  skill: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  showReplaced: ShowReplaced;
}
