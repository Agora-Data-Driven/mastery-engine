import { Firestore } from '@google-cloud/firestore';
const db = new Firestore({ projectId: 'agora-data-driven' });
const snap = await db.collection('topics').where('program','==','philosophy').get();
console.log('rows:', snap.size);
const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
const byT = {};
for (const r of rows) {
  const k = `${r.track}`;
  byT[k] ||= {};
  byT[k][r.course] ||= {};
  byT[k][r.course][r.lesson] ||= [];
  byT[k][r.course][r.lesson].push(r);
}
for (const [t, courses] of Object.entries(byT)) {
  console.log(`\n=== TRACK: ${t}`);
  for (const [c, lessons] of Object.entries(courses)) {
    console.log(`  -- COURSE: ${c}`);
    for (const [l, tops] of Object.entries(lessons)) {
      console.log(`     LESSON: ${l}  (${tops.length} topics)`);
      tops.sort((a,b)=>(a.order??0)-(b.order??0));
      for (const tp of tops) console.log(`        [${tp.order}] ${tp.topic}   (q=${tp.questionCount??tp.qCount??0})  id=${tp.id}`);
    }
  }
}
