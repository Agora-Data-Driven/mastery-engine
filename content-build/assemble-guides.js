/**
 * Publish HAND-AUTHORED study guides and visual pages into prod Firestore.
 *
 * Sibling of assemble.cjs, same posture: validate first, dry-run by default,
 * idempotent, `--apply` to write. Where that one publishes the source material
 * (doc.md -> transcripts, questions, cards), this one publishes the two learner-
 * facing ARTIFACTS built from it:
 *
 *   content/<CODE>/<NN>/guide.md      -> studyGuides   (the Lesson button)
 *   content/<CODE>/<NN>/visual.html   -> visualGuides  (the ✨ Visuals button)
 *   content/<CODE>/<NN>/visual.json   -> that page's title + spoken index
 *
 * Both are written with `locked: true`, so the app refuses to regenerate over
 * them without an explicit confirm — see LOCKED_MESSAGE in server.js. There is no
 * undo inside the app; the copy in this repo is the only original.
 *
 * 🔴 THE GUIDE IS WRITTEN FIRST, ALWAYS. `freshVisualGuide()` treats a visual
 * older than its study guide as a cache MISS. Write them the other way round and
 * every hand-made page reads as stale and is silently replaced by a model on the
 * first click — which is exactly the failure this script exists to prevent.
 *
 * Usage:
 *   node content-build/assemble-guides.js                 # validate everything, write nothing
 *   node content-build/assemble-guides.js --course=DE202
 *   node content-build/assemble-guides.js --course=DE202 --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SPECS = path.join(HERE, 'specs');
const CONTENT = path.join(HERE, 'content');

const APPLY = process.argv.includes('--apply');
const only = (process.argv.find((a) => a.startsWith('--course=')) || '').split('=')[1] || null;

const {
  studyGuideId, visualGuideId, saveStudyGuide, saveVisualGuide, getStudyGuide, getVisualGuide,
} = await import('../lib/firestore.js');
const {
  visualGuideLooksComplete, splitVisualPanels, visualPanelIndex, canSwapVisualPanel,
} = await import('../lib/gemini.js');

const PROGRAM = 'ai_engineering';
const SOURCE = 'claude-authored';
// Mirrors server.js `GUIDE_KIND`. One guide per section since the Review/Lesson
// merge; a different value here would bank artifacts no button can ever reach.
const GUIDE_KIND = 'lesson';
const MIN_GUIDE_CHARS = 1500;

const problems = [];
const note = (m) => problems.push(m);

/** One lesson's authored artifacts, or null when nothing has been written yet. */
function loadUnit(dir) {
  const read = (f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : null);
  const guide = read('guide.md');
  const html = read('visual.html');
  const metaRaw = read('visual.json');
  if (!guide && !html) return null;
  let meta = null;
  if (metaRaw) {
    try { meta = JSON.parse(metaRaw); } catch (e) { return { guide, html, meta: null, parseError: e.message }; }
  }
  return { guide, html, meta };
}

/**
 * Everything that must hold before an artifact reaches the cache.
 *
 * The visual checks run the SAME functions the server runs, deliberately: a page
 * that fails `visualGuideLooksComplete` would be rejected at generation time, and
 * one whose panels fail `canSwapVisualPanel` cannot be repaired a visual at a
 * time — which is most of the value of hand-making it.
 */
function validate(code, idx, lesson, unit) {
  const at = `${code}/${idx}`;
  const out = { guide: null, visual: null };

  if (unit.parseError) { note(`${at}: visual.json is not valid JSON — ${unit.parseError}`); return out; }

  if (unit.guide) {
    const g = unit.guide.trim();
    if (g.length < MIN_GUIDE_CHARS) note(`${at}: guide.md is only ${g.length} chars (min ${MIN_GUIDE_CHARS})`);
    else out.guide = g;
  }

  if (!unit.html) return out;
  const html = unit.html.trim();
  if (!visualGuideLooksComplete(html)) {
    note(`${at}: visual.html does not read as a complete document (must end </body></html>)`);
    return out;
  }
  const panels = splitVisualPanels(html);
  if (!panels.length) { note(`${at}: visual.html has no data-viz-panel sections`); return out; }

  const index = visualPanelIndex(html);
  const unnamed = index.filter((p) => !p.name);
  if (unnamed.length) note(`${at}: ${unnamed.length} panel(s) have no matching tab button — the assistant cannot name them`);

  // Every panel must be individually rewritable, or Regenerate's per-visual
  // checkboxes are greyed out on a page we control and could simply have written
  // correctly. Catching it here is the whole point of validating with the real check.
  for (const p of panels) {
    const v = canSwapVisualPanel(html, p.key);
    if (!v.ok) note(`${at}: visual ${p.key} is not individually editable — ${v.reason}`);
  }

  if (!unit.meta || !unit.meta.title) { note(`${at}: visual.json is missing a title`); return out; }
  const outline = Array.isArray(unit.meta.outline) ? unit.meta.outline.join('\n') : String(unit.meta.outline || '');
  if (!outline.trim()) { note(`${at}: visual.json is missing the outline (the assistant's only view of the page)`); return out; }
  // The spoken index must cover exactly the panels that exist, or "teach me
  // visual 3" resolves to something that is not on screen.
  for (const p of panels) {
    if (!new RegExp(`^\\s*${p.key}\\s*[.)]`, 'm').test(outline)) note(`${at}: outline has no line for visual ${p.key}`);
  }
  out.visual = { html, title: unit.meta.title, outline, panels: panels.length, names: index.map((p) => p.name) };
  return out;
}

/* --------------------------------- run ---------------------------------- */
const specs = fs.readdirSync(SPECS).filter((f) => f.endsWith('.json'));
let units = 0, wroteGuides = 0, wroteVisuals = 0, skipped = 0;

for (const file of specs) {
  const spec = JSON.parse(fs.readFileSync(path.join(SPECS, file), 'utf8'));
  const code = spec.course.split(':')[0].replace(/\s+/g, '');
  if (only && code !== only) continue;

  for (const sl of spec.lessons) {
    const dir = path.join(CONTENT, code, sl.index);
    if (!fs.existsSync(dir)) continue;
    const unit = loadUnit(dir);
    if (!unit) continue;
    units += 1;

    const v = validate(code, sl.index, sl.lesson, unit);
    // The scope tuple a progress node carries. `topic: ''` = lesson grain, which
    // is the grain doc.md is authored at and where the Learn menu's buttons sit.
    const scope = {
      program: PROGRAM, kind: GUIDE_KIND,
      track: spec.track, course: spec.course, lesson: sl.lesson, topic: '',
    };
    const gid = studyGuideId(scope), vid = visualGuideId(scope);
    console.log(`\n${code}/${sl.index}  ${sl.lesson}`);
    console.log(`   guide  ${v.guide ? `${v.guide.length} chars` : '—'}   id=${gid}`);
    console.log(`   visual ${v.visual ? `${v.visual.panels} panels, ${Buffer.byteLength(v.visual.html)} bytes — ${v.visual.names.join(' · ')}` : '—'}`);

    if (!APPLY) { skipped += 1; continue; }

    // 🔴 Guide FIRST — see the header. The visual must never carry the older
    // timestamp of the two or freshVisualGuide() discards it on the next read.
    if (v.guide) {
      await saveStudyGuide(scope, v.guide, {
        scopeLabel: sl.lesson, source: SOURCE, locked: true, grounded: true, critique: '',
      });
      wroteGuides += 1;
      console.log('   -> studyGuides written (locked)');
    }
    if (v.visual) {
      const existing = await getVisualGuide(scope).catch(() => null);
      await saveVisualGuide(scope, v.visual.html, {
        scopeLabel: sl.lesson, title: v.visual.title, outline: v.visual.outline,
        source: SOURCE, locked: true, critique: '', patched: [],
        attempt: (Number(existing?.attempt) || 0) + 1,
      });
      wroteVisuals += 1;
      console.log('   -> visualGuides written (locked)');
    }
    // Cheap proof the pair is consistent, since the ordering rule is invisible
    // in the data until a learner clicks and the page silently rebuilds.
    if (v.guide && v.visual) {
      const [g2, v2] = await Promise.all([getStudyGuide(scope), getVisualGuide(scope)]);
      if (g2?.updatedAt && v2?.updatedAt && g2.updatedAt > v2.updatedAt) {
        note(`${code}/${sl.index}: WROTE OUT OF ORDER — guide is newer than its visual, the page will rebuild on first open`);
      }
    }
  }
}

console.log(`\n${'='.repeat(58)}`);
console.log(`units with authored artifacts: ${units}`);
if (APPLY) console.log(`written: ${wroteGuides} guides, ${wroteVisuals} visual pages`);
else console.log(`DRY RUN — nothing written (${skipped} unit(s) would be). Re-run with --apply.`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('validation: clean');
