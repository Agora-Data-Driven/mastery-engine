import { Firestore } from '@google-cloud/firestore';
const db = new Firestore({ projectId: 'agora-data-driven' });
const s = await db.collection('questions').where('topic','==','Myth of innate talent').get();
console.log('count', s.size);
console.log(JSON.stringify(s.docs[0].data(), null, 2).slice(0,1200));
const f = await db.collection('flashcards').get();
const rel = f.docs.map(d=>({id:d.id,...d.data()})).filter(x=>String(x.lesson||'').includes('Talent Is Overrated'));
console.log('\nflashcards for Talent Is Overrated:', rel.length);
for (const c of rel.slice(0,3)) console.log(JSON.stringify(c,null,1).slice(0,900));
