import { supabase } from '../lib/supabase';

export interface LookupItem  { id: number; name: string; }
export interface ProgramItem { id: number; name: string; client_id: number; }
export interface TrackItem   { id: number; name: string; program_id: number; }

// ── In-memory caches (loaded once on app startup) ─────────────────────────────
let clients:      LookupItem[]  = [];
let skills:       LookupItem[]  = [];
let programs:     ProgramItem[] = [];
let tracks:       TrackItem[]   = [];
let csdmManagers: LookupItem[]  = [];

export async function loadLookups(): Promise<void> {
  const [c, s, p, t, m] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('skills').select('id, name').order('name'),
    supabase.from('programs').select('id, name, client_id').order('name'),
    supabase.from('tracks').select('id, name, program_id').order('name'),
    supabase.from('csdm_managers').select('id, name').order('name'),
  ]);
  if (c.error) throw c.error;
  if (s.error) throw s.error;
  if (p.error) throw p.error;
  if (t.error) throw t.error;
  if (m.error) throw m.error;
  clients      = c.data ?? [];
  skills       = s.data ?? [];
  programs     = p.data ?? [];
  tracks       = t.data ?? [];
  csdmManagers = m.data ?? [];
}

// ── Getters for dropdown options ──────────────────────────────────────────────
export const getClients      = () => clients.map(c => c.name);
export const getSkills       = () => skills.map(s => s.name);
export const getCsdmManagers = () => csdmManagers.map(m => m.name);

export const getPrograms = (clientName: string): string[] => {
  const clientId = clients.find(c => c.name === clientName)?.id;
  if (!clientId) return [];
  return programs.filter(p => p.client_id === clientId).map(p => p.name);
};

export const getTracks = (programName: string, clientName: string): string[] => {
  const clientId  = clients.find(c => c.name === clientName)?.id;
  const programId = programs.find(p => p.name === programName && p.client_id === clientId)?.id;
  if (!programId) return [];
  return tracks.filter(t => t.program_id === programId).map(t => t.name);
};

// ── Resolve name → ID (for writing to DB) ─────────────────────────────────────
export const clientIdByName = (name: string) =>
  clients.find(c => c.name === name)?.id ?? null;

export const skillIdByName = (name: string) =>
  skills.find(s => s.name === name)?.id ?? null;

export const programIdByName = (name: string, clientName: string) => {
  const clientId = clients.find(c => c.name === clientName)?.id;
  return programs.find(p => p.name === name && p.client_id === clientId)?.id ?? null;
};

export const trackIdByName = (name: string, programName: string, clientName: string) => {
  const clientId  = clients.find(c => c.name === clientName)?.id;
  const programId = programs.find(p => p.name === programName && p.client_id === clientId)?.id;
  return tracks.find(t => t.name === name && t.program_id === programId)?.id ?? null;
};

export const csdmIdByName = (name: string) =>
  csdmManagers.find(m => m.name === name)?.id ?? null;

// ── Upsert helpers (persist dynamically created items and update cache) ────────
export async function upsertCsdmManager(name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = csdmManagers.find(m => m.name === trimmed);
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('csdm_managers')
    .upsert({ name: trimmed }, { onConflict: 'name' })
    .select('id, name')
    .single();
  if (error || !data) return null;
  csdmManagers.push(data);
  return data.id;
}

export async function upsertClient(name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = clients.find(c => c.name === trimmed);
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('clients')
    .upsert({ name: trimmed }, { onConflict: 'name' })
    .select('id, name')
    .single();
  if (error || !data) return null;
  clients.push(data);
  return data.id;
}

export async function upsertProgram(name: string, clientName: string): Promise<number | null> {
  const trimmed  = name.trim();
  const clientId = clientIdByName(clientName);
  if (!trimmed || !clientId) return null;
  const existing = programs.find(p => p.name === trimmed && p.client_id === clientId);
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('programs')
    .upsert({ name: trimmed, client_id: clientId }, { onConflict: 'name,client_id' })
    .select('id, name, client_id')
    .single();
  if (error || !data) return null;
  programs.push(data);
  return data.id;
}

export async function upsertTrack(name: string, programName: string, clientName: string): Promise<number | null> {
  const trimmed   = name.trim();
  const programId = programIdByName(programName, clientName);
  if (!trimmed || !programId) return null;
  const existing = tracks.find(t => t.name === trimmed && t.program_id === programId);
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('tracks')
    .upsert({ name: trimmed, program_id: programId }, { onConflict: 'name,program_id' })
    .select('id, name, program_id')
    .single();
  if (error || !data) return null;
  tracks.push(data);
  return data.id;
}
