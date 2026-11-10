// Idées de repas : recettes simples pour une personne, et liste de courses.
// Les valeurs nutritionnelles viennent de la table de foods.js (un seul endroit à corriger).
import { findFood } from './foods.js';
import { MEALS, targetFor, dayTotals } from './nutrition.js';
import { getDay } from './store.js';
import { fromKey } from './dates.js';

export const AISLES = [
  { id: 'legumes', label: 'Fruits et légumes' },
  { id: 'viande', label: 'Viandes et poissons' },
  { id: 'frais', label: 'Frais et crèmerie' },
  { id: 'epicerie', label: 'Épicerie' },
  { id: 'pain', label: 'Boulangerie' },
  { id: 'surgele', label: 'Surgelés' },
  { id: 'autre', label: 'Autres' },
];

/*
 * Ingrédients : clé → [mot-clé de la table, nom affiché, rayon, options]
 * raw : poids cru pour 1 g cuit (pour la liste de courses) ; shop : nom sur la liste de courses
 * pc : [poids d'une pièce, singulier, pluriel] → affiché en pièces, jamais ajusté par la portion
 */
const ING = {
  riz: ['riz', 'riz cuit', 'epicerie', { raw: 0.35, shop: 'Riz' }],
  pates: ['pates', 'pâtes cuites', 'epicerie', { raw: 0.42, shop: 'Pâtes' }],
  quinoa: ['quinoa', 'quinoa cuit', 'epicerie', { raw: 0.35, shop: 'Quinoa' }],
  semoule: ['semoule', 'semoule cuite', 'epicerie', { raw: 0.4, shop: 'Semoule' }],
  lentilles: ['lentille', 'lentilles cuites', 'epicerie', { shop: 'Lentilles en conserve' }],
  poischiches: ['pois chiche', 'pois chiches cuits', 'epicerie', { shop: 'Pois chiches en conserve' }],
  haricotsrouges: ['haricots rouges', 'haricots rouges cuits', 'epicerie', { shop: 'Haricots rouges en conserve' }],
  avoine: ['avoine', 'flocons d’avoine', 'epicerie'],
  granola: ['granola', 'granola', 'epicerie'],
  galetteriz: ['galette de riz', 'galettes de riz', 'epicerie', { pc: [8, 'galette de riz', 'galettes de riz'] }],
  wrap: ['wrap', 'galettes de blé', 'pain', { pc: [60, 'galette de blé', 'galettes de blé'] }],
  paincomplet: ['pain complet', 'pain complet', 'pain'],
  pain: ['pain', 'pain', 'pain'],
  pdt: ['pomme de terre', 'pommes de terre', 'legumes'],
  patatedouce: ['patate douce', 'patate douce', 'legumes'],
  poulet: ['poulet', 'blanc de poulet', 'viande'],
  dinde: ['dinde', 'escalope de dinde', 'viande'],
  boeuf: ['boeuf', 'steak de bœuf', 'viande'],
  steakhache: ['steak hache', 'steak haché', 'viande', { pc: [125, 'steak haché', 'steaks hachés'] }],
  jambon: ['jambon', 'jambon blanc', 'frais', { pc: [40, 'tranche de jambon blanc', 'tranches de jambon blanc'] }],
  saumon: ['saumon', 'pavé de saumon', 'viande'],
  thon: ['thon', 'thon au naturel', 'epicerie', { shop: 'Thon au naturel (boîte)' }],
  cabillaud: ['cabillaud', 'cabillaud', 'viande'],
  crevettes: ['crevette', 'crevettes décortiquées', 'viande'],
  oeuf: ['oeuf', 'œufs', 'frais', { pc: [60, 'œuf', 'œufs'] }],
  tofu: ['tofu', 'tofu ferme', 'frais'],
  lait: ['lait', 'lait demi-écrémé', 'frais', { ml: true }],
  yaourtgrec: ['yaourt grec 0', 'yaourt grec 0 %', 'frais'],
  skyr: ['skyr', 'skyr', 'frais'],
  fromageblanc: ['fromage blanc', 'fromage blanc', 'frais'],
  feta: ['feta', 'feta', 'frais'],
  fromage: ['emmental', 'emmental râpé', 'frais'],
  parmesan: ['parmesan', 'parmesan', 'frais'],
  beurre: ['beurre', 'beurre', 'frais'],
  creme: ['creme fraiche', 'crème fraîche', 'frais'],
  whey: ['whey', 'whey', 'epicerie'],
  banane: ['banane', 'banane', 'legumes', { pc: [120, 'banane', 'bananes'] }],
  pomme: ['pomme', 'pomme', 'legumes', { pc: [150, 'pomme', 'pommes'] }],
  kiwi: ['kiwi', 'kiwi', 'legumes', { pc: [75, 'kiwi', 'kiwis'] }],
  fruitsrouges: ['fruits rouges', 'fruits rouges', 'surgele'],
  myrtilles: ['myrtille', 'myrtilles', 'legumes'],
  avocat: ['avocat', 'avocat', 'legumes', { pc: [140, 'avocat', 'avocats'] }],
  brocoli: ['brocoli', 'brocolis', 'legumes'],
  haricotsverts: ['haricots verts', 'haricots verts', 'surgele'],
  carotte: ['carotte', 'carottes', 'legumes', { pc: [80, 'carotte', 'carottes'] }],
  courgette: ['courgette', 'courgette', 'legumes'],
  aubergine: ['aubergine', 'aubergine', 'legumes'],
  tomate: ['tomate', 'tomates', 'legumes', { pc: [120, 'tomate', 'tomates'] }],
  concombre: ['concombre', 'concombre', 'legumes'],
  salade: ['salade', 'salade verte', 'legumes'],
  epinards: ['epinard', 'épinards', 'legumes'],
  poivron: ['poivron', 'poivron', 'legumes', { pc: [150, 'poivron', 'poivrons'] }],
  champignons: ['champignon', 'champignons', 'legumes'],
  oignon: ['oignon', 'oignon', 'legumes'],
  mais: ['mais', 'maïs', 'epicerie', { shop: 'Maïs en conserve' }],
  soupe: ['soupe', 'soupe de légumes', 'frais', { ml: true }],
  amandes: ['amande', 'amandes', 'epicerie'],
  noix: ['noix', 'noix', 'epicerie'],
  bdc: ['beurre de cacahuete', 'beurre de cacahuète', 'epicerie'],
  huile: ['huile', 'huile d’olive', 'epicerie'],
  miel: ['miel', 'miel', 'epicerie'],
  chocolat: ['chocolat noir', 'chocolat noir', 'epicerie'],
  saucetomate: ['sauce tomate', 'sauce tomate', 'epicerie'],
  houmous: ['houmous', 'houmous', 'frais'],
  vinaigrette: ['vinaigrette', 'vinaigrette', 'epicerie'],
  dattes: ['datte', 'dattes', 'epicerie', { pc: [8, 'datte', 'dattes'] }],
};

const B = ['petitdej'];
const C = ['collation'];
const M = ['dejeuner', 'diner'];

// [id, repas, nom, minutes, ingrédients [clé, grammes], assaisonnement, étapes]
const RAW = [
  // ── Petit-déjeuner ──
  ['b1', B, 'Bol skyr, avoine et fruits rouges', 5, [['skyr', 200], ['avoine', 40], ['fruitsrouges', 100], ['amandes', 10], ['miel', 10]], [],
    ['Verse le skyr dans un bol.', 'Ajoute les flocons d’avoine et les fruits rouges (décongelés la veille au frigo).', 'Termine avec les amandes concassées et le miel.']],
  ['b2', B, 'Porridge banane et cacahuète', 8, [['avoine', 50], ['lait', 200], ['banane', 120], ['bdc', 15]], ['cannelle'],
    ['Fais chauffer le lait et les flocons 3 à 4 min à feu doux en remuant.', 'Écrase la moitié de la banane dans le porridge.', 'Sers avec le reste de banane en rondelles et le beurre de cacahuète.']],
  ['b3', B, 'Œufs brouillés sur pain complet', 8, [['oeuf', 120], ['paincomplet', 60], ['beurre', 5], ['tomate', 120]], ['sel, poivre'],
    ['Fais fondre le beurre à feu doux et verse les œufs battus.', 'Remue sans arrêt 2 min : ils doivent rester crémeux.', 'Sers sur le pain grillé avec la tomate en tranches.']],
  ['b4', B, 'Tartines avocat et œuf', 10, [['paincomplet', 60], ['avocat', 70], ['oeuf', 60]], ['sel, poivre, citron'],
    ['Fais cuire l’œuf 6 min dans l’eau bouillante (mollet) ou au plat.', 'Écrase l’avocat avec du citron, du sel et du poivre.', 'Tartine le pain grillé et pose l’œuf dessus.']],
  ['b5', B, 'Fromage blanc, granola et pomme', 4, [['fromageblanc', 200], ['granola', 40], ['pomme', 150]], [],
    ['Coupe la pomme en dés.', 'Mélange-la au fromage blanc et ajoute le granola au dernier moment pour qu’il reste croquant.']],
  ['b6', B, 'Omelette jambon-fromage', 8, [['oeuf', 180], ['jambon', 40], ['fromage', 20], ['pain', 40]], ['sel, poivre'],
    ['Bats les œufs et verse-les dans une poêle chaude légèrement huilée.', 'Quand le dessous est pris, ajoute le jambon en lanières et le fromage.', 'Replie l’omelette et sers avec le pain.']],
  ['b7', B, 'Smoothie protéiné à la banane', 4, [['lait', 300], ['banane', 120], ['whey', 30], ['avoine', 20], ['bdc', 10]], [],
    ['Mets tous les ingrédients dans le blender.', 'Mixe 30 secondes. Ajoute quelques glaçons si tu l’aimes bien frais.']],
  ['b8', B, 'Pancakes avoine et banane', 12, [['avoine', 50], ['oeuf', 120], ['banane', 120], ['yaourtgrec', 100], ['miel', 10]], ['cannelle'],
    ['Mixe les flocons, les œufs et la banane pour obtenir une pâte.', 'Fais cuire des petites louches 1 à 2 min par face dans une poêle antiadhésive.', 'Sers avec le yaourt grec et le miel.']],
  ['b9', B, 'Yaourt grec, noix, miel et kiwis', 4, [['yaourtgrec', 250], ['noix', 20], ['miel', 10], ['kiwi', 150]], [],
    ['Épluche et coupe les kiwis.', 'Dépose-les sur le yaourt avec les noix et le miel.']],

  // ── Collation ──
  ['c1', C, 'Skyr et myrtilles', 2, [['skyr', 150], ['myrtilles', 80]], [],
    ['Mélange le skyr et les myrtilles. C’est prêt.']],
  ['c2', C, 'Pomme et beurre de cacahuète', 2, [['pomme', 150], ['bdc', 20]], [],
    ['Coupe la pomme en quartiers.', 'Trempe-les dans le beurre de cacahuète.']],
  ['c3', C, 'Galettes de riz, jambon et fromage blanc', 3, [['galetteriz', 24], ['jambon', 80], ['fromageblanc', 40]], ['poivre, ciboulette'],
    ['Tartine les galettes de fromage blanc.', 'Pose le jambon dessus, poivre.']],
  ['c4', C, 'Fromage blanc, miel et amandes', 2, [['fromageblanc', 150], ['miel', 10], ['amandes', 15]], [],
    ['Verse le miel et les amandes sur le fromage blanc.']],
  ['c5', C, 'Banane et amandes', 1, [['banane', 120], ['amandes', 20]], [],
    ['À emporter tel quel : parfait avant ou après la séance.']],
  ['c6', C, 'Houmous et bâtonnets de légumes', 5, [['houmous', 50], ['carotte', 160], ['concombre', 100]], [],
    ['Coupe les carottes et le concombre en bâtonnets.', 'Trempe-les dans le houmous.']],
  ['c7', C, 'Shaker whey et banane', 2, [['whey', 30], ['lait', 250], ['banane', 120]], [],
    ['Secoue la whey avec le lait.', 'Mange la banane à côté, ou mixe le tout.']],
  ['c8', C, 'Œufs durs et pain complet', 10, [['oeuf', 120], ['paincomplet', 30]], ['sel, poivre'],
    ['Fais cuire les œufs 9 min dans l’eau bouillante, puis passe-les sous l’eau froide.', 'Écale-les et mange-les avec le pain. Tu peux en cuire plusieurs d’avance.']],
  ['c9', C, 'Yaourt grec, fruits rouges et chocolat noir', 3, [['yaourtgrec', 150], ['fruitsrouges', 80], ['chocolat', 10]], [],
    ['Dépose les fruits rouges sur le yaourt.', 'Râpe ou casse le chocolat noir par-dessus.']],
  ['c10', C, 'Dattes fourrées au beurre de cacahuète', 3, [['dattes', 24], ['bdc', 15]], ['une pincée de sel'],
    ['Ouvre les dattes et retire les noyaux.', 'Garnis-les de beurre de cacahuète.']],

  // ── Déjeuner et dîner ──
  ['m1', M, 'Poulet, riz et brocolis', 20, [['poulet', 150], ['riz', 150], ['brocoli', 200], ['huile', 5]], ['sel, poivre, paprika'],
    ['Lance la cuisson du riz.', 'Fais cuire les brocolis 5 min à la vapeur ou à l’eau bouillante.', 'Saisis le poulet en morceaux dans l’huile 6 à 8 min avec le paprika.', 'Sers le tout ensemble.']],
  ['m2', M, 'Saumon, quinoa et haricots verts', 20, [['saumon', 130], ['quinoa', 150], ['haricotsverts', 200], ['huile', 5]], ['sel, poivre, citron'],
    ['Fais cuire le quinoa 12 min dans deux fois son volume d’eau.', 'Cuis les haricots verts 8 min à l’eau bouillante.', 'Poêle le saumon 3 min par face, côté peau d’abord.', 'Arrose de citron et sers.']],
  ['m3', M, 'Bowl thon, riz et avocat', 15, [['thon', 120], ['riz', 150], ['avocat', 70], ['concombre', 100], ['mais', 40]], ['sauce soja, graines de sésame'],
    ['Fais cuire le riz et laisse-le tiédir.', 'Coupe l’avocat et le concombre en dés.', 'Dispose le tout dans un bol avec le thon égoutté et le maïs.', 'Assaisonne de sauce soja.']],
  ['m4', M, 'Pâtes bolognaise maison', 25, [['pates', 180], ['steakhache', 125], ['saucetomate', 150], ['oignon', 50], ['parmesan', 10]], ['sel, poivre, herbes de Provence'],
    ['Fais revenir l’oignon émincé, puis émiette le steak haché et fais-le dorer.', 'Ajoute la sauce tomate et les herbes, laisse mijoter 10 min.', 'Pendant ce temps, fais cuire les pâtes.', 'Mélange et parsème de parmesan.']],
  ['m5', M, 'Omelette champignons-épinards et pommes de terre', 25, [['oeuf', 180], ['champignons', 150], ['epinards', 100], ['pdt', 250], ['huile', 5]], ['sel, poivre, ail'],
    ['Fais cuire les pommes de terre en dés 15 min à l’eau ou à la vapeur.', 'Fais sauter les champignons dans l’huile, puis ajoute les épinards 1 min.', 'Verse les œufs battus et laisse prendre 3 min.', 'Sers avec les pommes de terre.']],
  ['m6', M, 'Chili express', 25, [['steakhache', 125], ['haricotsrouges', 150], ['saucetomate', 150], ['poivron', 150], ['oignon', 50], ['riz', 100]], ['cumin, paprika, piment'],
    ['Fais revenir l’oignon et le poivron en dés 5 min.', 'Ajoute le steak haché émietté et les épices, fais dorer.', 'Verse la sauce tomate et les haricots égouttés, laisse mijoter 10 min.', 'Sers avec le riz.']],
  ['m7', M, 'Wraps poulet et crudités', 15, [['wrap', 120], ['poulet', 120], ['salade', 40], ['tomate', 120], ['yaourtgrec', 40]], ['sel, poivre, paprika, citron'],
    ['Fais dorer le poulet en lanières 6 min avec le paprika.', 'Mélange le yaourt avec du citron, du sel et du poivre pour la sauce.', 'Garnis les galettes de salade, de tomate, de poulet et de sauce, puis roule.']],
  ['m8', M, 'Cabillaud au four, patate douce et courgettes', 30, [['cabillaud', 180], ['patatedouce', 200], ['courgette', 200], ['huile', 10]], ['sel, poivre, thym, citron'],
    ['Préchauffe le four à 200 °C.', 'Coupe la patate douce et la courgette en dés, mélange avec l’huile et le thym, enfourne 15 min.', 'Ajoute le cabillaud sur la plaque et poursuis 12 min.', 'Arrose de citron.']],
  ['m9', M, 'Curry de pois chiches aux épinards', 20, [['poischiches', 200], ['epinards', 150], ['saucetomate', 100], ['creme', 30], ['oignon', 50], ['riz', 120]], ['curry, ail, sel'],
    ['Fais revenir l’oignon avec le curry 2 min.', 'Ajoute les pois chiches égouttés et la sauce tomate, laisse mijoter 8 min.', 'Incorpore les épinards et la crème, 2 min de plus.', 'Sers avec le riz.']],
  ['m10', M, 'Salade grecque au poulet', 15, [['poulet', 130], ['tomate', 240], ['concombre', 150], ['feta', 50], ['huile', 10], ['pain', 40]], ['origan, sel, poivre'],
    ['Fais dorer le poulet en morceaux 6 à 8 min.', 'Coupe les tomates, le concombre et la feta en dés.', 'Mélange avec l’huile et l’origan, ajoute le poulet.', 'Sers avec le pain.']],
  ['m11', M, 'Steak, pommes de terre sautées et haricots verts', 25, [['boeuf', 150], ['pdt', 250], ['haricotsverts', 200], ['huile', 10]], ['sel, poivre, ail, persil'],
    ['Précuis les pommes de terre en dés 8 min à l’eau, puis fais-les dorer dans l’huile.', 'Cuis les haricots verts 8 min à l’eau bouillante.', 'Saisis le steak 2 à 3 min par face dans une poêle très chaude.', 'Laisse-le reposer 2 min avant de servir.']],
  ['m12', M, 'Poêlée de crevettes, riz et légumes', 20, [['crevettes', 150], ['riz', 150], ['poivron', 150], ['courgette', 150], ['huile', 10]], ['ail, sauce soja, piment doux'],
    ['Lance la cuisson du riz.', 'Fais sauter le poivron et la courgette en dés 6 min dans l’huile.', 'Ajoute les crevettes et l’ail, 3 min de plus.', 'Assaisonne de sauce soja et sers sur le riz.']],
  ['m13', M, 'Dinde, semoule et légumes du soleil', 25, [['dinde', 150], ['semoule', 150], ['courgette', 150], ['aubergine', 100], ['tomate', 120], ['huile', 10]], ['herbes de Provence, sel, poivre'],
    ['Fais revenir l’aubergine, la courgette et la tomate en dés 12 min dans l’huile.', 'Verse de l’eau bouillante sur la semoule, couvre 5 min puis égrène.', 'Poêle la dinde 4 min par face.', 'Sers le tout ensemble.']],
  ['m14', M, 'Pâtes au saumon et aux épinards', 20, [['pates', 160], ['saumon', 100], ['epinards', 100], ['creme', 20]], ['sel, poivre, citron'],
    ['Fais cuire les pâtes.', 'Poêle le saumon en dés 3 min, ajoute les épinards et la crème.', 'Mélange avec les pâtes et un filet de citron.']],
  ['m15', M, 'Tofu sauté, riz et légumes', 20, [['tofu', 150], ['riz', 150], ['brocoli', 150], ['carotte', 80], ['huile', 10]], ['sauce soja, gingembre, ail'],
    ['Lance la cuisson du riz.', 'Fais dorer le tofu en dés dans l’huile 5 min, réserve.', 'Fais sauter les brocolis et la carotte en rondelles 6 min.', 'Remets le tofu, ajoute la sauce soja et sers sur le riz.']],
  ['m16', M, 'Salade de lentilles, œufs et feta', 12, [['lentilles', 200], ['oeuf', 120], ['feta', 30], ['tomate', 120], ['salade', 40], ['vinaigrette', 15]], ['moutarde, échalote'],
    ['Fais cuire les œufs 9 min, écale-les et coupe-les en quartiers.', 'Rince les lentilles et mélange-les avec la tomate en dés et la vinaigrette.', 'Sers sur la salade avec les œufs et la feta émiettée.']],
  ['m17', M, 'Soupe de légumes, œufs et tartines', 10, [['soupe', 400], ['oeuf', 120], ['paincomplet', 60], ['fromage', 20]], ['poivre'],
    ['Réchauffe la soupe.', 'Fais cuire les œufs 6 min (mollets).', 'Sers avec le pain grillé et le fromage.']],
];

function resolve([id, meals, name, min, ing, plus, steps]) {
  const items = ing.map(([key, g]) => {
    const [kw, label, aisle, o = {}] = ING[key];
    const f = findFood(kw);
    return {
      key, label, shop: o.shop || label.charAt(0).toUpperCase() + label.slice(1), aisle, g, unit: f.ml ? 'ml' : 'g',
      k100: f.kcal, p100: f.p, c100: f.c, f100: f.f, raw: o.raw || 0, pc: o.pc || null,
    };
  });
  return { id, meals, name, min, items, plus, steps };
}

export const RECIPES = RAW.map(resolve);

export const BUILTIN_COUNT = RECIPES.length;

/** Toutes les recettes : celles de l'app et tes recettes sur mesure. */
export function allRecipes(db) {
  return [...RECIPES, ...(db.myRecipes || [])];
}
export const findRecipe = (db, id) => allRecipes(db).find(r => r.id === id) || null;

const r5 = v => Math.max(5, Math.round(v / 5) * 5);

/** Ingrédients pour une portion ajustée (les pièces — œufs, fruits… — ne bougent pas). */
export function scaled(recipe, factor = 1) {
  return recipe.items.map(i => (i.pc || factor === 1 ? { ...i } : { ...i, g: r5(i.g * factor) }));
}

export function totals(items) {
  const sum = k => items.reduce((s, i) => s + (i.g * (i[k] || 0)) / 100, 0);
  return { kcal: Math.round(sum('k100')), p: Math.round(sum('p100')), c: Math.round(sum('c100')), f: Math.round(sum('f100')), g: items.reduce((s, i) => s + i.g, 0) };
}

/** Portion (de 0,7 à 1,5) qui amène la recette au plus près du budget de calories. */
export function fit(recipe, budget) {
  const fixed = totals(recipe.items.filter(i => i.pc)).kcal;
  const free = totals(recipe.items.filter(i => !i.pc)).kcal;
  if (!free) return 1;
  const f = (budget - fixed) / free;
  return Math.max(0.7, Math.min(1.5, Math.round(f * 20) / 20));
}

const frac = n => {
  const whole = Math.floor(n);
  const rest = n - whole;
  const half = rest >= 0.25 && rest < 0.75;
  const w = whole + (rest >= 0.75 ? 1 : 0);
  if (half) return w ? `${w} ½` : '½';
  return String(w || 1);
};

/** « 2 œufs », « ½ avocat », « 150 g ». */
export function qtyLabel(i) {
  if (i.pc) {
    const n = i.g / i.pc[0];
    return { qty: frac(n), name: n >= 1.75 ? i.pc[2] : i.pc[1] };
  }
  return { qty: `${i.g} ${i.unit}`, name: i.label, note: i.raw ? `soit ${r5(i.g * i.raw)} g cru` : '' };
}

const SHARE = { petitdej: 0.25, dejeuner: 0.35, collation: 0.1, diner: 0.3 };

/** Budget de calories de chaque repas : la cible du jour, répartie sur les repas qui restent à prendre. */
export function mealBudgets(db, k) {
  const target = targetFor(db.profile);
  const day = getDay(db, k);
  const t = dayTotals(day);
  const open = MEALS.filter(m => !day.entries.some(e => e.meal === m.id));
  const left = target + t.burned - t.eaten;
  const openShare = open.reduce((s, m) => s + SHARE[m.id], 0);
  const out = {};
  MEALS.forEach(m => {
    const base = target * SHARE[m.id];
    const isOpen = open.includes(m);
    const v = isOpen && openShare ? (left * SHARE[m.id]) / openShare : base;
    out[m.id] = Math.round(Math.max(base * 0.6, Math.min(base * 1.3, v)) / 10) * 10;
  });
  return out;
}

const dayIndex = k => Math.round(fromKey(k).getTime() / 86400000);

/** 3 idées par repas, différentes chaque jour ; shifts[repas] fait défiler les suivantes. */
export function suggestions(db, k, shifts = {}) {
  const budgets = mealBudgets(db, k);
  const all = allRecipes(db);
  const day = dayIndex(k);
  const used = new Set();
  const out = {};
  MEALS.forEach(m => {
    const list = all.filter(r => r.meals.includes(m.id));
    const start = (day * 3 + (shifts[m.id] || 0) * 3 + (m.id === 'diner' ? Math.floor(list.length / 2) : 0)) % (list.length || 1);
    const picks = [];
    for (let i = 0; i < list.length && picks.length < 3; i++) {
      const r = list[(start + i) % list.length];
      if (used.has(r.id)) continue;
      used.add(r.id);
      const factor = fit(r, budgets[m.id]);
      const items = scaled(r, factor);
      picks.push({ r, factor, items, tot: totals(items) });
    }
    out[m.id] = { budget: budgets[m.id], picks };
  });
  return out;
}

/** La recette telle qu'elle sera notée dans le journal (une seule ligne). */
export function journalItem(recipe, items) {
  const t = totals(items);
  const g = Math.max(1, t.g);
  const per = v => Math.round((v / g) * 1000) / 10;
  const sum = k => items.reduce((s, i) => s + (i.g * (i[k] || 0)) / 100, 0);
  return { name: recipe.name, g, unit: 'g', k100: per(sum('k100')), p100: per(sum('p100')), c100: per(sum('c100')), f100: per(sum('f100')), src: 'recipe' };
}

const fmtQty = (g, unit) => {
  if (g >= 1000) return `${String(Math.round(g / 100) / 10).replace('.', ',')} ${unit === 'ml' ? 'l' : 'kg'}`;
  return `${Math.max(10, Math.ceil(g / 10) * 10)} ${unit}`;
};

/** Liste de courses : ingrédients des repas choisis, additionnés et rangés par rayon. */
export function shopList(db) {
  const shop = db.shop || { picks: [], checked: {}, extra: [] };
  const map = new Map();
  shop.picks.forEach(p => {
    const r = findRecipe(db, p.rid);
    if (!r) return;
    scaled(r, p.f || 1).forEach(i => {
      const id = `${i.shop}|${i.unit}`;
      const cur = map.get(id) || { id, name: i.shop, aisle: i.aisle, unit: i.unit, g: 0, pc: i.pc, cru: !!i.raw, from: new Set() };
      cur.g += i.g * (p.n || 1) * (i.raw || 1);
      cur.from.add(r.name);
      map.set(id, cur);
    });
  });
  const rows = [...map.values()].map(x => {
    let qty;
    if (x.pc) {
      const n = Math.max(1, Math.ceil(x.g / x.pc[0] - 0.01));
      qty = `${n} ${n > 1 ? x.pc[2] : x.pc[1]}`;
      return { id: x.id, aisle: x.aisle, name: qty.charAt(0).toUpperCase() + qty.slice(1), qty: '', from: [...x.from] };
    }
    qty = fmtQty(x.g, x.unit);
    return { id: x.id, aisle: x.aisle, name: x.name, qty, from: [...x.from] };
  });
  (shop.extra || []).forEach(e => rows.push({ id: e.id, aisle: 'autre', name: e.name, qty: '', extra: true, from: [] }));
  const groups = AISLES.map(a => ({ ...a, rows: rows.filter(r => r.aisle === a.id).sort((x, y) => x.name.localeCompare(y.name, 'fr')) })).filter(g => g.rows.length);
  // rayons inconnus (recette sur mesure) → Autres
  const known = new Set(AISLES.map(a => a.id));
  const lost = rows.filter(r => !known.has(r.aisle));
  if (lost.length) {
    const other = groups.find(g => g.id === 'autre');
    if (other) other.rows.push(...lost); else groups.push({ id: 'autre', label: 'Autres', rows: lost });
  }
  return { groups, count: rows.length, left: rows.filter(r => !shop.checked[r.id]).length };
}

/** Version texte de la liste, pour la partager (Notes, Messages…). */
export function shopText(db) {
  const { groups } = shopList(db);
  const checked = (db.shop && db.shop.checked) || {};
  return groups.map(g => `${g.label}\n${g.rows.filter(r => !checked[r.id]).map(r => `- ${r.name}${r.qty ? ` : ${r.qty}` : ''}`).join('\n')}`)
    .filter(b => b.includes('\n-')).join('\n\n');
}
