import { Firestore } from '@google-cloud/firestore';
const db = new Firestore({ projectId: 'agora-data-driven' });
const f = await db.collection('flashcards').get();
const rel = f.docs.map(d=>({id:d.id,...d.data()})).filter(x=>['Emotional Intelligence','Personal Development'].includes(x.track));
console.log('total', rel.length);
const by = {};
for (const c of rel) { (by[c.lesson] ||= []).push(c); }
for (const [l, cards] of Object.entries(by)) {
  console.log(`\n######## ${l}  (${cards.length} cards)`);
  cards.sort((a,b)=>(a.order??0)-(b.order??0));
  for (const c of cards) {
    console.log(`\n--- [${c.order}] kind=${c.kind||'-'} topic="${c.topic}" concept="${c.concept}"`);
    console.log('INTUITION:', c.intuition);
    console.log('FORMULA:', c.formula);
  }
}
