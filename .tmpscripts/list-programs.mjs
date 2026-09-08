import { Firestore } from '@google-cloud/firestore';
const db = new Firestore({ projectId: 'agora-data-driven' });
const snap = await db.collection('programs').get();
for (const d of snap.docs) {
  const x = d.data();
  console.log(d.id, '|', x.name || x.title, '| category=', x.category, '| tracks=', JSON.stringify(x.tracks||x.track||''));
}
