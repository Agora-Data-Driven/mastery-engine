/**
 * BigQuery analytics sink. Operational data lives in Firestore; every logged
 * quiz attempt is ALSO streamed here so you can run SQL / build Looker Studio
 * dashboards over your full history (trends, accuracy by course over time, etc).
 *
 * Writes are best-effort: a BigQuery hiccup must never fail a quiz submission,
 * so callers fire-and-forget and we swallow/log errors here.
 *
 * Table: `mastery_analytics.quiz_log` (day-partitioned on `date`).
 */
import { BigQuery } from '@google-cloud/bigquery';

const DATASET = process.env.BQ_DATASET || 'mastery_analytics';
const TABLE = process.env.BQ_TABLE || 'quiz_log';
const TOPICS_TABLE = process.env.BQ_TOPICS_TABLE || 'topics';

// On Cloud Run, project + credentials come from the runtime automatically.
const bq = new BigQuery();
const table = () => bq.dataset(DATASET).table(TABLE);

/** Shape a logged result into a BQ row. `date` is a JS Date or null. */
function toRow(r, date) {
  return {
    date: (date instanceof Date ? date : new Date()).toISOString(),
    track: r.track || '',
    course: r.course || '',
    lesson: r.lesson || '',
    topic: r.topic || '',
    question: r.question || '',
    result: r.isCorrect ? 1 : 0,
    reviewFlag: r.reviewFlag ? 1 : 0,
  };
}

/**
 * Stream an array of just-logged attempts into BigQuery. Best-effort:
 * resolves to the number of rows inserted, or 0 on any error (logged, not thrown).
 */
export async function streamAttempts(results, date = new Date()) {
  if (!Array.isArray(results) || !results.length) return 0;
  const rows = results.map((r) => toRow(r, date));
  try {
    await table().insert(rows);
    return rows.length;
  } catch (e) {
    // insertAll partial failures surface as e.errors; log and move on.
    console.error('BigQuery insert failed (non-fatal):', e?.message || e);
    return 0;
  }
}

/**
 * One-time backfill: load already-shaped historical rows (from quizLog) into BQ.
 * Throws on failure so the admin endpoint can report it. Inserts in chunks
 * because streaming insertAll caps payload size.
 */
export async function backfillRows(rows, chunk = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    await table().insert(rows.slice(i, i + chunk));
    inserted += Math.min(chunk, rows.length - i);
  }
  return inserted;
}

/**
 * Replace the entire `topics` table with the current per-topic mastery snapshot.
 * Uses a WRITE_TRUNCATE load job (not streaming) so the table always holds
 * exactly one current row per topic — clean for "what should I work on" queries
 * and for Looker Studio. Done via an in-memory NDJSON stream (no temp file/GCS).
 */
export function replaceTopics(rows) {
  return new Promise((resolve, reject) => {
    const ndjson = rows.map((r) => JSON.stringify(r)).join('\n');
    bq.dataset(DATASET)
      .table(TOPICS_TABLE)
      .createWriteStream({
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        writeDisposition: 'WRITE_TRUNCATE',
      })
      .on('error', reject)
      .on('complete', () => resolve(rows.length))
      .end(ndjson);
  });
}
