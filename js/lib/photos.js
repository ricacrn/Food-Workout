// Photos des recettes : l'image principale de l'article Wikipédia du plat (images libres, Wikimedia Commons).
// Elles sont chargées depuis internet à l'affichage ; sans connexion, les recettes s'affichent simplement sans photo.
const KEY = 'platepace.photos.v1';
const RETRY_MS = 7 * 86400000; // on retente au bout d'une semaine les plats restés sans photo

// Pour chaque recette : articles candidats, en français puis en anglais. Le premier qui a une image gagne.
const WIKI = {
  b1: [['Skyr'], ['Skyr']],
  b2: [['Porridge'], ['Porridge', 'Oatmeal']],
  b3: [['Œufs brouillés'], ['Scrambled eggs']],
  b4: [['Toast à l\'avocat'], ['Avocado toast']],
  b5: [['Muesli', 'Fromage blanc'], ['Muesli', 'Granola']],
  b6: [['Omelette'], ['Omelette']],
  b7: [['Smoothie'], ['Smoothie']],
  b8: [['Pancake'], ['Pancake']],
  b9: [['Yaourt à la grecque'], ['Strained yogurt']],
  c1: [['Myrtille'], ['Blueberry']],
  c2: [['Beurre de cacahuète'], ['Peanut butter']],
  c3: [['Galette de riz soufflé'], ['Rice cake', 'Puffed rice cakes']],
  c4: [['Amande'], ['Almond']],
  c5: [['Banane'], ['Banana']],
  c6: [['Houmous'], ['Hummus']],
  c7: [['Milk-shake'], ['Milkshake']],
  c8: [['Œuf dur'], ['Boiled egg']],
  c9: [['Chocolat noir'], ['Dark chocolate']],
  c10: [['Datte'], ['Date palm']],
  m1: [['Riz au poulet', 'Poulet au brocoli'], ['Chicken and rice', 'Arroz con pollo']],
  m2: [['Saumon (aliment)', 'Saumon grillé'], ['Salmon as food']],
  m3: [['Poke (plat)'], ['Poke (dish)']],
  m4: [['Sauce bolognaise', 'Spaghetti bolognese'], ['Bolognese sauce', 'Spaghetti bolognese']],
  m5: [['Tortilla espagnole'], ['Spanish omelette']],
  m6: [['Chili con carne'], ['Chili con carne']],
  m7: [['Wrap (sandwich)'], ['Wrap (food)']],
  m8: [['Cabillaud', 'Morue'], ['Cod as food']],
  m9: [['Chana masala'], ['Chana masala']],
  m10: [['Salade grecque'], ['Greek salad']],
  m11: [['Steak frites'], ['Steak frites']],
  m12: [['Riz cantonais', 'Riz sauté'], ['Fried rice']],
  m13: [['Ratatouille'], ['Ratatouille']],
  m14: [['Tagliatelle', 'Pâtes alimentaires'], ['Tagliatelle', 'Pasta']],
  m15: [['Tofu'], ['Tofu', 'Stir frying']],
  m16: [['Salade de lentilles', 'Lentille cultivée'], ['Lentil']],
  m17: [['Soupe'], ['Vegetable soup', 'Soup']],
};

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function write(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* stockage plein : tant pis, on recherchera */ }
}

/** Photos déjà connues : { idRecette: { src, page } }. */
export function cachedPhotos() {
  const map = read();
  const out = {};
  Object.keys(map).forEach(id => { if (map[id] && map[id].src) out[id] = map[id]; });
  return out;
}

async function lookup(lang, titles) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1`
    + `&prop=pageimages%7Cinfo&inprop=url&piprop=thumbnail&pithumbsize=640&pilimit=50&titles=${encodeURIComponent(titles.join('|'))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('wiki');
  const q = (await res.json()).query || {};
  const hop = {};
  [...(q.normalized || []), ...(q.redirects || [])].forEach(r => { hop[r.from] = r.to; });
  const pages = {};
  (q.pages || []).forEach(p => { if (p.thumbnail && p.thumbnail.source) pages[p.title] = { src: p.thumbnail.source, page: p.fullurl || '' }; });
  const out = {};
  titles.forEach(t => {
    let cur = t;
    for (let i = 0; i < 4 && hop[cur]; i++) cur = hop[cur];
    if (pages[cur]) out[t] = pages[cur];
  });
  return out;
}

/** Cherche les photos manquantes (une requête par langue) et renvoie toutes les photos connues. */
export async function loadPhotos() {
  const map = read();
  const now = Date.now();
  const todo = Object.keys(WIKI).filter(id => !map[id] || (!map[id].src && now - (map[id].at || 0) > RETRY_MS));
  if (!todo.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) return cachedPhotos();
  try {
    for (const [n, lang] of [[0, 'fr'], [1, 'en']]) {
      const left = todo.filter(id => !(map[id] && map[id].src));
      const titles = [...new Set(left.flatMap(id => WIKI[id][n]))];
      if (!titles.length) break;
      const found = await lookup(lang, titles);
      left.forEach(id => {
        const hit = WIKI[id][n].find(t => found[t]);
        if (hit) map[id] = { ...found[hit], at: now };
      });
    }
    todo.forEach(id => { if (!map[id] || !map[id].src) map[id] = { src: '', at: now }; });
    write(map);
  } catch (e) { /* hors ligne ou service indisponible : on réessaiera à la prochaine ouverture */ }
  return cachedPhotos();
}

/** Une photo ne charge plus : on l'oublie, elle sera recherchée plus tard. */
export function dropPhoto(id) {
  const map = read();
  if (map[id]) { map[id] = { src: '', at: Date.now() }; write(map); }
}
