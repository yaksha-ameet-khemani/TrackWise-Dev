import { useState, useEffect } from "react";
import { Entry, Filters } from "../types";
import { STATUSES } from "../constants";
import { getClients, getSkills } from "../utils/lookups";
import { exportToCSV } from "../utils/export";
import StatusBadge from "./StatusBadge";

interface Props {
  entries: Entry[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  onEdit: (id: string) => void;
  onReplace: (id: string) => void;
  onDelete: (id: string) => void;
}

const TH =
  "text-center px-3 py-2.5 text-xs font-semibold text-violet-800 bg-violet-50 border border-violet-100 border-b-2 border-b-violet-300 sticky top-0 z-10";
const TD = "px-3 py-2 text-xs border border-gray-100 text-center align-middle";

const COLUMNS = [
  "Date",
  "Client",
  "Program",
  "Track",
  "Skill",
  "Questions Shared",
  "Type",
  "Milestone",
  "SkillAssist",
  "Learning Path",
  "Grading",
  "CSDM",
  "Autograding ETA",
  "Status",
  "Issues",
  "Course Corr.",
  "Remarks",
  "",
];

/**
 * Forward-fills empty string fields within the same date/client/program/track group.
 * Rows in the data often leave skill (and other fields) blank when it's the same as the row above.
 * This normalises those blanks so span computation works correctly.
 */
function forwardFill(rows: Entry[]): Entry[] {
  const result: Entry[] = [];
  for (let i = 0; i < rows.length; i++) {
    const curr = rows[i];
    if (i === 0) {
      result.push(curr);
      continue;
    }
    const prev = result[i - 1];
    const sameGroup =
      curr.date === rows[i - 1].date &&
      curr.client === rows[i - 1].client &&
      curr.programName === rows[i - 1].programName &&
      curr.trackName === rows[i - 1].trackName;
    if (!sameGroup) {
      result.push(curr);
      continue;
    }
    result.push({
      ...curr,
      skill: curr.skill || prev.skill,
      type: curr.type || prev.type,
      milestone: curr.milestone || prev.milestone,
      skillAssist: curr.skillAssist || prev.skillAssist,
      learningPath: curr.learningPath || prev.learningPath,
      grading: curr.grading || prev.grading,
      csdm: curr.csdm || prev.csdm,
      autogradingEta: curr.autogradingEta || prev.autogradingEta,
      status: curr.status || prev.status,
      issues: curr.issues || prev.issues,
      courseCorrection: curr.courseCorrection || prev.courseCorrection,
      remarks: curr.remarks || prev.remarks,
    });
  }
  return result;
}

/** Returns an array where each index holds the rowspan for that row (0 = skip/hidden). */
function computeSpans(rows: Entry[], keyFn: (row: Entry) => string): number[] {
  const spans = new Array(rows.length).fill(0);
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && keyFn(rows[j]) === keyFn(rows[i])) j++;
    spans[i] = j - i;
    i = j;
  }
  return spans;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 10000];

export default function AllEntries({
  entries,
  filters,
  onFiltersChange,
  onEdit,
  onReplace,
  onDelete,
}: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const setF = (key: keyof Filters, value: string) =>
    onFiltersChange({ ...filters, [key]: value });

  const clearF = () =>
    onFiltersChange({
      client: "",
      skill: "",
      status: "",
      dateFrom: "",
      dateTo: "",
      showReplaced: "active",
    });

  let filtered = [...entries];
  if (filters.client)
    filtered = filtered.filter((e) => e.client === filters.client);
  if (filters.skill)
    filtered = filtered.filter((e) => e.skill === filters.skill);
  if (filters.status)
    filtered = filtered.filter((e) => e.status === filters.status);
  if (filters.dateFrom)
    filtered = filtered.filter((e) => e.date >= filters.dateFrom);
  if (filters.dateTo)
    filtered = filtered.filter((e) => e.date <= filters.dateTo);
  if (filters.showReplaced === "active")
    filtered = filtered.filter((e) => !e.isReplaced);
  if (filters.showReplaced === "replaced")
    filtered = filtered.filter((e) => e.isReplaced);
  filtered.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    const c = a.client.localeCompare(b.client);
    if (c !== 0) return c;
    const p = a.programName.localeCompare(b.programName);
    if (p !== 0) return p;
    const t = a.trackName.localeCompare(b.trackName);
    if (t !== 0) return t;
    return a.skill.localeCompare(b.skill);
  });

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Reset to page 1 whenever filters or pageSize change
  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  // Clamp page if it goes out of range after filter change
  const safePage = Math.min(page, totalPages);

  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRecords);
  const paged = filtered.slice(startIdx, endIdx);
  const filled = forwardFill(paged);

  // Spans computed on the forward-filled page slice — each column merges within its parent context
  const k = (...fields: string[]) => fields.join("|");
  const tr = (e: Entry) => k(e.date, e.client, e.programName, e.trackName); // track-level parent
  const sk = (e: Entry) =>
    k(e.date, e.client, e.programName, e.trackName, e.skill); // skill-level parent

  const dateSpans = computeSpans(filled, (e) => k(e.date));
  const clientSpans = computeSpans(filled, (e) => k(e.date, e.client));
  const programSpans = computeSpans(filled, (e) =>
    k(e.date, e.client, e.programName),
  );
  const trackSpans = computeSpans(filled, (e) =>
    k(e.date, e.client, e.programName, e.trackName),
  );
  const skillSpans = computeSpans(filled, (e) => sk(e));
  // Each entry has exactly one question — never merge across different entries,
  // even if question text is identical (they may have different clients/statuses).
  const questionSpans = computeSpans(filled, (e) => e.id);
  const typeSpans = computeSpans(filled, (e) => k(tr(e), e.type));
  const milestoneSpans = computeSpans(filled, (e) => k(tr(e), e.milestone));
  const skillAssistSpans = computeSpans(filled, (e) => k(tr(e), e.skillAssist));
  const learningSpans = computeSpans(filled, (e) => k(tr(e), e.learningPath));
  const gradingSpans = computeSpans(filled, (e) => k(tr(e), e.grading));
  const csdmSpans = computeSpans(filled, (e) => k(tr(e), e.csdm));
  const etaSpans = computeSpans(filled, (e) => k(tr(e), e.autogradingEta));
  const statusSpans = computeSpans(filled, (e) => k(tr(e), e.status));
  const issuesSpans = computeSpans(filled, (e) => k(tr(e), e.issues));
  const corrSpans = computeSpans(filled, (e) => k(tr(e), e.courseCorrection));
  const remarksSpans = computeSpans(filled, (e) => k(tr(e), e.remarks));

  // Page number buttons: show up to 5 around current page
  const pageBtns: number[] = [];
  const delta = 2;
  for (
    let p = Math.max(1, safePage - delta);
    p <= Math.min(totalPages, safePage + delta);
    p++
  ) {
    pageBtns.push(p);
  }

  const hasFilter = filters.dateFrom || filters.dateTo || filters.client || filters.skill || filters.status || filters.showReplaced !== "active";

  return (
    <div className="max-w-screen-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">All Entries</h1>
            <p className="text-sm text-gray-400 mt-0.5">Browse, filter and manage all content share records</p>
          </div>
        </div>
        <button
          onClick={() => exportToCSV(entries)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Date range pill */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          <input type="date" value={filters.dateFrom} onChange={(e) => setF("dateFrom", e.target.value)}
            className="text-xs text-gray-700 bg-transparent focus:outline-none w-32" title="From date" />
          <span className="text-xs text-gray-300 font-medium">→</span>
          <input type="date" value={filters.dateTo} onChange={(e) => setF("dateTo", e.target.value)}
            className="text-xs text-gray-700 bg-transparent focus:outline-none w-32" title="To date" />
        </div>

        {/* Client pill */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="9" cy="7" r="4" /><path d="M3 21v-1a6 6 0 0112 0v1" strokeLinecap="round" />
          </svg>
          <select value={filters.client} onChange={(e) => setF("client", e.target.value)}
            className="text-xs text-gray-700 bg-transparent focus:outline-none">
            <option value="">All clients</option>
            {getClients().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Skill pill */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <select value={filters.skill} onChange={(e) => setF("skill", e.target.value)}
            className="text-xs text-gray-700 bg-transparent focus:outline-none">
            <option value="">All skills</option>
            {getSkills().map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 3" strokeLinecap="round" />
          </svg>
          <select value={filters.status} onChange={(e) => setF("status", e.target.value)}
            className="text-xs text-gray-700 bg-transparent focus:outline-none">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Show replaced pill */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <select value={filters.showReplaced} onChange={(e) => setF("showReplaced", e.target.value)}
            className="text-xs text-gray-700 bg-transparent focus:outline-none">
            <option value="active">Active only</option>
            <option value="replaced">Replaced only</option>
            <option value="all">All entries</option>
          </select>
        </div>

        {/* Clear */}
        {hasFilter && (
          <button onClick={clearF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors bg-white shadow-sm">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)]">
          <table className="w-full">
            <thead>
              <tr>
                {COLUMNS.map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    No entries found
                  </td>
                </tr>
              ) : (
                paged.map((e, idx) => {
                  const replEntry = e.replacedById
                    ? entries.find((x) => x.id === e.replacedById)
                    : undefined;
                  const origEntry = e.replacesId
                    ? entries.find((x) => x.id === e.replacesId)
                    : undefined;

                  const tooltip =
                    e.isReplaced && replEntry
                      ? `Replaced by: ${replEntry.questionShared}`
                      : origEntry
                        ? `Replaces: ${origEntry.questionShared}\nReason: ${e.replacementReason || origEntry.replacementReason}`
                        : "";

                  const isDateBoundary = dateSpans[idx] > 0 && idx > 0;
                  const rowClass = e.isReplaced
                    ? `opacity-60 bg-gray-50 ${isDateBoundary ? "[&>td]:!border-t-violet-200" : ""}`
                    : `hover:bg-violet-50/40 transition-colors ${isDateBoundary ? "[&>td]:!border-t-violet-200" : ""}`;

                  const MERGED_TD = `${TD} align-middle text-center bg-gray-50/60`;

                  return (
                    <tr key={e.id} className={rowClass}>
                      {dateSpans[idx] > 0 && (
                        <td
                          rowSpan={dateSpans[idx]}
                          className={`${MERGED_TD} text-gray-700`}
                        >
                          {e.date}
                        </td>
                      )}
                      {clientSpans[idx] > 0 && (
                        <td
                          rowSpan={clientSpans[idx]}
                          className={`${MERGED_TD} font-medium`}
                        >
                          {e.client}
                        </td>
                      )}
                      {programSpans[idx] > 0 && (
                        <td
                          rowSpan={programSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                          title={e.programName}
                        >
                          {e.programName}
                        </td>
                      )}
                      {trackSpans[idx] > 0 && (
                        <td
                          rowSpan={trackSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                          title={e.trackName}
                        >
                          {e.trackName}
                        </td>
                      )}

                      {skillSpans[idx] > 0 && (
                        <td
                          rowSpan={skillSpans[idx]}
                          className={`${MERGED_TD} text-gray-700`}
                        >
                          {e.skill}
                        </td>
                      )}

                      {/* Question shared — with replacement indicators */}
                      {questionSpans[idx] > 0 && (
                        <td
                          rowSpan={questionSpans[idx]}
                          className={`${MERGED_TD} whitespace-normal break-words max-w-[240px] text-center`}
                          title={tooltip}
                        >
                          <span
                            className={
                              e.isReplaced ? "line-through text-gray-400" : ""
                            }
                          >
                            {e.questionShared}
                          </span>
                          {e.isReplaced && (
                            <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.5 rounded whitespace-nowrap">
                              Replaced
                            </span>
                          )}
                          {e.replacesId && (
                            <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 border border-blue-300 px-1 py-0.5 rounded whitespace-nowrap">
                              Replacement
                            </span>
                          )}
                        </td>
                      )}

                      {typeSpans[idx] > 0 && (
                        <td rowSpan={typeSpans[idx]} className={MERGED_TD}>
                          {e.type}
                        </td>
                      )}
                      {milestoneSpans[idx] > 0 && (
                        <td
                          rowSpan={milestoneSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                        >
                          {e.milestone}
                        </td>
                      )}
                      {skillAssistSpans[idx] > 0 && (
                        <td
                          rowSpan={skillAssistSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                        >
                          {e.skillAssist}
                        </td>
                      )}
                      {learningSpans[idx] > 0 && (
                        <td
                          rowSpan={learningSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                        >
                          {e.learningPath}
                        </td>
                      )}
                      {gradingSpans[idx] > 0 && (
                        <td
                          rowSpan={gradingSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                        >
                          {e.grading}
                        </td>
                      )}
                      {csdmSpans[idx] > 0 && (
                        <td
                          rowSpan={csdmSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                        >
                          {e.csdm}
                        </td>
                      )}
                      {etaSpans[idx] > 0 && (
                        <td
                          rowSpan={etaSpans[idx]}
                          className={`${MERGED_TD} text-gray-600`}
                        >
                          {e.autogradingEta}
                        </td>
                      )}
                      {statusSpans[idx] > 0 && (
                        <td rowSpan={statusSpans[idx]} className={MERGED_TD}>
                          <StatusBadge status={e.status} />
                        </td>
                      )}
                      {issuesSpans[idx] > 0 && (
                        <td
                          rowSpan={issuesSpans[idx]}
                          className={`${MERGED_TD} text-gray-500`}
                        >
                          {e.issues}
                        </td>
                      )}
                      {corrSpans[idx] > 0 && (
                        <td
                          rowSpan={corrSpans[idx]}
                          className={`${MERGED_TD} text-gray-500`}
                        >
                          {e.courseCorrection}
                        </td>
                      )}
                      {remarksSpans[idx] > 0 && (
                        <td
                          rowSpan={remarksSpans[idx]}
                          className={`${MERGED_TD} text-gray-500`}
                        >
                          {e.remarks}
                        </td>
                      )}

                      {/* Actions */}
                      <td className={`${TD} whitespace-nowrap`}>
                        <button
                          onClick={() => onEdit(e.id)}
                          className="px-2 py-0.5 text-[11px] border border-violet-300 text-violet-700 rounded-md hover:bg-violet-50 mr-1 transition-colors"
                        >
                          Edit
                        </button>
                        {!e.isReplaced && (
                          <button
                            onClick={() => onReplace(e.id)}
                            className="px-2 py-0.5 text-[11px] border border-amber-400 text-amber-700 rounded-md hover:bg-amber-50 mr-1 transition-colors"
                          >
                            Replace
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(e.id)}
                          className="px-2 py-0.5 text-[11px] border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
          {/* Records info */}
          <span className="text-xs text-gray-500">
            {totalRecords === 0
              ? "No records"
              : `Showing ${startIdx + 1}–${endIdx} of ${totalRecords} records`}
          </span>

          {/* Summary counts from filtered (all pages) */}
          {totalRecords > 0 &&
            (() => {
              const hasSkillAssist = (e: Entry) =>
                e.skillAssist.trim().toLowerCase().startsWith("yes");

              const mfaEntries = filtered.filter(
                (e) =>
                  (e.type === "MFA" ||
                    e.type === "MFA-Manual" ||
                    e.type === "MFA + MCQ") &&
                  !hasSkillAssist(e),
              );
              const sfEntries = filtered.filter(
                (e) =>
                  (e.type === "SF" || e.type === "SF + MCQ") &&
                  !hasSkillAssist(e),
              );
              const skillAssistEntries = filtered.filter((e) =>
                hasSkillAssist(e),
              );
              const mcqEntries = filtered.filter((e) => e.type === "MCQ");

              const normalizeMilestone = (milestone: string): string => {
                const m = milestone.trim();
                if (!m) return "";
                if (/assignment/i.test(m)) return "Assignment";
                if (/mock/i.test(m)) return "Mock";
                if (/review|demo/i.test(m)) return "Review";
                return "Assessment";
              };

              const milestoneBreakdown = (
                group: Entry[],
              ): [string, number][] => {
                const counts: Record<string, number> = {};
                group.forEach((e) => {
                  const key = normalizeMilestone(e.milestone);
                  if (key) counts[key] = (counts[key] || 0) + 1;
                });
                return Object.entries(counts).sort((a, b) => b[1] - a[1]);
              };


              const renderGroup = (
                label: string,
                group: Entry[],
                mainColor: string,
              ) => {
                if (group.length === 0) return null;
                const breakdown = milestoneBreakdown(group);
                return (
                  <div
                    key={label}
                    className="flex items-center gap-1 flex-wrap"
                  >
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${mainColor}`}
                    >
                      {label}:{" "}
                      <span className="font-bold">{group.length}</span>
                    </span>
                    {breakdown.map(([m, c]) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-gray-50 text-gray-600 border-gray-200"
                      >
                        {m}:{" "}
                        <span className="font-bold">{c}</span>
                      </span>
                    ))}
                  </div>
                );
              };

              return (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {renderGroup(
                    "MFA",
                    mfaEntries,
                    "bg-purple-50 text-purple-700 border-purple-200",
                  )}
                  {renderGroup(
                    "SF",
                    sfEntries,
                    "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                  {renderGroup(
                    "Skill Assist",
                    skillAssistEntries,
                    "bg-teal-50 text-teal-700 border-teal-200",
                  )}
                  {renderGroup(
                    "MCQ",
                    mcqEntries,
                    "bg-cyan-50 text-cyan-700 border-cyan-200",
                  )}
                </div>
              );
            })()}

          <div className="flex-1" />

          {/* Rows per page */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="px-2 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-violet-50 transition-colors"
              title="First page"
            >
              «
            </button>
            <button
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 1}
              className="px-2 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-violet-50 transition-colors"
            >
              ‹
            </button>

            {pageBtns[0] > 1 && (
              <span className="px-1 text-xs text-gray-400">…</span>
            )}
            {pageBtns.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-2.5 py-1 text-xs border rounded-md transition-colors ${
                  p === safePage
                    ? "text-white border-violet-600"
                    : "border-gray-200 hover:bg-violet-50"
                }`}
                style={p === safePage ? { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' } : {}}
              >
                {p}
              </button>
            ))}
            {pageBtns[pageBtns.length - 1] < totalPages && (
              <span className="px-1 text-xs text-gray-400">…</span>
            )}

            <button
              onClick={() => setPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-violet-50 transition-colors"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-violet-50 transition-colors"
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
