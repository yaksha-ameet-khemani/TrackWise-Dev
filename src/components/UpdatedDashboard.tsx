import { useState } from "react";
import { Entry } from "../types";
import { getClients } from "../utils/lookups";

interface Props {
  entries: Entry[];
}

// ── Donut chart (multi-segment) ───────────────────────────────────────────────

function DonutChart({
  segments,
  total,
  centerValue,
}: {
  segments: { count: number; color: string }[];
  total: number;
  centerValue: number;
}) {
  const r = 34;
  const circ = 2 * Math.PI * r;

  // Pre-compute each segment's arc length and cumulative start offset
  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const len = total > 0 ? (seg.count / total) * circ : 0;
    const offset = cumulative;
    cumulative += len;
    return { ...seg, len, offset };
  });

  return (
    <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 84 84">
        {/* Track ring */}
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        {/* Coloured segments */}
        {arcs.map((arc, i) =>
          arc.len > 0 ? (
            <circle
              key={i}
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth="8"
              strokeDasharray={`${arc.len} ${circ}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ) : null,
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900 leading-none">
          {centerValue}
        </span>
        <span className="text-[10px] text-gray-400 mt-0.5 leading-tight text-center">
          Data Shared
        </span>
      </div>
    </div>
  );
}

// ── Milestone columns (right side of category card) ──────────────────────────

function MilestoneColumns({
  segments,
}: {
  segments: {
    label: string;
    count: number;
    textColor: string;
    barColor: string;
  }[];
}) {
  return (
    <div className="flex items-stretch gap-0 flex-1 justify-center">
      {segments.map((s, i) => (
        <div key={s.label} className="flex items-stretch">
          {/* Vertical separator before each column except the first */}
          {i > 0 && <div className="w-px bg-black/5 mx-6 self-stretch" />}
          <div className="flex flex-col items-center justify-center gap-1 px-2">
            <span
              className="text-2xl font-extrabold"
              style={{ color: s.barColor }}
            >
              {s.count}
            </span>
            <span className="text-sm text-gray-400 text-center leading-tight">
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Category card (3-column layout) ──────────────────────────────────────────

function CategoryCard({
  title,
  rows,
  donutColor,
  donutTrack,
  accentBorder,
  accentText,
  icon,
  milestoneSegments,
}: {
  title: string;
  rows: Entry[];
  donutColor: string;
  donutTrack: string;
  accentBorder: string;
  accentText: string;
  icon: React.ReactNode;
  milestoneSegments: {
    label: string;
    count: number;
    color: string;
    textColor: string;
    barColor: string;
  }[];
}) {
  const total = rows.length;
  const accepted = rows.filter(
    (e) => e.status !== "Feedback Received" && e.status !== "Rejected",
  ).length;
  const feedback = rows.filter((e) => e.status === "Feedback Received").length;
  const rejected = rows.filter((e) => e.status === "Rejected").length;

  return (
    <div
      className={`rounded-2xl border ${accentBorder} shadow-sm overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${donutTrack} 0%, #ffffff 60%)`,
      }}
    >
      <div className="px-6 py-4">
        {total === 0 ? (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: donutColor + "22", color: donutColor }}
            >
              {icon}
            </div>
            <div>
              <h3 className={`text-base font-bold ${accentText}`}>{title}</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                No entries for the selected period.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* LEFT — icon + title + one-line subtitle */}
            <div className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: donutColor + "22",
                    color: donutColor,
                  }}
                >
                  {icon}
                </div>
                <h3 className={`text-base font-bold ${accentText}`}>{title}</h3>
              </div>
              {/* Single subtitle row */}
              <p className="text-sm text-gray-500 leading-relaxed pl-1 whitespace-nowrap">
                <span className="font-semibold text-emerald-600">
                  {accepted}
                </span>
                <span className="text-gray-400"> Accepted</span>
                <span className="text-gray-300 mx-1.5">·</span>
                <span className="font-semibold text-amber-600">{feedback}</span>
                <span className="text-gray-400"> Feedback</span>
                <span className="text-gray-300 mx-1.5">·</span>
                <span className="font-semibold text-red-500">{rejected}</span>
                <span className="text-gray-400"> Rejected</span>
              </p>
            </div>

            {/* CENTER — donut */}
            <DonutChart
              segments={milestoneSegments.map((s) => ({
                count: s.count,
                color: s.barColor,
              }))}
              total={total}
              centerValue={total}
            />

            {/* DIVIDER */}
            <div className="w-px self-stretch bg-black/5 flex-shrink-0" />

            {/* RIGHT — milestone columns */}
            <MilestoneColumns segments={milestoneSegments} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  gradient,
  iconBg,
  icon,
}: {
  label: string;
  value: number | string;
  sub: string;
  gradient: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`flex-1 min-w-[160px] rounded-2xl p-5 ${gradient}`}>
      <div
        className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold opacity-70 mb-1 text-white">
        {label}
      </p>
      <p className="text-3xl font-extrabold text-white leading-none mb-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-white/70 font-medium">{sub}</p>
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({
  label,
  value,
  detail,
  iconBg,
  iconColor,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-[180px] bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-bold text-gray-900 leading-snug mt-0.5">
          {value}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeMilestone(
  m: string,
): "Assessment" | "Assignment" | "Review / Demo" {
  const s = (m || "").trim();
  if (/assignment/i.test(s)) return "Assignment";
  if (/review|demo/i.test(s)) return "Review / Demo";
  return "Assessment";
}

const hasSkillAssist = (e: Entry) =>
  e.skillAssist.trim().toLowerCase().startsWith("yes");

function milestoneCounts(rows: Entry[]) {
  const accepted = rows.filter(
    (e) => e.status !== "Feedback Received" && e.status !== "Rejected",
  );
  const counts = { Assessment: 0, Assignment: 0, "Review / Demo": 0 };
  for (const e of accepted) counts[normalizeMilestone(e.milestone || "")]++;
  return counts;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UpdatedDashboard({ entries }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [client, setClient] = useState("");

  let base = entries.filter((e) => !e.isReplaced);
  if (dateFrom) base = base.filter((e) => e.date >= dateFrom);
  if (dateTo) base = base.filter((e) => e.date <= dateTo);
  if (client) base = base.filter((e) => e.client === client);

  const mfRows = base.filter(
    (e) =>
      (e.type === "MFA" || e.type === "MFA-Manual" || e.type === "MFA + MCQ") &&
      !hasSkillAssist(e),
  );
  const sfRows = base.filter(
    (e) => (e.type === "SF" || e.type === "SF + MCQ") && !hasSkillAssist(e),
  );
  const saRows = base.filter((e) => hasSkillAssist(e));

  const totalShared = base.length;
  const totalAccepted = base.filter(
    (e) => e.status !== "Feedback Received" && e.status !== "Rejected",
  ).length;
  const totalRejected = base.filter((e) => e.status === "Rejected").length;
  const acceptanceRate =
    totalShared > 0 ? ((totalAccepted / totalShared) * 100).toFixed(1) : "0.0";
  const rejectionRate =
    totalShared > 0 ? ((totalRejected / totalShared) * 100).toFixed(1) : "0.0";

  const hasFilter = dateFrom || dateTo || client;

  const mfCounts = milestoneCounts(mfRows);
  const sfCounts = milestoneCounts(sfRows);
  const saCounts = milestoneCounts(saRows);

  const projectSegments = [
    {
      label: "Assessment",
      count: mfCounts["Assessment"],
      color: "bg-violet-100",
      textColor: "text-violet-700",
      barColor: "#5b21b6",
    },
    {
      label: "Assignment",
      count: mfCounts["Assignment"],
      color: "bg-pink-100",
      textColor: "text-pink-700",
      barColor: "#db2777",
    },
    {
      label: "Review / Demo",
      count: mfCounts["Review / Demo"],
      color: "bg-orange-100",
      textColor: "text-orange-700",
      barColor: "#ea580c",
    },
  ];

  const codingSegments = [
    {
      label: "Assessment",
      count: sfCounts["Assessment"],
      color: "bg-blue-100",
      textColor: "text-blue-700",
      barColor: "#1e40af",
    },
    {
      label: "Assignment",
      count: sfCounts["Assignment"],
      color: "bg-indigo-100",
      textColor: "text-indigo-700",
      barColor: "#4f46e5",
    },
    {
      label: "Review / Demo",
      count: sfCounts["Review / Demo"],
      color: "bg-amber-100",
      textColor: "text-amber-700",
      barColor: "#d97706",
    },
  ];

  const saSegments = [
    {
      label: "Assessment",
      count: saCounts["Assessment"],
      color: "bg-teal-100",
      textColor: "text-teal-700",
      barColor: "#0d9488",
    },
    {
      label: "Assignment",
      count: saCounts["Assignment"],
      color: "bg-emerald-100",
      textColor: "text-emerald-700",
      barColor: "#10b981",
    },
  ];

  const allAccepted = base.filter(
    (e) => e.status !== "Feedback Received" && e.status !== "Rejected",
  );
  const assessmentCount = allAccepted.filter(
    (e) => normalizeMilestone(e.milestone || "") === "Assessment",
  ).length;
  const assessmentPct =
    allAccepted.length > 0
      ? ((assessmentCount / allAccepted.length) * 100).toFixed(0)
      : "0";
  const saActivityPct =
    totalShared > 0 ? ((saRows.length / totalShared) * 100).toFixed(0) : "0";

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Content Performance Overview
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Summary of shared content and its status across categories
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <svg
              className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            </svg>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm text-gray-700 bg-transparent focus:outline-none w-32"
              title="From date"
            />
            <span className="text-sm text-gray-300 font-medium">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm text-gray-700 bg-transparent focus:outline-none w-32"
              title="To date"
            />
          </div>

          {/* Client */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <svg
              className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-1a6 6 0 0112 0v1" strokeLinecap="round" />
            </svg>
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="text-sm text-gray-700 bg-transparent focus:outline-none max-w-[130px]"
            >
              <option value="">All clients</option>
              {getClients().map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {hasFilter && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setClient("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors bg-white shadow-sm"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {hasFilter && (
        <p className="text-sm text-gray-400 -mt-4 mb-5">
          Showing {base.length} entries
          {client && ` · ${client}`}
          {dateFrom && ` from ${dateFrom}`}
          {dateTo && ` to ${dateTo}`}
        </p>
      )}

      {/* ── KPI row ── */}
      <div className="flex flex-wrap gap-4 mb-7">
        <KpiCard
          label="Total Shared"
          value={totalShared}
          sub="across all categories"
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          iconBg="bg-white/25"
          icon={
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          }
        />
        <KpiCard
          label="Accepted"
          value={totalAccepted}
          sub={`${acceptanceRate}% Acceptance Rate`}
          gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
          iconBg="bg-white/25"
          icon={
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="4"
                fill="currentColor"
                stroke="none"
                opacity="0.25"
              />
              <path
                d="M7 12.5l3.5 3.5 6.5-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <KpiCard
          label="Rejected"
          value={totalRejected}
          sub={`${rejectionRate}% Rejection Rate`}
          gradient="bg-gradient-to-br from-rose-400 to-red-500"
          iconBg="bg-white/25"
          icon={
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="4"
                fill="currentColor"
                stroke="none"
                opacity="0.25"
              />
              <path
                d="M8 8l8 8M16 8l-8 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </div>

      {/* ── Category Performance ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">
          Category Performance
        </h2>
      </div>

      <div className="flex flex-col gap-3 mb-7">
        <CategoryCard
          title="Project"
          rows={mfRows}
          donutColor="#7c3aed"
          donutTrack="#c4b5fd"
          accentBorder="border-violet-100"
          accentText="text-violet-700"
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          milestoneSegments={projectSegments}
        />
        <CategoryCard
          title="Coding"
          rows={sfRows}
          donutColor="#2563eb"
          donutTrack="#93c5fd"
          accentBorder="border-blue-100"
          accentText="text-blue-700"
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                d="M8 9l-3 3 3 3M16 9l3 3-3 3M12 6l-2 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          milestoneSegments={codingSegments}
        />
        <CategoryCard
          title="Skill Assist Handson"
          rows={saRows}
          donutColor="#0d9488"
          donutTrack="#ccfbf1"
          accentBorder="border-teal-100"
          accentText="text-teal-700"
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                d="M13 10V3L4 14h7v7l9-11h-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          milestoneSegments={saSegments}
        />
      </div>

      {/* ── Key Insights ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase mb-3">
          Key Insights
        </h2>
        <div className="flex flex-wrap gap-4">
          <InsightCard
            label="High Quality Content"
            value={`${acceptanceRate}% acceptance rate`}
            detail={`${totalAccepted} of ${totalShared} entries accepted`}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            }
          />
          <InsightCard
            label="Assessment Focused"
            value={`${assessmentPct}% assessments`}
            detail={`${assessmentCount} assessment entries shared`}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <InsightCard
            label="Active Skill Development"
            value={`${saActivityPct}% skill assist`}
            detail={`${saRows.length} skill assist entries`}
            iconBg="bg-teal-50"
            iconColor="text-teal-500"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
