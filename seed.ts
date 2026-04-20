/**
 * One-time seed script — pushes all data-part1 + data-part2 records into Supabase.
 * Run once after creating the Supabase table:
 *
 *   npm run seed
 */
import { createClient } from '@supabase/supabase-js';
import { dataPart1 } from './src/data/data-part1';
import { dataPart2 } from './src/data/data-part2';
import type { Entry } from './src/types';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(url, key);

function toRow(e: Entry) {
  return {
    id: e.id,
    date: e.date,
    client: e.client,
    program_name: e.programName,
    track_name: e.trackName,
    skill: e.skill,
    question_shared: e.questionShared,
    type: e.type,
    skill_assist: e.skillAssist,
    milestone: e.milestone,
    learning_path: e.learningPath,
    grading: e.grading,
    csdm: e.csdm,
    autograding_eta: e.autogradingEta,
    status: e.status,
    issues: e.issues,
    course_correction: e.courseCorrection,
    remarks: e.remarks,
    is_replaced: e.isReplaced,
    replaced_by_id: e.replacedById,
    replacement_reason: e.replacementReason,
    replaces_id: e.replacesId,
  };
}

async function seed() {
  const all = [...dataPart1, ...dataPart2];
  console.log(`Seeding ${all.length} records…`);

  const BATCH = 200;
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    const { error } = await supabase.from('entries').upsert(batch.map(toRow));
    if (error) {
      console.error(`Batch ${i}–${i + BATCH} failed:`, error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${Math.min(i + BATCH, all.length)} / ${all.length}`);
  }

  console.log('Done!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
