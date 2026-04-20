import { supabase } from '../lib/supabase';
import { Entry } from '../types';
import {
  clientIdByName,
  skillIdByName,
  programIdByName,
  trackIdByName,
  csdmIdByName,
  upsertProgram,
  upsertTrack,
} from './lookups';

// ── column mapping ────────────────────────────────────────────────────────────

// DB row (with joins) → Entry (camelCase names)
// Falls back to old text columns during the transition period.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): Entry {
  return {
    id:               row.id,
    date:             row.date,
    client:           row.clients?.name       ?? row.client       ?? '',
    programName:      row.programs?.name      ?? row.program_name ?? '',
    trackName:        row.tracks?.name        ?? row.track_name   ?? '',
    skill:            row.skills?.name        ?? row.skill        ?? '',
    questionShared:   row.question_shared,
    type:             row.type,
    skillAssist:      row.skill_assist,
    milestone:        row.milestone,
    learningPath:     row.learning_path,
    grading:          row.grading,
    csdm:             row.csdm_managers?.name ?? row.csdm         ?? '',
    autogradingEta:   row.autograding_eta,
    status:           row.status,
    issues:           row.issues,
    courseCorrection: row.course_correction,
    remarks:          row.remarks,
    isReplaced:       row.is_replaced,
    replacedById:     row.replaced_by_id,
    replacementReason: row.replacement_reason,
    replacesId:       row.replaces_id,
  };
}

// Entry (camelCase names) → DB row (snake_case IDs)
// Upserts programs/tracks if the user typed a new name.
async function toRow(e: Entry) {
  let programId = programIdByName(e.programName, e.client);
  if (!programId && e.programName.trim()) {
    programId = await upsertProgram(e.programName, e.client);
  }

  let trackId = trackIdByName(e.trackName, e.programName, e.client);
  if (!trackId && e.trackName.trim()) {
    trackId = await upsertTrack(e.trackName, e.programName, e.client);
  }

  return {
    id:                e.id,
    date:              e.date,
    // FK columns (new)
    client_id:         clientIdByName(e.client),
    skill_id:          skillIdByName(e.skill),
    program_id:        programId,
    track_id:          trackId,
    csdm_id:           csdmIdByName(e.csdm) || null,
    // Text columns (kept during transition — drop after verifying app works)
    client:            e.client,
    skill:             e.skill,
    program_name:      e.programName,
    track_name:        e.trackName,
    csdm:              e.csdm,
    // Remaining fields
    question_shared:   e.questionShared,
    type:              e.type,
    skill_assist:      e.skillAssist,
    milestone:         e.milestone,
    learning_path:     e.learningPath,
    grading:           e.grading,
    autograding_eta:   e.autogradingEta,
    status:            e.status,
    issues:            e.issues,
    course_correction: e.courseCorrection,
    remarks:           e.remarks,
    is_replaced:       e.isReplaced,
    replaced_by_id:    e.replacedById,
    replacement_reason: e.replacementReason,
    replaces_id:       e.replacesId,
  };
}

// ── operations ────────────────────────────────────────────────────────────────

// Try relational join first; falls back to plain text columns in fromRow
// if FK constraints haven't been created in the DB yet.
const ENTRY_SELECT = `
  *,
  clients(name),
  skills(name),
  programs(name),
  tracks(name),
  csdm_managers(name)
`;

export async function fetchEntries(): Promise<Entry[]> {
  const PAGE = 1000;
  const all: Entry[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('entries')
      .select(ENTRY_SELECT)
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data.map(fromRow));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

/** Insert or update a single entry */
export async function upsertEntry(entry: Entry): Promise<void> {
  const row = await toRow(entry);
  const { error } = await supabase.from('entries').upsert(row);
  if (error) throw error;
}

/** Insert or update multiple entries (used when a save touches 2–3 rows) */
export async function upsertEntries(entries: Entry[]): Promise<void> {
  if (entries.length === 0) return;
  const rows = await Promise.all(entries.map(toRow));
  const { error } = await supabase.from('entries').upsert(rows);
  if (error) throw error;
}

/** Delete a single entry by id */
export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}

/** Bulk insert — used by the one-time seed script only */
export async function seedEntries(entries: Entry[]): Promise<void> {
  const BATCH = 200;
  for (let i = 0; i < entries.length; i += BATCH) {
    const rows = await Promise.all(entries.slice(i, i + BATCH).map(toRow));
    const { error } = await supabase.from('entries').upsert(rows);
    if (error) throw error;
    console.log(`Seeded ${Math.min(i + BATCH, entries.length)} / ${entries.length}`);
  }
}
