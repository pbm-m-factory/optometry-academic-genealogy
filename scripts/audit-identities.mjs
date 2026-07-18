import fs from 'node:fs';

const dataPath = process.argv[2] || 'public/data/genealogy.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const normalize = (value = '') => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const parts = (name) => normalize(name).split(' ').filter(Boolean);
const pairKey = (a, b) => [a, b].sort().join('|');
const reviewed = new Map();

for (const item of data.duplicateReview?.reviewedDistinct || []) {
  reviewed.set(pairKey(...item.personIds), { status: item.status, note: item.note });
}
for (const item of data.duplicateReview?.unresolved || []) {
  reviewed.set(pairKey(...item.personIds), { status: item.status, note: item.note });
}

const candidates = [];
for (let i = 0; i < data.people.length; i += 1) {
  for (let j = i + 1; j < data.people.length; j += 1) {
    const a = data.people[i];
    const b = data.people[j];
    const ap = parts(a.name);
    const bp = parts(b.name);
    if (!ap.length || !bp.length) continue;

    const af = ap[0];
    const bf = bp[0];
    const al = ap.at(-1);
    const bl = bp.at(-1);
    let reason = '';

    if (normalize(a.name) === normalize(b.name)) reason = 'exact normalized name';
    else if (al === bl && af === bf) reason = 'middle-name variant';
    else if (al === bl && af[0] === bf[0] && (af.length === 1 || bf.length === 1)) reason = 'initial versus full name';
    else if (af === bl && al === bf) reason = 'reversed first and family names';

    if (!reason) continue;
    const review = reviewed.get(pairKey(a.id, b.id));
    candidates.push({ personIds: [a.id, b.id], names: [a.name, b.name], reason, reviewStatus: review?.status || 'unreviewed', note: review?.note || '' });
  }
}

const unreviewed = candidates.filter((item) => item.reviewStatus === 'unreviewed');
console.log(`Identity audit: ${data.people.length} people; ${candidates.length} candidate pair(s); ${unreviewed.length} unreviewed.`);
for (const item of candidates) {
  console.log(`- ${item.personIds[0]} ${item.names[0]} <> ${item.personIds[1]} ${item.names[1]} | ${item.reason} | ${item.reviewStatus}`);
}

if (unreviewed.length) {
  console.error('Add evidence, merge confirmed duplicates, or record the pair in duplicateReview before publishing.');
  process.exit(1);
}
