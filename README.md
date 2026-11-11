# Plate & Pace

En ligne : **https://ricacrn.github.io/Food-Workout/** · L’ancienne app Sec & Tracé reste disponible dans la branche `sauvegarde-sec-trace`.

Webapp (PWA) qui mêle nourriture et sport : tu notes ce que tu manges, et ton programme d'entraînement s'ajuste à ton bilan des trois derniers jours.

- **3 façons de noter un repas** : photo (reconnaissance par l'IA), code-barres (Open Food Facts) ou texte libre (« 150 g de riz, 2 œufs »). Les grammes s'ajustent à l'étape de vérification.
- **Objectif** : perte de poids, maintien ou prise de masse. La cible calorique est calculée à partir de ton profil (formule de Mifflin-St Jeor).
- **Programme adaptatif** : chaque 250 kcal d'écart cumulé sur 3 jours change la prochaine séance de 5 %, jusqu'à ±20 %.
  - Si tu as trop mangé, la séance ajoute des séries et du cardio, et raccourcit les repos.
  - Si tu as trop peu mangé, elle s'allège et te propose une collation.
- **Lecteur de séance** : échauffement, séries, minuteur de repos avec bip.
- **Progression des charges** : à la fin de chaque exercice, tu donnes ton ressenti (Facile, Bien ou Difficile) et l'app ajuste la charge suivante.
  - Facile : +1 cran dès la prochaine fois.
  - Bien deux fois de suite : +1 cran.
  - Difficile deux fois de suite : −1 cran.
  - Un cran vaut 2,5 kg sur les exercices lourds et 1 kg sur les autres. L'évolution de chaque exercice est visible dans Entraînement.
- **Réglage de la charge** : les boutons − / + avancent selon le pas choisi (1 · 2,5 · 5 · 10 kg sur les exercices lourds, 0,5 · 1 · 2,5 kg sur les autres). Tu peux aussi taper la valeur directement.
- **Exercices de remplacement** : chaque exercice propose 3 ou 4 alternatives (machine, haltères, sans matériel). Tu les choisis pour la séance du jour seulement, ou pour toujours.
- **Idées de repas** : 3 idées par repas, ajustées aux calories qu'il te reste, avec ingrédients et étapes. « Je l'ai mangé » note le plat ; avec la clé API, une recette sur mesure à partir de ce que tu as dans le frigo.
- **Semaine et liste de courses** : planifie tes repas sur 7 jours ; la liste de courses s'additionne toute seule, rangée par rayon, et se partage.
- **Repas rapides** : repas habituels, « Comme hier », assiettes types de cantine ou de restaurant.
- **Photos** : chaque exercice et chaque appareil a sa photo de démonstration (dans `img/ex/`) ; les recettes affichent une photo d'illustration chargée depuis Wikipédia quand il y a du réseau.
- **Choix de la séance** : tu vois les prochaines séances et tu peux en faire une autre que celle prévue (par exemple « Haut du corps complet ») sans décaler le programme.
- **Mon matériel** : coche ce qui existe dans ta salle (et à la maison) ; le programme ne propose que des exercices faisables. Un remplacement est retenu pour les séances suivantes.
- **Séance** : version express de 20 min, répétitions réellement faites, repos réglable et note par exercice, records.
- **Suivi du poids** : une pesée par semaine recalcule ta cible de calories.
- **Activités** : tennis, Body Pump, course… Les calories sont estimées, ou tu saisis la valeur affichée par ta montre.
- **Sans serveur** : tout reste sur ton téléphone. Une sauvegarde peut être exportée et importée depuis Réglages.

---

## 1. Mettre l'app en ligne sur GitHub Pages (5 minutes, sans ligne de commande)

1. Sur [github.com](https://github.com), clique sur **New repository**.
   - Nom : `plate-pace` (ou ce que tu veux).
   - Visibilité : **Public**. GitHub Pages est gratuit pour les dépôts publics. Tes données ne sont pas dans le dépôt : elles restent sur ton téléphone.
   - Clique sur **Create repository**.
2. Sur la page du dépôt vide, clique sur **uploading an existing file**.
3. Dézippe l'archive, puis glisse **tout le contenu du dossier `plate-pace`** dans la zone d'envoi.
   - Glisse le contenu, pas le dossier lui-même : `index.html` doit être à la racine du dépôt.
   - Avec le Finder, affiche les fichiers cachés (⌘ ⇧ .) pour inclure `.nojekyll`.
4. Clique sur **Commit changes**.
5. Va dans **Settings › Pages**.
   - Source : *Deploy from a branch*.
   - Branche : `main`, dossier `/ (root)`.
   - Clique sur **Save**.
6. Au bout d'une à deux minutes, l'app est en ligne à l'adresse `https://TON-PSEUDO.github.io/NOM-DU-DEPOT/`.

## 2. L'installer sur l'iPhone

1. Ouvre l'adresse dans **Safari**.
2. Touche **Partager**, puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Lance l'app depuis son icône. Elle s'ouvre en plein écran, comme une app native.

> **Important** : utilise l'app depuis l'icône de l'écran d'accueil. Safari peut effacer les données d'un site ouvert dans le navigateur si tu ne le visites pas pendant une semaine d'utilisation de Safari. Une app installée sur l'écran d'accueil n'est pas concernée. Pense quand même à **Exporter** une sauvegarde de temps en temps (Réglages › Données).

## 3. Activer la reconnaissance des photos (facultatif)

La photo utilise Claude, avec ta propre clé API :

1. Crée un compte sur [platform.claude.com](https://platform.claude.com), ajoute un peu de crédit dans *Billing*, puis crée une clé dans [API keys](https://platform.claude.com/settings/keys) en la liant à un espace de travail (*Workspace*). La clé commence par `sk-ant-` et n'est affichée qu'une fois.
2. Fixe une **limite de dépense mensuelle** dans la console, par sécurité.
3. Dans l'app, va dans Réglages, puis colle la clé dans **Reconnaissance par l'IA**.

Compte environ 1 centime par photo avec Claude Sonnet 5.5, moins avec Haiku 5.5. La clé est stockée uniquement sur le téléphone et n'est jamais incluse dans les sauvegardes exportées. Sans clé, la photo reste utilisable : tu décris simplement l'assiette en texte.

Le code-barres (Open Food Facts) et la saisie texte (table interne) sont gratuits et ne demandent aucune clé.

## 4. Publier une mise à jour

1. Modifie ou remplace les fichiers dans le dépôt GitHub (bouton **Add file › Upload files**).
2. Augmente `VERSION` dans `sw.js` et `APP_VERSION` dans `js/lib/version.js` (le numéro affiché en bas des Réglages).
3. L'app se met à jour toute seule à sa prochaine ouverture (elle se recharge une fois). Si rien ne change, ferme-la et rouvre-la.

## Structure

```
index.html              page d'entrée
manifest.webmanifest    nom, icônes, mode plein écran
sw.js                   cache hors ligne
css/styles.css          design
js/app.js               état de l'app et navigation
js/ui.js                composants communs (anneau, stepper…)
js/views/               écrans : today, add (capture + vérification), train (séance), settings
js/lib/nutrition.js     cible calorique, macros, objectifs
js/lib/program.js       séances, règle d'adaptation, calories (MET)
js/lib/foods.js         table nutritionnelle + lecture du texte
js/lib/scanner.js       caméra + code-barres + Open Food Facts
js/lib/ai.js            reconnaissance photo / texte par Claude
js/lib/store.js         sauvegarde locale, export / import
vendor/                 Preact + htm, lecteur de code-barres ZXing (WebAssembly)
```

Aucune étape de compilation : les fichiers sont servis tels quels.

### Réglages faciles à modifier

- **Séances, exercices et remplacements** : `SESSIONS` et `EXERCISES` dans `js/lib/program.js` (charge de départ, exercice lourd ou non, matériel).
- **Règle d'adaptation** : `STEP_KCAL` (250), `STEP_PCT` (5) et `MAX_STEPS` (4) dans `js/lib/program.js`.
- **Écart calorique par objectif** : `GOALS` dans `js/lib/nutrition.js` (−400 / 0 / +300 kcal).
- **Aliments reconnus en texte** : tableau `RAW` dans `js/lib/foods.js`, avec une ligne par aliment.
- **Recettes** : tableau `RAW` dans `js/lib/recipes.js` (ingrédients en grammes, les calories se calculent toutes seules).
- **Assiettes de cantine** : `PLATES` dans `js/lib/foods.js`.
- **Matériel demandé par exercice** : `NEED` dans `js/lib/program.js`.

## Pour la suite

- **Apple Watch** : une webapp ne peut pas lire l'app Santé directement. Une piste sans app native consiste à créer un **Raccourci iOS** qui lit les calories actives dans Santé, puis ouvre l'app avec ces valeurs dans l'adresse.
- **Synchronisation entre appareils** (par exemple via ton Raspberry Pi).
- Historique du poids et graphique d'évolution.

## Tester en local

```
python3 -m http.server 8000
```

Ouvre ensuite <http://localhost:8000>. La caméra ne fonctionne qu'en `localhost` ou en HTTPS. GitHub Pages est en HTTPS.

## Crédits

- Photos des exercices et du matériel : [free-exercise-db](https://github.com/yuhonas/free-exercise-db), domaine public (Unlicense).
- Photos des recettes : image principale de l'article Wikipédia correspondant (Wikimedia Commons, licences libres), liée depuis chaque fiche. La correspondance recette → article est dans `js/lib/photos.js`.


- [Preact](https://preactjs.com) et [htm](https://github.com/developit/htm) (MIT)
- [barcode-detector](https://github.com/Sec-ant/barcode-detector) et [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) (MIT, Apache-2.0)
- Données produits : [Open Food Facts](https://world.openfoodfacts.org) (ODbL)
