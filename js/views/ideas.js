import { html, useState } from '../../vendor/preact-htm.js';
import { MEALS, GOALS } from '../lib/nutrition.js';
import { suggestions, scaled, totals, qtyLabel, journalItem, shopList, shopText, findRecipe, mealBudgets, fit } from '../lib/recipes.js';
import { inventRecipe } from '../lib/ai.js';
import { todayKey } from '../lib/dates.js';
import { uid } from '../lib/store.js';
import { fmt, Icon, Kicker, Sheet, Seg } from '../ui.js';

const line = t => `${t.kcal} kcal · ${t.p} g de protéines`;

/** Fiche recette : ingrédients à la bonne portion, étapes, « Je l'ai mangé » et liste de courses. */
function RecipeSheet({ db, recipe, factor: f0, meal, actions, onClose }) {
  const [factor, setFactor] = useState(f0);
  const items = scaled(recipe, factor);
  const t = totals(items);
  const canScale = recipe.items.some(i => !i.pc);
  const pick = db.shop.picks.find(p => p.rid === recipe.id);
  const mealInfo = MEALS.find(m => m.id === meal) || MEALS[1];
  const step = d => setFactor(Math.max(0.5, Math.min(2, Math.round((factor + d) * 20) / 20)));

  const toggleShop = () => {
    actions.update(d => {
      if (pick) d.shop.picks = d.shop.picks.filter(p => p.rid !== recipe.id);
      else d.shop.picks.push({ uid: uid(), rid: recipe.id, f: factor, n: 1 });
    });
    actions.notify(pick ? 'Retiré de la liste de courses' : 'Ajouté à la liste de courses');
  };

  return html`<${Sheet} onClose=${onClose} title=${recipe.name}>
    <div>
      <div class="sheet-title">${recipe.name}</div>
      <div class="muted small">${recipe.min} min · pour 1 personne</div>
    </div>

    <div class="card recipe-nums">
      <div><div class="stat-num">${fmt(t.kcal)}</div><div class="stat-lbl">kcal</div></div>
      <div><div class="stat-num">${t.p} g</div><div class="stat-lbl">Protéines</div></div>
      <div><div class="stat-num">${t.c} g</div><div class="stat-lbl">Glucides</div></div>
      <div><div class="stat-num">${t.f} g</div><div class="stat-lbl">Lipides</div></div>
    </div>

    ${canScale && html`<div class="row-between">
      <div>
        <div class="strong">Portion</div>
        <div class="muted tiny">Ajustée à ce qu’il te reste pour ce repas</div>
      </div>
      <div class="stepper">
        <button type="button" aria-label="Portion plus petite" onClick=${() => step(-0.1)}>−</button>
        <span class="stepper-val"><b>${String(Math.round(factor * 100))}</b><span>%</span></span>
        <button type="button" aria-label="Portion plus grande" onClick=${() => step(0.1)}>+</button>
      </div>
    </div>`}

    <div class="stack-s">
      <div class="field-label">Ingrédients</div>
      <div class="card ing-list">
        ${items.map((i, n) => {
          const q = qtyLabel(i);
          return html`<div key=${n} class="ing">
            <span class="ing-name">${q.name.charAt(0).toUpperCase() + q.name.slice(1)}${q.note ? html`<span class="muted tiny"> · ${q.note}</span>` : ''}</span>
            <span class="strong">${q.qty}</span>
          </div>`;
        })}
        ${recipe.plus && recipe.plus.length > 0 && html`<div class="ing muted small">Et aussi : ${recipe.plus.join(', ')}</div>`}
      </div>
    </div>

    <div class="stack-s">
      <div class="field-label">Préparation</div>
      <ol class="steps">${recipe.steps.map((s, n) => html`<li key=${n}><span class="step-n">${n + 1}</span><span>${s}</span></li>`)}</ol>
    </div>

    <div class="stack-s">
      <button class="btn btn-dark wide" onClick=${() => { onClose(); actions.addEntries(todayKey(), meal, [journalItem(recipe, items)], 'recipe'); }}>
        Je l’ai mangé ${mealInfo.prep} · ${fmt(t.kcal)} kcal</button>
      <button class="btn btn-ghost wide" onClick=${toggleShop}><${Icon} name=${pick ? 'check' : 'cart'} size=${18} /> ${pick ? 'Dans ta liste de courses · retirer' : 'Ajouter à la liste de courses'}</button>
    </div>
  </${Sheet}>`;
}

/** Recette sur mesure, avec ce que tu as sous la main (clé API nécessaire). */
function CustomSheet({ db, actions, onClose, onReady }) {
  const [meal, setMeal] = useState('diner');
  const [have, setHave] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasKey = !!db.settings.apiKey;
  const budget = mealBudgets(db, todayKey())[meal];

  const go = async () => {
    setError('');
    setBusy(true);
    try {
      const mealInfo = MEALS.find(m => m.id === meal);
      const r = await inventRecipe(db.settings, { have: have.trim(), mealLabel: mealInfo.label, kcal: budget, goalLabel: GOALS[db.profile.goal].short });
      const recipe = { id: 'my' + uid(), meals: [meal], custom: true, ...r };
      actions.update(d => { d.myRecipes = [recipe, ...d.myRecipes].slice(0, 20); });
      onReady(recipe, meal);
    } catch (e) {
      setBusy(false);
      setError(e.message);
    }
  };

  return html`<${Sheet} onClose=${onClose} title="Recette sur mesure">
    <div>
      <div class="sheet-title">Recette sur mesure</div>
      <div class="muted small">Dis ce que tu as dans le frigo : l’app propose un plat d’environ ${fmt(budget)} kcal.</div>
    </div>
    ${hasKey ? html`
      <${Seg} small options=${MEALS.map(m => ({ id: m.id, label: m.short }))} value=${meal} onChange=${setMeal} />
      <textarea class="area" rows="3" placeholder="Ex : poulet, courgettes, riz, œufs…" aria-label="Ce que tu as sous la main"
        value=${have} onInput=${e => setHave(e.target.value)}></textarea>
      ${error && html`<div class="err-box" role="alert">${error}</div>`}
      <button class="btn btn-dark wide" disabled=${busy} onClick=${go}>${busy ? 'Je cherche une idée…' : 'Proposer une recette'}</button>`
    : html`
      <div class="card empty-card muted small">Cette fonction utilise Claude avec ta clé API (moins d’un centime par recette). Ajoute ta clé dans Réglages pour l’activer.</div>
      <button class="btn btn-dark wide" onClick=${() => actions.go('settings')}>Ouvrir les Réglages</button>`}
  </${Sheet}>`;
}

export function Ideas({ db, actions }) {
  const tk = todayKey();
  const [shifts, setShifts] = useState({});
  const [open, setOpen] = useState(null);
  const [custom, setCustom] = useState(false);
  const S = suggestions(db, tk, shifts);
  const picked = new Set(db.shop.picks.map(p => p.rid));
  const eaten = new Set((db.days[tk] ? db.days[tk].entries : []).map(e => e.meal));
  const mine = db.myRecipes || [];
  const openRecipe = (r, meal) => setOpen({ id: r.id, factor: r.custom ? 1 : fit(r, S[meal].budget), meal });
  const cur = open && findRecipe(db, open.id);

  return html`<div class="screen scroll">
    <header class="top">
      <div class="top-titles">
        <${Kicker}>${GOALS[db.profile.goal].short} · selon ce qu’il te reste aujourd’hui</${Kicker}>
        <h1>Idées de repas</h1>
      </div>
      <button class="avatar" aria-label="Réglages" onClick=${() => actions.go('settings')}><${Icon} name="user" /></button>
    </header>

    <button class="card shop-link" onClick=${() => actions.go('shop')}>
      <span class="shop-ico"><${Icon} name="cart" size=${20} /></span>
      <span class="plan-txt">
        <span class="strong">Liste de courses</span>
        <span class="muted small">${picked.size ? `${picked.size} repas choisi${picked.size > 1 ? 's' : ''}` : 'Choisis des repas : la liste se remplit toute seule'}</span>
      </span>
      <${Icon} name="right" size=${18} />
    </button>

    ${MEALS.map(m => html`<section key=${m.id} class="stack">
      <div class="section-head">
        <h2>${m.label}</h2>
        <span class="muted small">${eaten.has(m.id) ? 'déjà noté' : `≈ ${fmt(S[m.id].budget)} kcal`}</span>
      </div>
      ${S[m.id].picks.map(p => html`<button key=${p.r.id} class="card idea" onClick=${() => setOpen({ id: p.r.id, factor: p.factor, meal: m.id })}>
        <span class="plan-txt">
          <span class="strong">${p.r.name}</span>
          <span class="muted small">${p.r.min} min · ${line(p.tot)}</span>
        </span>
        ${picked.has(p.r.id) && html`<span class="tag up">courses</span>`}
        <${Icon} name="right" size=${18} />
      </button>`)}
      <button class="text-btn" onClick=${() => setShifts({ ...shifts, [m.id]: (shifts[m.id] || 0) + 1 })}><${Icon} name="refresh" size=${16} /> 3 autres idées</button>
    </section>`)}

    <section class="stack">
      <div class="section-head"><h2>Sur mesure</h2></div>
      <button class="card idea" onClick=${() => setCustom(true)}>
        <span class="plan-txt">
          <span class="strong">Avec ce que j’ai dans le frigo</span>
          <span class="muted small">Une recette inventée pour toi${db.settings.apiKey ? '' : ' · clé API nécessaire'}</span>
        </span>
        <${Icon} name="right" size=${18} />
      </button>
      ${mine.map(r => html`<div key=${r.id} class="card idea-row">
        <button class="idea-main" onClick=${() => openRecipe(r, r.meals[0])}>
          <span class="strong">${r.name}</span>
          <span class="muted small">${r.min} min · ${line(totals(r.items))}</span>
        </button>
        <button class="icon-btn" aria-label=${`Supprimer ${r.name}`} onClick=${async () => {
          if (!(await actions.ask({ title: 'Supprimer cette recette ?', text: r.name, ok: 'Supprimer', danger: true }))) return;
          actions.update(d => { d.myRecipes = d.myRecipes.filter(x => x.id !== r.id); d.shop.picks = d.shop.picks.filter(p => p.rid !== r.id); });
        }}><${Icon} name="close" size=${16} /></button>
      </div>`)}
    </section>

    <div class="muted tiny foot">Recettes pour une personne. Les féculents sont pesés cuits ; la liste de courses les convertit en poids cru.</div>

    ${cur && html`<${RecipeSheet} key=${cur.id} db=${db} recipe=${cur} factor=${open.factor} meal=${open.meal} actions=${actions} onClose=${() => setOpen(null)} />`}
    ${custom && html`<${CustomSheet} db=${db} actions=${actions} onClose=${() => setCustom(false)}
      onReady=${(r, meal) => { setCustom(false); setOpen({ id: r.id, factor: 1, meal }); }} />`}
  </div>`;
}

export function Shop({ db, actions }) {
  const [more, setMore] = useState('');
  const L = shopList(db);
  const shop = db.shop;
  const picks = shop.picks.map(p => ({ p, r: findRecipe(db, p.rid) })).filter(x => x.r);
  const empty = !picks.length && !shop.extra.length;

  const share = async () => {
    const text = shopText(db);
    if (!text) { actions.notify('Tout est déjà coché'); return; }
    try {
      if (navigator.share) { await navigator.share({ title: 'Liste de courses', text }); return; }
      await navigator.clipboard.writeText(text);
      actions.notify('Liste copiée');
    } catch (e) {
      if (!e || e.name !== 'AbortError') actions.notify('Partage impossible sur cet appareil');
    }
  };

  const addExtra = e => {
    e.preventDefault();
    const name = more.trim();
    if (!name) return;
    actions.update(d => { d.shop.extra.push({ id: 'x' + uid(), name: name.charAt(0).toUpperCase() + name.slice(1) }); });
    setMore('');
  };

  return html`<div class="screen scroll settings">
    <header class="top">
      <button class="pill" onClick=${() => actions.go('ideas')}><${Icon} name="left" size=${16} /> Idées</button>
      ${!empty && html`<button class="pill" onClick=${share}><${Icon} name="share" size=${16} /> Partager</button>`}
    </header>
    <div>
      <h1>Liste de courses</h1>
      ${!empty && html`<div class="muted small">${L.left ? `${L.left} article${L.left > 1 ? 's' : ''} à prendre sur ${L.count}` : 'Tout est dans le panier'}</div>`}
    </div>

    ${empty && html`<div class="card empty-card muted small">Ta liste est vide. Dans Idées, ouvre une recette et touche « Ajouter à la liste de courses » : les ingrédients s’additionnent ici, rangés par rayon.</div>`}

    ${picks.length > 0 && html`<section class="stack">
      <div class="section-head"><h2>Repas choisis</h2><span class="muted small">portions</span></div>
      ${picks.map(({ p, r }) => html`<div key=${p.uid} class="card pick">
        <div class="plan-txt">
          <div class="strong">${r.name}</div>
          <button class="text-btn small danger" onClick=${() => actions.update(d => { d.shop.picks = d.shop.picks.filter(x => x.uid !== p.uid); })}>Retirer</button>
        </div>
        <div class="stepper">
          <button type="button" aria-label="Une portion de moins" disabled=${p.n <= 1} onClick=${() => actions.update(d => { const x = d.shop.picks.find(y => y.uid === p.uid); if (x) x.n = Math.max(1, x.n - 1); })}>−</button>
          <span class="stepper-val"><b>${p.n}</b></span>
          <button type="button" aria-label="Une portion de plus" disabled=${p.n >= 12} onClick=${() => actions.update(d => { const x = d.shop.picks.find(y => y.uid === p.uid); if (x) x.n = Math.min(12, x.n + 1); })}>+</button>
        </div>
      </div>`)}
    </section>`}

    ${L.groups.map(g => html`<section key=${g.id} class="stack">
      <div class="section-head"><h2>${g.label}</h2></div>
      <div class="card shop-group">
        ${g.rows.map(row => {
          const on = !!shop.checked[row.id];
          return html`<div key=${row.id} class=${`shop-row ${on ? 'on' : ''}`}>
            <button class="shop-check" role="checkbox" aria-checked=${on} aria-label=${row.name}
              onClick=${() => actions.update(d => { if (on) delete d.shop.checked[row.id]; else d.shop.checked[row.id] = true; })}>
              <span class="box">${on && html`<${Icon} name="check" size=${14} stroke=${3} />`}</span>
              <span class="shop-name">${row.name}</span>
              <span class="shop-qty">${row.qty}</span>
            </button>
            ${row.extra && html`<button class="icon-btn small" aria-label=${`Supprimer ${row.name}`}
              onClick=${() => actions.update(d => { d.shop.extra = d.shop.extra.filter(x => x.id !== row.id); delete d.shop.checked[row.id]; })}><${Icon} name="close" size=${14} /></button>`}
          </div>`;
        })}
      </div>
    </section>`)}

    <form class="add-more" onSubmit=${addExtra}>
      <input type="text" placeholder="Ajouter un article (ex : café)" aria-label="Ajouter un article" value=${more} onInput=${e => setMore(e.target.value)} />
      <button type="submit" class="icon-btn dark" aria-label="Ajouter"><${Icon} name="plus" size=${18} /></button>
    </form>

    ${!empty && html`<button class="text-btn danger" onClick=${async () => {
      if (await actions.ask({ title: 'Vider la liste de courses ?', text: 'Les repas choisis et les articles ajoutés seront retirés.', ok: 'Vider la liste', danger: true })) {
        actions.update(d => { d.shop = { picks: [], checked: {}, extra: [] }; });
      }
    }}>Vider la liste</button>`}
  </div>`;
}
