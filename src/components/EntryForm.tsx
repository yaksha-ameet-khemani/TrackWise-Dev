import { useState, useEffect, useRef } from "react";
import { Entry } from "../types";
import {
  TYPES,
  MILESTONES,
  GRADINGS,
  STATUSES,
  SKILL_ASSIST_OPTS,
  LEARNING_PATH_OPTS,
} from "../constants";
import {
  getClients,
  getSkills,
  getCsdmManagers,
  getPrograms,
  getTracks,
  upsertClient,
  upsertCsdmManager,
  upsertProgram,
  upsertTrack,
} from "../utils/lookups";

// ── Generic lookup combobox ───────────────────────────────────────────────────
// Used for Client, Program Name, and Track Name fields.
// - options: list to show in the dropdown (already filtered to relevant scope)
// - onCreate: called when user types a new name and clicks "+ Create"
// - disabled: greys out the field (e.g. Track is disabled until a Program is chosen)

function LookupCombobox({
  value,
  onChange,
  options,
  onCreate,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onCreate?: (name: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);
  // Extra items added this session (persisted to DB via onCreate, shown immediately)
  const [localExtra, setLocalExtra] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const allOptions = [...new Set([...options, ...localExtra])];
  const filtered = inputVal.trim()
    ? allOptions.filter((o) => o.toLowerCase().includes(inputVal.toLowerCase()))
    : allOptions;
  const exactMatch = allOptions.some(
    (o) => o.toLowerCase() === inputVal.trim().toLowerCase()
  );
  const canCreate = !!onCreate && inputVal.trim() !== "" && !exactMatch;

  useEffect(() => { setInputVal(value); }, [value]);
  // When options change (e.g. client changed so programs list is different), reset extra
  useEffect(() => { setLocalExtra([]); }, [options.join(",")]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (!allOptions.includes(inputVal)) setInputVal(value);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  });

  const select = (name: string) => {
    onChange(name);
    setInputVal(name);
    setOpen(false);
  };

  const create = async () => {
    const name = inputVal.trim();
    if (!name) return;
    setLocalExtra((prev) => [...prev, name]);
    onChange(name);
    setOpen(false);
    if (onCreate) await onCreate(name); // persist in background
  };

  const INPUT_CLS =
    "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={inputVal}
        disabled={disabled}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={() => { if (!disabled) setOpen(true); }}
        className={INPUT_CLS}
        placeholder={disabled ? "Select a program first…" : placeholder}
        autoComplete="off"
      />
      {open && !disabled && (
        <div className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-52 overflow-y-auto">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => select(o)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${
                o === value ? "font-semibold text-blue-700" : "text-gray-900"
              }`}
            >
              {o}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={create}
              className="w-full text-left px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 border-t border-gray-100 font-medium"
            >
              + Create &ldquo;{inputVal.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-xs text-gray-400">No matches found</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Question combobox (unchanged) ─────────────────────────────────────────────
function QuestionCombobox({
  value,
  onChange,
  entries,
}: {
  value: string;
  onChange: (v: string) => void;
  entries: Entry[];
}) {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allQuestions = [...new Set(entries.map((e) => e.questionShared).filter(Boolean))];
  const filtered = inputVal.trim()
    ? allQuestions.filter((q) => q.toLowerCase().includes(inputVal.toLowerCase()))
    : allQuestions;
  const exactMatch = allQuestions.some(
    (q) => q.toLowerCase() === inputVal.trim().toLowerCase()
  );
  const canUseNew = inputVal.trim() !== "" && !exactMatch;

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  });

  const select = (q: string) => { onChange(q); setInputVal(q); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
        placeholder="Type or search a question…"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto">
          {filtered.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => select(q)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${
                q === value ? "font-semibold text-blue-700" : "text-gray-800"
              }`}
            >
              {q}
            </button>
          ))}
          {canUseNew && (
            <button
              type="button"
              onClick={() => { onChange(inputVal.trim()); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-green-700 hover:bg-green-50 border-t border-gray-100 font-medium"
            >
              + Use new: &ldquo;{inputVal.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !canUseNew && (
            <p className="px-3 py-2 text-xs text-gray-400">No matching questions</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Replaces combobox (unchanged) ─────────────────────────────────────────────
function ReplacesCombobox({
  value,
  onChange,
  activeEntries,
}: {
  value: string;
  onChange: (v: string) => void;
  activeEntries: Entry[];
}) {
  const entryLabel = (e: Entry) =>
    `${e.date} | ${e.client} | ${e.skill} | ${
      e.questionShared.length > 60 ? e.questionShared.slice(0, 60) + "…" : e.questionShared
    }`;

  const matchedEntry = activeEntries.find((e) => e.id === value);
  const [inputVal, setInputVal] = useState(matchedEntry ? entryLabel(matchedEntry) : value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const matched = activeEntries.find((e) => e.id === value);
    setInputVal(matched ? entryLabel(matched) : value);
  }, [value]);

  const filtered = inputVal.trim()
    ? activeEntries.filter((e) =>
        entryLabel(e).toLowerCase().includes(inputVal.toLowerCase())
      )
    : activeEntries;

  const hasExactMatch = activeEntries.some((e) => e.id === value);
  const canUseNew = inputVal.trim() !== "" && !hasExactMatch;

  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  });

  const select = (e: Entry) => {
    onChange(e.id);
    setInputVal(entryLabel(e));
    setOpen(false);
  };

  const AMBER_INPUT =
    "w-full px-3 py-1.5 text-sm border border-amber-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400";

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={AMBER_INPUT}
        placeholder="Search or type a question…"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 w-full bg-white border border-amber-300 rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto">
          {filtered.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => select(e)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 ${
                e.id === value ? "font-semibold text-amber-700" : "text-gray-800"
              }`}
            >
              {entryLabel(e)}
            </button>
          ))}
          {filtered.length === 0 && !canUseNew && (
            <p className="px-3 py-2 text-xs text-gray-400">No matching entries</p>
          )}
          {canUseNew && (
            <button
              type="button"
              onClick={() => { onChange(inputVal.trim()); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 border-t border-gray-100 font-medium"
            >
              + Add as new: &ldquo;{inputVal.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── EntryForm ─────────────────────────────────────────────────────────────────

interface Props {
  entries: Entry[];
  editingEntry?: Entry;
  replacingEntry?: Entry;
  onSave: (data: Omit<Entry, "id">, id?: string) => void;
  onSaveAndAddMore?: (data: Omit<Entry, "id">) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: Omit<Entry, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  client: "",
  programName: "",
  trackName: "",
  skill: "",
  questionShared: "",
  type: "MFA",
  skillAssist: "",
  milestone: "Actual",
  learningPath: "",
  grading: "AutoGraded",
  csdm: "",
  autogradingEta: "",
  status: "Under Review",
  issues: "",
  courseCorrection: "",
  remarks: "",
  isReplaced: false,
  replacedById: "",
  replacementReason: "",
  replacesId: "",
};

const INPUT =
  "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400";
const LABEL =
  "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

function normalizeSkill(skill: string): string {
  if (!skill || getSkills().includes(skill)) return skill;
  if (/^Java\s+L\d+$/i.test(skill) || /^Java\s*\(Day/i.test(skill)) return "Java";
  if (/^Junit[-\s]/i.test(skill)) return "Junit";
  if (/^MCQ/i.test(skill)) return "MCQ";
  if (/^Python\+Selenium$/i.test(skill)) return "Python-Selenium";
  if (/^Python[-+]Pyspark$/i.test(skill)) return "Pyspark";
  if (/^Python[-+]Pytest$/i.test(skill)) return "Pytest";
  if (/^Python\s*\(Day/i.test(skill) || /^Python\s+\(Day/i.test(skill)) return "Python";
  if (/^Python\s+Intermediate$/i.test(skill)) return "Python";
  if (/^Python[-+(]/i.test(skill)) return "Python";
  return skill;
}

function initForReplacing(entry: Entry): Omit<Entry, "id"> {
  return {
    ...entry,
    skill: normalizeSkill(entry.skill),
    date: new Date().toISOString().slice(0, 10),
    replacesId: entry.id,
    remarks: `Replacement of "${entry.questionShared}" shared on ${entry.date} for ${entry.client}`,
    questionShared: "",
    isReplaced: false,
    replacedById: "",
    replacementReason: "",
  };
}

export default function EntryForm({
  entries,
  editingEntry,
  replacingEntry,
  onSave,
  onSaveAndAddMore,
  onCancel,
}: Props) {
  const [form, setForm] = useState<Omit<Entry, "id">>(() => {
    if (replacingEntry) return initForReplacing(replacingEntry);
    if (editingEntry) return { ...editingEntry, skill: normalizeSkill(editingEntry.skill) };
    return { ...EMPTY };
  });
  const [isReplacement, setIsReplacement] = useState(
    !!editingEntry?.replacesId || !!replacingEntry,
  );
  // Multi-question list — only used in new-entry mode (edit/replace keeps single field)
  const [questions, setQuestions] = useState<string[]>([""]);

  useEffect(() => {
    if (replacingEntry) {
      setForm(initForReplacing(replacingEntry));
      setIsReplacement(true);
      setQuestions([""]);
    } else if (editingEntry) {
      setForm({ ...editingEntry, skill: normalizeSkill(editingEntry.skill) });
      setIsReplacement(!!editingEntry.replacesId);
      setQuestions([editingEntry.questionShared]);
    } else {
      setForm({ ...EMPTY });
      setIsReplacement(false);
      setQuestions([""]);
    }
  }, [editingEntry, replacingEntry]);

  const set = <K extends keyof Omit<Entry, "id">>(
    key: K,
    value: Omit<Entry, "id">[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // Cascading resets: changing client clears program+track; changing program clears track
  const handleClientChange = (v: string) =>
    setForm((prev) => ({ ...prev, client: v, programName: "", trackName: "" }));

  const handleProgramChange = (v: string) =>
    setForm((prev) => ({ ...prev, programName: v, trackName: "" }));

  const activeEntries = entries.filter(
    (e) => !e.isReplaced && e.id !== editingEntry?.id,
  );

  const isEdit = !!editingEntry;
  const isReplace = !!replacingEntry;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (isEdit || isReplace) {
      // Single-question path for edit / replace
      if (!form.date || !form.client || !form.skill || !form.questionShared) {
        alert(
          form.type === "MCQ"
            ? "Please fill required fields: Date, Client, Skill/Tool, No. of Questions."
            : "Please fill required fields: Date, Client, Skill/Tool, Questions Shared.",
        );
        return;
      }
      if (isReplacement && !form.replacesId) {
        alert("Please select or enter the question this replaces.");
        return;
      }
      onSave(
        { ...form, replacesId: isReplacement ? form.replacesId : "" },
        editingEntry?.id,
      );
      return;
    }

    // Multi-question path for new entries
    const nonEmpty = questions.filter((q) => q.trim());
    if (!form.date || !form.client || !form.skill || nonEmpty.length === 0) {
      alert(
        form.type === "MCQ"
          ? "Please fill required fields: Date, Client, Skill/Tool, No. of Questions."
          : "Please fill required fields: Date, Client, Skill/Tool, and at least one Question.",
      );
      return;
    }

    // Save all but the last via onSaveAndAddMore, then call onSave for the last
    // (onSave triggers navigation; onSaveAndAddMore stays on the form)
    for (let i = 0; i < nonEmpty.length - 1; i++) {
      await onSaveAndAddMore?.({ ...form, questionShared: nonEmpty[i], replacesId: "" });
    }
    onSave({ ...form, questionShared: nonEmpty[nonEmpty.length - 1], replacesId: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          {isEdit ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : isReplace ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Entry" : isReplace ? "Replace Entry" : "Log New Entry"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isEdit ? "Update the details of this content share" : isReplace ? `Replacing: ${replacingEntry.questionShared.length > 60 ? replacingEntry.questionShared.slice(0, 60) + "…" : replacingEntry.questionShared}` : "Record a new content share activity"}
          </p>
        </div>
      </div>

      {/* Section: Basic Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-4">Basic Info</p>
        <div className="grid grid-cols-3 gap-4">

        {/* Date */}
        <div>
          <label className={LABEL}>
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={INPUT}
          />
        </div>

        {/* Client — DB-backed combobox */}
        <div>
          <label className={LABEL}>
            Client <span className="text-red-500">*</span>
          </label>
          <LookupCombobox
            value={form.client}
            onChange={handleClientChange}
            options={getClients()}
            onCreate={(name) => upsertClient(name).then(() => {})}
            placeholder="Type or select client…"
          />
        </div>

        {/* Program Name — filtered by selected client */}
        <div>
          <label className={LABEL}>Name of Program</label>
          <LookupCombobox
            value={form.programName}
            onChange={handleProgramChange}
            options={getPrograms(form.client)}
            onCreate={(name) => upsertProgram(name, form.client).then(() => {})}
            placeholder={form.client ? "Type or select program…" : "Select a client first…"}
            disabled={!form.client}
          />
        </div>

        {/* Track Name — filtered by selected program */}
        <div>
          <label className={LABEL}>Track Name</label>
          <LookupCombobox
            value={form.trackName}
            onChange={(v) => set("trackName", v)}
            options={getTracks(form.programName, form.client)}
            onCreate={(name) => upsertTrack(name, form.programName, form.client).then(() => {})}
            placeholder={form.programName ? "Type or select track…" : "Select a program first…"}
            disabled={!form.programName}
          />
        </div>

        </div>
      </div>

      {/* Section: Content Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">Content Details</p>
        <div className="grid grid-cols-3 gap-4">

        {/* Skill — DB-backed select */}
        <div>
          <label className={LABEL}>
            Assessments (Skill / Tool) <span className="text-red-500">*</span>
          </label>
          <select
            value={form.skill}
            onChange={(e) => set("skill", e.target.value)}
            className={INPUT}
          >
            <option value="">— select —</option>
            {getSkills().map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className={LABEL}>MFA / SF / MCQ</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value as Entry["type"])}
            className={INPUT}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Milestone */}
        <div
          className={
            form.milestone.startsWith("Milestone ") || form.milestone === "Milestone"
              ? "col-span-2"
              : ""
          }
        >
          <label className={LABEL}>Final Milestone</label>
          <div className="flex gap-2">
            <select
              value={
                form.milestone.startsWith("Milestone ") ? "Milestone" : form.milestone
              }
              onChange={(e) => {
                if (e.target.value === "Milestone") {
                  set("milestone", "Milestone 1");
                } else {
                  set("milestone", e.target.value);
                }
              }}
              className={INPUT}
            >
              <option value="">— select —</option>
              {MILESTONES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {form.milestone.startsWith("Milestone ") && (
              <select
                value={form.milestone.split(" ")[1] ?? "1"}
                onChange={(e) => set("milestone", `Milestone ${e.target.value}`)}
                className={`${INPUT} w-28 flex-shrink-0`}
                title="Milestone number"
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Grading */}
        <div>
          <label className={LABEL}>Manual / AutoGraded</label>
          <select
            value={form.grading}
            onChange={(e) => set("grading", e.target.value as Entry["grading"])}
            className={INPUT}
          >
            <option value="">— select —</option>
            {GRADINGS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={LABEL}>
            Status <span className="text-red-500">*</span>
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={INPUT}
          >
            <option value="">— select —</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* CSDM */}
        <div>
          <label className={LABEL}>CSDM</label>
          <LookupCombobox
            value={form.csdm}
            onChange={(v) => set("csdm", v)}
            options={getCsdmManagers()}
            onCreate={(name) => upsertCsdmManager(name).then(() => {})}
            placeholder="Type or select CSDM…"
          />
        </div>

        {/* Autograding ETA */}
        <div>
          <label className={LABEL}>Intro to Autograding – ETA</label>
          <input
            type="text"
            value={form.autogradingEta}
            onChange={(e) => set("autogradingEta", e.target.value)}
            className={INPUT}
            placeholder="e.g. Already Autograded"
          />
        </div>

        {/* SkillAssist */}
        <div>
          <label className={LABEL}>SkillAssist</label>
          <select
            value={form.skillAssist}
            onChange={(e) => set("skillAssist", e.target.value)}
            className={INPUT}
          >
            <option value="">—</option>
            {SKILL_ASSIST_OPTS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Learning Path */}
        <div className="col-span-2">
          <label className={LABEL}>Learning Paths – Digital Learning</label>
          <select
            value={form.learningPath}
            onChange={(e) => set("learningPath", e.target.value)}
            className={INPUT}
          >
            <option value="">—</option>
            {LEARNING_PATH_OPTS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Questions Shared / No. of Questions */}
        <div className="col-span-3">
          {form.type === "MCQ" ? (
            <>
              <label className={LABEL}>
                No. of Questions <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.questionShared}
                onChange={(e) => set("questionShared", e.target.value)}
                className={INPUT}
                placeholder="Enter number of questions"
              />
            </>
          ) : replacingEntry ? (
            <>
              <label className={LABEL}>
                New Question <span className="text-red-500">*</span>
              </label>
              <QuestionCombobox
                value={form.questionShared}
                onChange={(v) => set("questionShared", v)}
                entries={entries}
              />
            </>
          ) : isEdit ? (
            <>
              <label className={LABEL}>
                Questions Shared <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.questionShared}
                onChange={(e) => set("questionShared", e.target.value)}
                rows={2}
                className={`${INPUT} resize-y`}
                placeholder="Enter the question / use-case name"
              />
            </>
          ) : (
            <>
              <label className={LABEL}>
                Questions Shared <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-2">
                {questions.map((q, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-5 h-7 flex items-center justify-center text-xs font-semibold text-gray-400 select-none">
                      {i + 1}.
                    </div>
                    <textarea
                      value={q}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[i] = e.target.value;
                        setQuestions(updated);
                      }}
                      rows={2}
                      className={`${INPUT} resize-y flex-1`}
                      placeholder="Enter the question / use-case name"
                      autoFocus={i > 0 && q === ""}
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                        className="flex-shrink-0 mt-1 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove this question"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setQuestions([...questions, ""])}
                className="mt-2 px-4 py-1.5 text-xs font-semibold text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors"
              >
                + Add More
              </button>
            </>
          )}
        </div>

        </div>
      </div>

      {/* Section: Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-4">Notes</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Issues Highlighted</label>
            <textarea
              value={form.issues}
              onChange={(e) => set("issues", e.target.value)}
              rows={2}
              className={`${INPUT} resize-y`}
            />
          </div>
          <div>
            <label className={LABEL}>Course Correction</label>
            <textarea
              value={form.courseCorrection}
              onChange={(e) => set("courseCorrection", e.target.value)}
              rows={2}
              className={`${INPUT} resize-y`}
            />
          </div>
          <div>
            <label className={LABEL}>Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              rows={2}
              className={`${INPUT} resize-y`}
            />
          </div>
        </div>
      </div>

      {/* Section: Replacement */}
      {editingEntry ? (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-5">
          <p className="text-xs text-gray-400 italic">
            Replacement linking is only available when logging a new entry. To replace this question, use <strong>Log Entry</strong> and fill in the new question's details there.
          </p>
        </div>
      ) : (
        <div
          className={`rounded-2xl border p-5 mb-5 transition-colors ${
            isReplacement ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50"
          }`}
        >
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              checked={isReplacement}
              onChange={(e) => {
                setIsReplacement(e.target.checked);
                if (!e.target.checked) set("replacesId", "");
              }}
              className="rounded"
            />
            This new question replaces a previously shared question
          </label>
          <p className="text-xs text-gray-400 mt-1 ml-5">
            Fill in the details of the <strong>new</strong> question above, then select the <strong>old</strong> question being replaced below.
          </p>

          {isReplacement && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Old question being replaced</label>
                <ReplacesCombobox
                  value={form.replacesId}
                  onChange={(v) => {
                    const original = entries.find((e) => e.id === v);
                    const autoRemark = original
                      ? `Replacement of "${original.questionShared}" shared on ${original.date} for ${original.client}`
                      : v.trim()
                      ? `Replacement of "${v.trim()}"`
                      : "";
                    setForm((prev) => ({
                      ...prev,
                      replacesId: v,
                      date: new Date().toISOString().slice(0, 10),
                      remarks: autoRemark,
                    }));
                  }}
                  activeEntries={activeEntries}
                />
              </div>
              <div>
                <label className={LABEL}>Reason for replacement</label>
                <input
                  type="text"
                  value={form.replacementReason}
                  onChange={(e) => set("replacementReason", e.target.value)}
                  placeholder="e.g. Swapped as per client feedback"
                  className={`${INPUT} border-amber-400 focus:ring-amber-400`}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit row */}
      <div className="flex gap-3">
        <button
          type="submit"
          className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          {isEdit ? "Update Entry" : "Save Entry"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
