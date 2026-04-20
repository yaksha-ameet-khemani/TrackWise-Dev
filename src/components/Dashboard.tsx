import { Entry } from "../types";
import StatusBadge from "./StatusBadge";
import { getClients } from "../utils/lookups";

interface Props {
  entries: Entry[];
  onEdit: (id: string) => void;
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

export default function Dashboard({ entries, onEdit }: Props) {
  const active = entries.filter((e) => !e.isReplaced);
  const total = active.length;
  const clients = getClients().length;
  const pending = active.filter((e) =>
    ["Under Review", "Pending"].includes(e.status),
  ).length;
  const approved = active.filter((e) => e.status === "Approved").length;
  const replaced = entries.filter((e) => e.isReplaced).length;

  const recent = [...active]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  // Start with all known clients at 0, then count active entries per client
  const clientCounts = getClients().reduce<Record<string, number>>((acc, c) => {
    acc[c] = 0;
    return acc;
  }, {});
  active.forEach((e) => {
    if (e.client) clientCounts[e.client] = (clientCounts[e.client] ?? 0) + 1;
  });

  const statusCounts = active.reduce<Record<string, number>>((acc, e) => {
    const s = e.status || "Unknown";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Metric cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <MetricCard
          label="Active Entries"
          value={total}
          sub="Currently tracked"
        />
        <MetricCard label="Clients" value={clients} sub="Unique clients" />
        <MetricCard
          label="Pending Review"
          value={pending}
          sub="Awaiting decision"
        />
        <MetricCard label="Approved" value={approved} sub="Client approved" />
        <MetricCard
          label="Replaced Qs"
          value={replaced}
          sub="Historical swaps"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* By client */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Active entries by client
          </p>
          {Object.entries(clientCounts).map(([c, n]) => (
            <div key={c} className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
                {c}
              </span>
              <div className="flex-shrink-0 h-1.5 rounded-full bg-blue-100 w-24">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.round((n / total) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900 w-5 text-right flex-shrink-0">
                {n}
              </span>
            </div>
          ))}
        </div>

        {/* By status */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            By status
          </p>
          {Object.entries(statusCounts).map(([s, n]) => (
            <div key={s} className="flex items-center justify-between mb-2">
              <StatusBadge status={s} />
              <span className="text-sm font-semibold text-gray-900">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recent active entries
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  "Date",
                  "Client",
                  "Program",
                  "Track",
                  "Skill",
                  "Question Shared",
                  "Type",
                  "Milestone",
                  "CSDM",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => onEdit(e.id)}
                  className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                    {e.date}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.client}</td>
                  <td
                    className="px-3 py-2 max-w-[80px] truncate text-gray-600"
                    title={e.programName}
                  >
                    {e.programName}
                  </td>
                  <td
                    className="px-3 py-2 max-w-[100px] truncate text-gray-600"
                    title={e.trackName}
                  >
                    {e.trackName}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.skill}</td>
                  <td
                    className="px-3 py-2 max-w-[180px] truncate"
                    title={e.questionShared}
                  >
                    {e.questionShared}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{e.type}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {e.milestone}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {e.csdm}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
