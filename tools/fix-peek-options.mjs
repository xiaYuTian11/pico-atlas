import fs from 'node:fs';

const FILE = 'src/content/cards.json';
const cards = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const O = {
  rabbit: { id: 'rabbit', zh: '小兔子', emoji: '🐰' },
  elephant: { id: 'elephant', zh: '大象', emoji: '🐘' },
  panda: { id: 'panda', zh: '熊猫', emoji: '🐼' },
};

const plan = {
  'peek-rabbit': 'rabbit',
  'peek-elephant': 'elephant',
  'peek-panda': 'panda',
};

for (const card of cards) {
  const key = plan[card.id];
  if (!key) continue;
  const correct = { ...O[key], isCorrect: true, sound: 'chime' };
  const others = Object.entries(O)
    .filter(([k]) => k !== key)
    .map(([, v]) => ({ ...v, isCorrect: false }));
  card.quizPayload.options = [others[0], correct, others[1]];
}

fs.writeFileSync(FILE, JSON.stringify(cards, null, 2) + '\n', 'utf8');
console.log('peek options patched');
