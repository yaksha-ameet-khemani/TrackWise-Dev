import { Entry } from "../types";

export function exportToCSV(entries: Entry[]): void {
  const headers = [
    "Date",
    "Client",
    "Name of Program",
    "Track Name",
    "Assessments (Skill/Tool)",
    "Questions Shared",
    "MFA/SF/MCQ",
    "SkillAssist",
    "Final Milestone",
    "Learning Paths – Digital Learning",
    "Manual/AutoGraded",
    "CSDM",
    "Intro to Autograding – ETA",
    "Status",
    "Issues Highlighted",
    "Course Correction",
    "Remarks",
    "Is Replaced",
    "Replaces Question",
    "Replacement Reason",
  ];

  const rows = entries.map((e) => {
    const orig = e.replacesId
      ? entries.find((x) => x.id === e.replacesId)
      : undefined;
    return [
      e.date,
      e.client,
      e.programName,
      e.trackName,
      e.skill,
      e.questionShared,
      e.type,
      e.skillAssist,
      e.milestone,
      e.learningPath,
      e.grading,
      e.csdm,
      e.autogradingEta,
      e.status,
      e.issues,
      e.courseCorrection,
      e.remarks,
      e.isReplaced ? "Yes" : "No",
      orig ? orig.questionShared : "",
      e.replacementReason,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = `content_sharing_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}
