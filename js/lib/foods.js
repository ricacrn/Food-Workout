// Mini table nutritionnelle (valeurs moyennes pour 100 g ou 100 ml, proches de la table CIQUAL).
// kw : mots-clés sans accents ; def : portion par défaut ; unit : poids d'une pièce ; ml : boisson.
// Pour ajouter un aliment, ajoute une ligne : [mots-clés, nom, kcal, protéines, glucides, lipides, portion, {options}]
const RAW = [
  // Féculents, céréales, pains
  [['riz'], 'Riz cuit', 130, 2.7, 28, 0.3, 150],
  [['riz complet'], 'Riz complet cuit', 123, 2.7, 25.6, 1, 150],
  [['pate', 'pates', 'spaghetti', 'penne', 'tagliatelle', 'fusilli', 'macaroni', 'coquillette'], 'Pâtes cuites', 157, 5.8, 31, 0.9, 180],
  [['pates completes', 'pate complete'], 'Pâtes complètes cuites', 149, 6, 27, 1.5, 180],
  [['quinoa'], 'Quinoa cuit', 120, 4.4, 21, 1.9, 150],
  [['semoule', 'couscous'], 'Semoule cuite', 112, 3.8, 23, 0.2, 150],
  [['boulgour'], 'Boulgour cuit', 83, 3.1, 18.6, 0.2, 150],
  [['lentille'], 'Lentilles cuites', 116, 9, 20, 0.4, 150],
  [['pois chiche'], 'Pois chiches cuits', 139, 7.6, 19, 2.6, 150],
  [['haricots rouges', 'haricot rouge', 'haricots blancs', 'haricot blanc'], 'Haricots secs cuits', 115, 8.7, 15, 0.5, 150],
  [['avoine', 'flocons'], 'Flocons d’avoine', 370, 13.5, 58.7, 7, 40],
  [['muesli', 'granola'], 'Granola', 450, 9, 62, 18, 45],
  [['cereales', 'corn flakes', 'cornflakes'], 'Céréales du petit-déjeuner', 380, 7, 84, 1, 40],
  [['pain', 'baguette'], 'Pain', 265, 9, 49, 3.2, 60, { unit: 30 }],
  [['pain complet', 'pain aux cereales'], 'Pain complet', 247, 9.5, 41, 3.4, 60, { unit: 30 }],
  [['pain de mie'], 'Pain de mie', 270, 8, 48, 4.5, 50, { unit: 25 }],
  [['biscotte'], 'Biscottes', 410, 11, 75, 6, 20, { unit: 8 }],
  [['galette de riz', 'galettes de riz'], 'Galettes de riz', 387, 8, 81, 2.8, 16, { unit: 8 }],
  [['croissant'], 'Croissant', 406, 8, 45, 21, 60, { unit: 60 }],
  [['pain au chocolat', 'chocolatine'], 'Pain au chocolat', 414, 7.5, 46, 22, 70, { unit: 70 }],
  [['wrap', 'tortilla'], 'Galette de blé', 310, 8, 52, 7, 60, { unit: 60 }],
  [['pomme de terre', 'pommes de terre', 'patate'], 'Pommes de terre', 86, 2, 19, 0.1, 250, { unit: 150 }],
  [['patate douce'], 'Patate douce', 86, 1.6, 20, 0.1, 200, { unit: 200 }],
  [['frite'], 'Frites', 280, 3.4, 36, 14, 150],
  [['puree'], 'Purée', 90, 2, 13, 3.5, 200],

  // Plats
  [['pizza'], 'Pizza', 260, 11, 30, 10, 350],
  [['lasagne'], 'Lasagnes', 135, 7.5, 12, 6.5, 300],
  [['quiche'], 'Quiche', 260, 9, 18, 17, 150],
  [['sandwich'], 'Sandwich', 250, 11, 30, 9, 200],
  [['burger', 'hamburger'], 'Burger', 250, 13, 24, 11, 230, { unit: 230 }],
  [['sushi', 'maki'], 'Sushis', 150, 6, 28, 1.5, 200, { unit: 30 }],
  [['raclette'], 'Fromage à raclette', 350, 23, 0.5, 28, 200],
  [['tartiflette'], 'Tartiflette', 200, 8, 14, 12, 350],
  [['gratin'], 'Gratin', 140, 6, 10, 8, 250],
  [['curry'], 'Curry', 140, 9, 8, 8, 300],
  [['chili'], 'Chili con carne', 130, 9, 12, 5, 300],
  [['salade composee'], 'Salade composée', 120, 5, 10, 7, 300],
  [['soupe', 'veloute'], 'Soupe de légumes', 40, 1.2, 6, 1.2, 300, { ml: true }],
  [['ratatouille'], 'Ratatouille', 50, 1.2, 6, 2.5, 200],

  // Viandes, poissons, œufs
  [['poulet', 'blanc de poulet'], 'Poulet', 165, 31, 0, 3.6, 150],
  [['dinde'], 'Dinde', 135, 29, 0, 1.5, 150],
  [['boeuf', 'steak', 'entrecote', 'bavette', 'roti de boeuf'], 'Bœuf', 220, 27, 0, 12, 150],
  [['steak hache', 'viande hachee'], 'Steak haché', 200, 26, 0, 11, 125, { unit: 125 }],
  [['porc', 'cote de porc', 'filet mignon'], 'Porc', 200, 28, 0, 9, 150],
  [['agneau'], 'Agneau', 230, 25, 0, 14, 150],
  [['jambon'], 'Jambon blanc', 115, 20, 1, 3.5, 40, { unit: 40 }],
  [['jambon cru', 'prosciutto', 'coppa'], 'Jambon cru', 250, 28, 0, 15, 30, { unit: 15 }],
  [['charcuterie', 'saucisson', 'salami', 'chorizo'], 'Charcuterie', 410, 26, 1, 34, 50],
  [['lardon'], 'Lardons', 270, 15, 0.5, 23, 50],
  [['saucisse', 'merguez', 'chipolata'], 'Saucisse', 290, 14, 2, 25, 80, { unit: 80 }],
  [['saumon'], 'Saumon', 208, 20, 0, 13, 120],
  [['thon'], 'Thon au naturel', 116, 26, 0, 1, 100],
  [['cabillaud', 'colin', 'merlu', 'lieu', 'poisson blanc', 'poisson'], 'Poisson blanc', 82, 18, 0, 0.7, 150],
  [['crevette'], 'Crevettes', 99, 24, 0, 0.3, 100],
  [['oeuf'], 'Œufs', 145, 12.5, 0.7, 10, 120, { unit: 60 }],
  [['tofu'], 'Tofu', 120, 12, 2, 7, 100],

  // Produits laitiers
  [['lait'], 'Lait demi-écrémé', 46, 3.3, 4.8, 1.6, 200, { ml: true }],
  [['lait de soja', 'boisson soja'], 'Lait de soja', 39, 3.3, 2, 1.9, 200, { ml: true }],
  [['lait d avoine', 'boisson avoine'], 'Lait d’avoine', 45, 0.5, 7, 1.5, 200, { ml: true }],
  [['yaourt', 'yogourt', 'yogurt'], 'Yaourt nature', 61, 4.3, 5.5, 2.4, 125, { unit: 125 }],
  [['yaourt grec', 'yogourt grec'], 'Yaourt grec', 133, 5.7, 4, 10, 150],
  [['yaourt grec 0', 'yaourt grec a 0', 'grec 0'], 'Yaourt grec 0 %', 57, 10, 4, 0.4, 150],
  [['skyr'], 'Skyr', 63, 11, 4, 0.2, 150, { unit: 150 }],
  [['fromage blanc'], 'Fromage blanc', 75, 7.5, 4, 3, 100],
  [['fromage', 'comte', 'gruyere', 'emmental', 'beaufort', 'cheddar', 'tomme', 'abondance'], 'Fromage à pâte dure', 390, 27, 0.5, 31, 30],
  [['camembert', 'brie', 'reblochon', 'chevre'], 'Fromage à pâte molle', 300, 20, 0.5, 24, 30],
  [['mozzarella', 'mozza', 'burrata'], 'Mozzarella', 250, 18, 1, 19, 60],
  [['feta'], 'Feta', 265, 14, 4, 21, 30],
  [['parmesan'], 'Parmesan', 390, 33, 0, 28, 10],
  [['beurre'], 'Beurre', 717, 0.9, 0.1, 81, 10],
  [['creme', 'creme fraiche'], 'Crème fraîche', 300, 2.4, 3, 30, 30],
  [['whey', 'proteine en poudre', 'proteines en poudre'], 'Whey', 380, 78, 6, 6, 30],

  // Fruits
  [['pomme'], 'Pomme', 52, 0.3, 14, 0.2, 150, { unit: 150 }],
  [['banane'], 'Banane', 89, 1.1, 23, 0.3, 120, { unit: 120 }],
  [['orange'], 'Orange', 47, 0.9, 12, 0.1, 150, { unit: 150 }],
  [['clementine', 'mandarine'], 'Clémentine', 47, 0.8, 12, 0.2, 70, { unit: 70 }],
  [['poire'], 'Poire', 57, 0.4, 15, 0.1, 160, { unit: 160 }],
  [['fraise'], 'Fraises', 33, 0.7, 7.7, 0.3, 150],
  [['myrtille'], 'Myrtilles', 57, 0.7, 14.5, 0.3, 80],
  [['framboise'], 'Framboises', 52, 1.2, 12, 0.7, 100],
  [['fruits rouges'], 'Fruits rouges', 45, 1, 10, 0.4, 100],
  [['raisin'], 'Raisin', 69, 0.7, 18, 0.2, 150],
  [['raisins secs'], 'Raisins secs', 300, 3, 79, 0.5, 30],
  [['kiwi'], 'Kiwi', 61, 1.1, 15, 0.5, 75, { unit: 75 }],
  [['ananas'], 'Ananas', 50, 0.5, 13, 0.1, 150],
  [['mangue'], 'Mangue', 60, 0.8, 15, 0.4, 150],
  [['peche', 'nectarine', 'brugnon'], 'Pêche', 39, 0.9, 10, 0.3, 150, { unit: 150 }],
  [['abricot'], 'Abricot', 48, 1.4, 11, 0.4, 40, { unit: 40 }],
  [['melon'], 'Melon', 34, 0.8, 8, 0.2, 200],
  [['pasteque'], 'Pastèque', 30, 0.6, 7.6, 0.2, 250],
  [['avocat'], 'Avocat', 160, 2, 9, 15, 140, { unit: 140 }],
  [['compote'], 'Compote', 70, 0.3, 16, 0.1, 100, { unit: 100 }],
  [['datte'], 'Dattes', 280, 2.5, 75, 0.4, 30, { unit: 8 }],

  // Légumes
  [['brocoli'], 'Brocolis', 35, 2.4, 7, 0.4, 150],
  [['haricots verts', 'haricot vert'], 'Haricots verts', 31, 1.8, 7, 0.1, 150],
  [['carotte'], 'Carottes', 41, 0.9, 10, 0.2, 100, { unit: 80 }],
  [['courgette'], 'Courgette', 17, 1.2, 3, 0.3, 150],
  [['tomate'], 'Tomate', 18, 0.9, 3.9, 0.2, 120, { unit: 120 }],
  [['concombre'], 'Concombre', 15, 0.7, 3.6, 0.1, 100],
  [['salade', 'laitue', 'roquette', 'mache'], 'Salade verte', 15, 1.4, 2.9, 0.2, 80],
  [['epinard'], 'Épinards', 23, 2.9, 3.6, 0.4, 150],
  [['poivron'], 'Poivron', 26, 1, 6, 0.3, 150, { unit: 150 }],
  [['champignon'], 'Champignons', 22, 3.1, 3.3, 0.3, 100],
  [['aubergine'], 'Aubergine', 25, 1, 6, 0.2, 150],
  [['chou fleur', 'chou-fleur'], 'Chou-fleur', 25, 1.9, 5, 0.3, 150],
  [['petits pois', 'petit pois'], 'Petits pois', 81, 5.4, 14, 0.4, 100],
  [['mais'], 'Maïs', 86, 3.3, 19, 1.4, 80],
  [['oignon'], 'Oignon', 40, 1.1, 9, 0.1, 50],
  [['legume'], 'Légumes', 30, 1.5, 5, 0.3, 150],
  [['cornichon'], 'Cornichons', 15, 0.5, 2, 0.2, 40],

  // Oléagineux, graines, matières grasses
  [['amande'], 'Amandes', 600, 21, 9, 52, 30],
  [['noix'], 'Noix', 650, 15, 7, 65, 30],
  [['noix de cajou', 'cajou'], 'Noix de cajou', 580, 18, 30, 46, 30],
  [['cacahuete', 'arachide'], 'Cacahuètes', 590, 26, 16, 49, 30],
  [['chia'], 'Graines de chia', 486, 17, 42, 31, 20],
  [['graines de courge', 'graine de courge'], 'Graines de courge', 560, 30, 14, 46, 20],
  [['beurre de cacahuete'], 'Beurre de cacahuète', 600, 25, 16, 50, 20],
  [['huile'], 'Huile d’olive', 884, 0, 0, 100, 10],
  [['vinaigrette'], 'Vinaigrette', 450, 0.5, 3, 48, 15],
  [['mayonnaise', 'mayo'], 'Mayonnaise', 700, 1, 1, 75, 15],
  [['ketchup'], 'Ketchup', 110, 1.3, 26, 0.1, 15],
  [['pesto'], 'Pesto', 450, 5, 6, 45, 20],
  [['sauce tomate'], 'Sauce tomate', 50, 1.5, 8, 1.2, 100],
  [['houmous', 'hummus'], 'Houmous', 300, 8, 14, 23, 50],

  // Sucré
  [['chocolat', 'chocolat noir'], 'Chocolat noir', 560, 7, 40, 40, 20, { unit: 5 }],
  [['chocolat au lait'], 'Chocolat au lait', 535, 7.7, 59, 30, 20, { unit: 5 }],
  [['pate a tartiner', 'nutella'], 'Pâte à tartiner', 540, 6, 57, 31, 20],
  [['biscuit', 'cookie', 'gateau sec', 'sable'], 'Biscuits', 470, 6, 68, 19, 30, { unit: 10 }],
  [['gateau', 'cake', 'fondant', 'brownie', 'tarte'], 'Gâteau', 380, 5, 50, 18, 100],
  [['tiramisu'], 'Tiramisu', 280, 5, 30, 16, 120],
  [['glace', 'sorbet'], 'Glace', 210, 3.5, 25, 11, 100],
  [['crepe'], 'Crêpe', 220, 6, 30, 8, 60, { unit: 60 }],
  [['miel'], 'Miel', 304, 0.3, 82, 0, 15],
  [['confiture'], 'Confiture', 250, 0.4, 60, 0.1, 20],
  [['sucre'], 'Sucre', 400, 0, 100, 0, 5, { unit: 5 }],
  [['barre de cereales', 'barre cereales'], 'Barre de céréales', 400, 6, 68, 12, 25, { unit: 25 }],
  [['barre proteinee', 'barre de proteines', 'barre proteine'], 'Barre protéinée', 360, 30, 35, 10, 50, { unit: 50 }],

  // Boissons
  [['vin'], 'Vin', 83, 0.1, 2.6, 0, 150, { ml: true }],
  [['biere'], 'Bière', 43, 0.5, 3.6, 0, 330, { ml: true }],
  [['jus', 'jus d orange', 'jus de pomme', 'jus de fruit'], 'Jus de fruit', 45, 0.7, 10, 0.2, 200, { ml: true }],
  [['soda', 'coca', 'cola', 'limonade', 'ice tea'], 'Soda', 42, 0, 10.6, 0, 330, { ml: true }],
  [['coca zero', 'coca light', 'soda zero', 'zero sucre'], 'Soda zéro', 0.3, 0, 0, 0, 330, { ml: true }],
  [['cafe', 'espresso', 'expresso', 'ristretto'], 'Café', 2, 0.1, 0, 0, 100, { ml: true }],
  [['cappuccino', 'latte', 'cafe au lait', 'flat white', 'macchiato'], 'Café au lait', 40, 2, 4, 1.5, 200, { ml: true }],
  [['the', 'tisane', 'infusion'], 'Thé', 1, 0, 0.2, 0, 250, { ml: true }],
  [['smoothie'], 'Smoothie', 55, 0.6, 13, 0.2, 250, { ml: true }],
  [['eau'], 'Eau', 0, 0, 0, 0, 500, { ml: true }],
];

export const FOODS = RAW.map(([kw, name, kcal, p, c, f, def, o = {}]) => ({ kw, name, kcal, p, c, f, def, unit: o.unit || 0, ml: !!o.ml }));

export const norm = s =>
  String(s)
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const KW = FOODS.flatMap(f => f.kw.map(k => ({ k, f, re: new RegExp('(^|[^a-z])' + k.replace(/[-]/g, '[- ]?')) })));

// Cherche l'aliment dont le mot-clé reconnu est le plus long ("pommes de terre" avant "pomme").
export function findFood(text) {
  const n = norm(text);
  let best = null;
  for (const e of KW) if (e.re.test(n) && (!best || e.k.length > best.k.length)) best = e;
  return best ? best.f : null;
}

const NUM_WORDS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, demi: 0.5, demie: 0.5 };
const QTY = new RegExp(/(\d+(?:[.,]\d+)?|½|\bune?\b|\bdeux\b|\btrois\b|\bquatre\b|\bcinq\b|\bsix\b|\bdemie?\b)\s*(kg|grammes?|gr|g|cl|ml|l|c ?a ?s|c ?a ?c|cs|cc|cuill?e?res? a soupe|cuill?e?res? a cafe|verres?|tasses?|bols?|poignees?|tranches?|assiettes?|portions?|pots?|carres?|morceaux?|parts?|boules?)?(?![a-z])/.source, 'g');

function toGrams(qty, unit, food) {
  const piece = food ? food.unit || food.def : 40; // pièce d'un aliment inconnu : ~40 g
  if (!unit) return qty <= 20 ? qty * piece : qty; // "2 œufs" ou "150 riz"
  if (unit === 'kg' || unit === 'l') return qty * 1000;
  if (unit === 'cl') return qty * 10;
  if (/^(g|gr|grammes?|ml)$/.test(unit)) return qty;
  if (/^(c ?a ?s|cs|cuil.*soupe)$/.test(unit)) return qty * 15;
  if (/^(c ?a ?c|cc|cuil.*cafe)$/.test(unit)) return qty * 5;
  if (/^verre/.test(unit)) return qty * (food && food.ml ? 150 : 200);
  if (/^tasse/.test(unit)) return qty * 200;
  if (/^bol/.test(unit)) return qty * 300;
  if (/^poignee/.test(unit)) return qty * 30;
  if (/^assiette/.test(unit)) return qty * 300;
  if (/^carre/.test(unit)) return qty * 5;
  if (/^boule/.test(unit)) return qty * 50;
  if (/^(tranche|morceau|part)/.test(unit)) return qty * (food && food.unit ? food.unit : 30);
  return qty * (food ? food.def : 100); // portion, pot
}

export function itemFromFood(food, g, extra = {}) {
  return {
    name: food.name, g: Math.round(g), unit: food.ml ? 'ml' : 'g',
    k100: food.kcal, p100: food.p, c100: food.c, f100: food.f, ...extra,
  };
}

// "150 g de riz, 2 œufs et un verre de vin" → aliments avec grammes.
export function parseText(txt) {
  return String(txt)
    .split(/,(?!\d)|[;\n+]|\s+(?:et|avec)\s+/i)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map(raw => {
      const n = norm(raw)
        .replace(/\bc\.?\s?a\.?\s?s(oupe)?\b\.?/g, 'cs')
        .replace(/\bc\.?\s?a\.?\s?c(afe)?\b\.?/g, 'cc')
        .replace(/cuill?e?res? a soupe/g, 'cs')
        .replace(/cuill?e?res? a cafe/g, 'cc');
      const food = findFood(n);
      const qty = m => NUM_WORDS[m[1]] ?? (m[1] === '½' ? 0.5 : parseFloat(m[1].replace(',', '.')));
      const all = [...n.matchAll(QTY)].filter(m => qty(m) > 0);
      const m = all.find(x => x[2]) || all[0];
      let g = food ? food.def : 100;
      if (m) g = toGrams(qty(m), m[2], food);
      if (food) return itemFromFood(food, g, { src: 'text' });
      const guess = raw
        .replace(/\d+(?:[.,]\d+)?\s*(kg|grammes?|gr|g|cl|ml|l)?(?![a-zà-ÿ])/i, '')
        .replace(/^\s*(de la|des|du|de|d’|d'|un|une|le|la|les)\s+/i, '')
        .trim();
      return {
        name: guess ? guess.charAt(0).toUpperCase() + guess.slice(1) : 'Aliment',
        g: Math.round(g), unit: 'g', k100: 150, p100: 6, c100: 18, f100: 6, src: 'text', unknown: true, raw,
      };
    });
}
