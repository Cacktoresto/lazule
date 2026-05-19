import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_DIR = 'data/imports/raw';
const STARTER_WARNING = '# Starter seed system only. Curated list for discovery bootstrap, not a complete perfume database.';

const SEED_DICTIONARY = Object.freeze({
  designer_masculine: [
    'Dior Sauvage Eau de Parfum','Dior Sauvage Elixir','Bleu de Chanel Eau de Parfum','Bleu de Chanel Parfum','Yves Saint Laurent Y Eau de Parfum','Yves Saint Laurent Y Le Parfum','Acqua di Gio Profumo Giorgio Armani','Acqua di Gio Parfum Giorgio Armani','Prada Luna Rossa Carbon','Prada Luna Rossa Ocean','Versace Dylan Blue','Versace Eros Eau de Parfum','Paco Rabanne Invictus','Paco Rabanne 1 Million','Jean Paul Gaultier Le Male Le Parfum','Azzaro The Most Wanted','Givenchy Gentleman Reserve Privee','Hermes Terre d\'Hermes','Hugo Boss Bottled','Dolce & Gabbana The One for Men','Valentino Uomo Born in Roma Intense','Montblanc Explorer','Chanel Allure Homme Sport','Bvlgari Man in Black','Coach for Men','Issey Miyake L\'Eau d\'Issey Pour Homme'
  ],
  designer_feminine: [
    'Yves Saint Laurent Libre Intense','Lancome La Vie Est Belle','Dior J\'adore Eau de Parfum','Chanel Coco Mademoiselle','Chanel Chance Eau Tendre','Giorgio Armani Si Eau de Parfum','Carolina Herrera Good Girl','Prada Paradoxe','Valentino Donna Born in Roma','Mugler Alien','Mugler Angel','Narciso Rodriguez For Her EDT','Dolce & Gabbana Light Blue','Gucci Bloom','Viktor & Rolf Flowerbomb','Givenchy L\'Interdit','Jean Paul Gaultier La Belle','Burberry Her','Tom Ford Black Orchid','Hermes Twilly d\'Hermes'
  ],
  arabic: [
    'Lattafa Khamrah','Lattafa Asad','Lattafa Ameer Al Oudh Intense Oud','Afnan 9PM','Afnan Supremacy Not Only Intense','Armaf Club de Nuit Intense Man','Armaf Club de Nuit Untold','Rasasi Hawas','Rasasi La Yuqawam','Maison Alhambra Tobacco Touch','Maison Alhambra Kismet Angel','Swiss Arabian Shaghaf Oud','Swiss Arabian Casablanca','Al Haramain Amber Oud Gold Edition','Al Haramain Detour Noir','Ajmal Evoke Gold','Ajmal Aristocrat','Fragrance World Barakkat Rouge 540','Paris Corner Emir Vibrant Vetiver Delight','Khadlaj Hareem Al Sultan'
  ],
  niche: [
    'Maison Francis Kurkdjian Baccarat Rouge 540','Parfums de Marly Layton','Parfums de Marly Herod','Creed Aventus','Creed Green Irish Tweed','Nishane Hacivat','Xerjoff Naxos','Amouage Reflection Man','Amouage Interlude Man','Byredo Gypsy Water','Byredo Bal d\'Afrique','Diptyque Philosykos','Le Labo Santal 33','Frederic Malle Portrait of a Lady','Initio Oud for Greatness','Mancera Cedrat Boise','Montale Intense Cafe','Roja Elysium','Memo Irish Leather','Penhaligon\'s Halfeti'
  ],
  classics: [
    'Chanel No 5','Guerlain Shalimar','Dior Fahrenheit','Dior Eau Sauvage','Hermes Equipage','Davidoff Cool Water','Calvin Klein Eternity for Men','Calvin Klein Obsession','Paco Rabanne Pour Homme','Azzaro Pour Homme','Guerlain Vetiver','Yves Saint Laurent Kouros','Aramis Aramis','Jean Paul Gaultier Le Male','Thierry Mugler Angel','Clinique Aromatics Elixir','Acqua di Parma Colonia','Givenchy Amarige'
  ],
  viral: [
    'Maison Francis Kurkdjian Baccarat Rouge 540','Dior Sauvage Elixir','Lattafa Khamrah','Afnan 9PM','Armaf Club de Nuit Intense Man','Yves Saint Laurent Y Eau de Parfum','Jean Paul Gaultier Le Male Elixir','Valentino Uomo Born in Roma Intense','Prada Paradoxe','Burberry Her Elixir','Kilian Angels\' Share','Xerjoff Erba Pura','Nishane Hacivat','Maison Alhambra Kismet Angel','Al Haramain Amber Oud Gold Edition'
  ],
  blue_fragrances: [
    'Bleu de Chanel Eau de Parfum','Dior Sauvage Eau de Parfum','Versace Dylan Blue','Yves Saint Laurent Y Eau de Parfum','Prada Luna Rossa Carbon','Acqua di Gio Profondo','Bvlgari Aqva Pour Homme','Rasasi Hawas','Montblanc Legend Blue','Coach Blue','Nautica Voyage','Armaf Club de Nuit Blue Iconic'
  ],
  amber: [
    'Tom Ford Amber Absolute','Serge Lutens Ambre Sultan','Maison Francis Kurkdjian Grand Soir','Prada Amber Pour Homme','Dolce & Gabbana The One for Men','Guerlain L\'Instant de Guerlain','Lattafa Khamrah','Hermes Ambre Narguile','Mancera Amber Fever','Roja Amber Aoud','BDK Gris Charnel Extrait'
  ],
  fresh_clean: [
    'Mugler Cologne','Prada L\'Homme','Dior Homme Cologne','Versace Pour Homme','Narciso Rodriguez Bleu Noir EDT','Acqua di Parma Colonia Essenza','Issey Miyake L\'Eau d\'Issey Pour Homme','Maison Margiela Replica Lazy Sunday Morning','Byredo Blanche','Clean Reserve Skin','Nautica Voyage'
  ],
  winter: [
    'Spicebomb Extreme Viktor & Rolf','Dior Homme Intense','Tom Ford Noir Extreme','Mancera Red Tobacco','Parfums de Marly Herod','Amouage Interlude Man','Lattafa Khamrah','Azzaro The Most Wanted Parfum','Givenchy Gentleman Reserve Privee','Bentley for Men Intense'
  ],
  summer: [
    'Acqua di Gio Profondo','Dolce & Gabbana Light Blue Eau Intense','Versace Man Eau Fraiche','Neroli Portofino Tom Ford','Virgin Island Water Creed','Dior Homme Cologne','Chanel Allure Homme Edition Blanche','Hermes Un Jardin sur le Nil','MFK Aqua Universalis','Nautica Voyage'
  ],
  office: [
    'Prada L\'Homme','Bleu de Chanel Eau de Parfum','Terre d\'Hermes Eau Givree','Dior Homme 2020','Montblanc Explorer','Acqua di Gio Parfum','Narciso Rodriguez Bleu Noir Parfum','Givenchy Gentleman Boisee','Chanel Platinum Egoiste','Bvlgari Pour Homme Extreme'
  ],
  date_night: [
    'Yves Saint Laurent La Nuit de L\'Homme','Dior Homme Intense','Jean Paul Gaultier Le Male Le Parfum','Armani Code Parfum','Tom Ford Noir Extreme','Parfums de Marly Layton','Kilian Angels\' Share','Valentino Uomo Intense','Givenchy Gentleman Reserve Privee','Prada Luna Rossa Black'
  ],
});

function deterministicUnique(items) {
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function parseArgs(argv = process.argv.slice(2)) {
  const params = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) params.set(argv[i].slice(2), argv[i + 1]);
  }
  const category = params.get('category');
  const limit = Number(params.get('limit') ?? 100);
  if (!category || !SEED_DICTIONARY[category]) {
    const supported = Object.keys(SEED_DICTIONARY).join(', ');
    throw new Error(`Invalid or missing --category. Supported: ${supported}`);
  }
  if (!Number.isFinite(limit) || limit <= 0) throw new Error('Invalid --limit. Use a positive integer.');
  return { category, limit };
}

export function generateFragranceSeeds({ category, limit = 100 }) {
  const curated = deterministicUnique(SEED_DICTIONARY[category] ?? []);
  return curated.slice(0, limit);
}

function main() {
  const { category, limit } = parseArgs();
  const seeds = generateFragranceSeeds({ category, limit });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `fragrance-seeds-${category}.txt`);
  fs.writeFileSync(outPath, `${STARTER_WARNING}\n${seeds.join('\n')}\n`);
  console.log(`Generated ${seeds.length} curated fragrance seeds for ${category}.`);
  console.log(`Output: ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
