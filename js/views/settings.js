import { html, useState, useRef } from '../../vendor/preact-htm.js';
import { GOALS, GOAL_KEYS, ACTIVITY_LEVELS, targetFor } from '../lib/nutrition.js';
import { ACTIVITIES, metKcal } from '../lib/program.js';
import { DAY_LETTER, DAY_NAMES } from '../lib/dates.js';
import { MODELS } from '../lib/ai.js';
import { exportFile, importFile } from '../lib/store.js';
import { APP_VERSION } from '../lib/version.js';
import { SESSIONS } from '../lib/program.js';
import { fmt, Icon, Seg, Sheet, Stepper, Kicker } from '../ui.js';

function NumField({ label, value, unit, onChange, min, max }) {
  const [txt, setTxt] = useState(value == null ? '' : String(value).replace('.', ','));
  return html`<label class="field">
    <span class="field-label">${label}</span>
    <span class="field-box">
      <input type="text" inputmode="decimal" value=${txt} onInput=${e => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setTxt(t);
        const v = parseFloat(t.replace(',', '.'));
        if (!isNaN(v) && v >= min && v <= max) onChange(v);
      }} />
      <span class="muted">${unit}</span>
    </span>
  </label>`;
}

function Choice({ options, value, onChange }) {
  return html`<div class="choices" role="radiogroup">
    ${options.map(o => html`<button key=${o.id} type="button" role="radio" aria-checked=${value === o.id}
      class=${`choice ${value === o.id ? 'on' : ''}`} onClick=${() => onChange(o.id)}>
      <div class="choice-txt"><div class="strong">${o.label}</div><div class="muted small">${o.sub}</div></div>
      <div class="radio" aria-hidden="true"><div></div></div>
    </button>`)}
  </div>`;
}

function DaysPicker({ value, onChange }) {
  // au moins un jour d'entraînement
  const toggle = i => onChange(value.includes(i) ? (value.length > 1 ? value.filter(x => x !== i) : value) : [...value, i].sort());
  return html`<div class="days" role="group" aria-label="Jours d’entraînement">
    ${DAY_LETTER.map((l, i) => html`<button key=${i} type="button" aria-pressed=${value.includes(i)} aria-label=${DAY_NAMES[i]}
      class=${value.includes(i) ? 'on' : ''} onClick=${() => toggle(i)}>${l}</button>`)}
  </div>`;
}

function ProfileFields({ p, set }) {
  return html`
    <div class="form-block">
      <${Seg} options=${[{ id: 'h', label: 'Homme' }, { id: 'f', label: 'Femme' }]} value=${p.sex} onChange=${v => set({ sex: v })} />
      <div class="fields3">
        <${NumField} label="Âge" value=${p.age} unit="ans" min=${14} max=${100} onChange=${v => set({ age: Math.round(v) })} />
        <${NumField} label="Taille" value=${p.height} unit="cm" min=${120} max=${230} onChange=${v => set({ height: v })} />
        <${NumField} label="Poids" value=${p.weight} unit="kg" min=${35} max=${250} onChange=${v => set({ weight: v })} />
      </div>
    </div>
    <div class="form-block">
      <h3>Activité hors sport</h3>
      <${Choice} options=${ACTIVITY_LEVELS.map(a => ({ id: a.v, label: a.label, sub: a.sub }))} value=${p.activity} onChange=${v => set({ activity: v })} />
    </div>
    <div class="form-block">
      <h3>Ton objectif</h3>
      <${Choice} options=${GOAL_KEYS.map(k => ({ id: k, label: GOALS[k].label, sub: `${fmt(targetFor({ ...p, goal: k }))} kcal / jour · ${GOALS[k].desc}` }))}
        value=${p.goal} onChange=${v => set({ goal: v })} />
    </div>
    <div class="form-block">
      <h3>Jours d’entraînement</h3>
      <${DaysPicker} value=${p.days} onChange=${v => set({ days: v })} />
      <div class="muted small">${p.days.length} séance${p.days.length > 1 ? 's' : ''} par semaine. Le programme enchaîne : bas du corps, poussée, tirage, full body.</div>
    </div>`;
}

export const DEFAULT_PROFILE = { name: '', sex: 'h', age: 30, height: 175, weight: 75, activity: 1.2, goal: 'perte', days: [0, 1, 3, 4] };

export function Onboarding({ onDone }) {
  const [p, setP] = useState(DEFAULT_PROFILE);
  const set = patch => setP({ ...p, ...patch });
  return html`<div class="screen scroll onboarding">
    <div class="ob-head">
      <${Kicker}>Bienvenue</${Kicker}>
      <h1>Plate & Pace</h1>
      <p class="lead">Note ce que tu manges, et ton entraînement s’ajuste à ton bilan des trois derniers jours. Quelques infos pour calculer ta cible :</p>
    </div>
    <${ProfileFields} p=${p} set=${set} />
    <div class="ob-foot">
      <div class="row-between"><span class="muted">Ta cible</span><span class="big-num">${fmt(targetFor(p))}<span class="unit"> kcal / jour</span></span></div>
      <button class="btn btn-dark wide" disabled=${!p.days.length} onClick=${() => onDone(p)}>Commencer</button>
      <div class="muted tiny center">Tes données restent sur ce téléphone.</div>
    </div>
  </div>`;
}

export function Settings({ db, actions }) {
  const p = db.profile;
  const set = patch => actions.update(d => { d.profile = { ...d.profile, ...patch }; });
  const setS = patch => actions.update(d => { d.settings = { ...d.settings, ...patch }; });
  const [showKey, setShowKey] = useState(false);
  const fileRef = useRef(null);
  const slots = new Set(SESSIONS.flatMap(s => s.ex.map(e => e.n)));
  const swaps = Object.entries(db.swaps || {}).filter(([from]) => slots.has(from));

  const onImport = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const next = await importFile(f, db);
      if (await actions.ask({ title: 'Restaurer cette sauvegarde ?', text: 'Toutes les données de ce téléphone seront remplacées par celles du fichier.', ok: 'Remplacer mes données', danger: true })) {
        actions.replaceDb(next);
        actions.notify('Sauvegarde restaurée');
      }
    } catch (err) {
      actions.notify(err.message);
    }
  };

  return html`<div class="screen scroll settings">
    <header class="top">
      <button class="pill" onClick=${() => actions.go('today')}><${Icon} name="left" size=${16} /> Retour</button>
    </header>
    <h1>Réglages</h1>

    <section class="stack">
      <div class="row-between"><h2>Profil</h2><span class="strong">${fmt(targetFor(p))} kcal / jour</span></div>
      <${ProfileFields} p=${p} set=${set} />
    </section>

    <section class="stack">
      <h2>Reconnaissance par l’IA</h2>
      <p class="muted small">Pour reconnaître les plats en photo, l’app utilise Claude avec ta propre clé API (platform.claude.com › Settings › API keys, en choisissant un espace de travail). La clé reste sur ce téléphone. Fixe une limite de dépense sur la console par sécurité.</p>
      <label class="field">
        <span class="field-label">Clé API</span>
        <span class="field-box">
          <input type=${showKey ? 'text' : 'password'} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…"
            value=${db.settings.apiKey} onInput=${e => setS({ apiKey: e.target.value.trim() })} />
          <button type="button" class="text-btn" onClick=${() => setShowKey(!showKey)}>${showKey ? 'Masquer' : 'Afficher'}</button>
        </span>
      </label>
      <${Choice} options=${MODELS.map(m => ({ id: m.id, label: m.label, sub: m.sub }))} value=${db.settings.model} onChange=${v => setS({ model: v })} />
    </section>

    ${swaps.length > 0 && html`<section class="stack">
      <h2>Exercices remplacés</h2>
      <p class="muted small">Tes remplacements sont retenus pour toutes les séances. Rétablis l’exercice d’origine quand tu veux.</p>
      ${swaps.map(([from, to]) => html`<div key=${from} class="card hist">
        <div><div class="strong">${to}</div><div class="muted small">remplace ${from}</div></div>
        <button class="text-btn accent" onClick=${() => actions.update(d => { delete d.swaps[from]; })}>Rétablir</button>
      </div>`)}
    </section>`}

    <section class="stack">
      <h2>Apple Watch</h2>
      <div class="card watch">
        <svg width="26" height="36" viewBox="0 0 26 36" aria-hidden="true"><rect x="7" y="0" width="12" height="8" rx="2" fill="#D9D1C4" /><rect x="7" y="28" width="12" height="8" rx="2" fill="#D9D1C4" /><rect x="2" y="5" width="21" height="26" rx="7" fill="#1F1B17" /><rect x="23" y="13" width="2.5" height="6" rx="1" fill="#1F1B17" /></svg>
        <div>
          <div class="strong">Bientôt</div>
          <div class="muted small">En attendant, ajoute tes activités depuis Aujourd’hui et saisis les calories affichées par ta montre.</div>
        </div>
      </div>
    </section>

    <section class="stack">
      <h2>Données</h2>
      <p class="muted small">Tout est enregistré sur ce téléphone uniquement. Exporte une sauvegarde de temps en temps (Fichiers ou iCloud Drive).</p>
      <div class="btn-row">
        <button class="btn btn-ghost" onClick=${() => exportFile(db)}>Exporter</button>
        <button class="btn btn-ghost" onClick=${() => fileRef.current.click()}>Importer</button>
        <input ref=${fileRef} type="file" accept="application/json,.json" hidden onChange=${onImport} />
      </div>
      <button class="text-btn danger" onClick=${async () => { if (await actions.ask({ title: 'Tout effacer ?', text: 'Repas, séances, progression et profil seront supprimés. C’est définitif.', ok: 'Tout effacer', danger: true })) actions.wipe(); }}>Tout effacer</button>
    </section>
    <div class="muted tiny center foot">Plate & Pace · version ${APP_VERSION} · données nutritionnelles : table interne et Open Food Facts</div>
  </div>`;
}

export function ActivitySheet({ db, onAdd, onClose }) {
  const [type, setType] = useState('tennis');
  const [min, setMin] = useState(60);
  const [watch, setWatch] = useState('');
  const a = ACTIVITIES.find(x => x.id === type);
  const est = metKcal(a.met, db.profile.weight, min);
  const watchKcal = parseInt(watch, 10);
  const kcal = !isNaN(watchKcal) && watchKcal > 0 ? watchKcal : est;
  return html`<${Sheet} onClose=${onClose} title="Ajouter une activité">
    <div class="sheet-title">Ajouter une activité</div>
    <div class="chips wrap">
      ${ACTIVITIES.map(x => html`<button key=${x.id} type="button" class=${`chip ${type === x.id ? 'on' : ''}`} aria-pressed=${type === x.id} onClick=${() => setType(x.id)}>${x.label}</button>`)}
    </div>
    <div class="row-between">
      <span class="strong">Durée</span>
      <${Stepper} value=${min} unit="min" step=${5} onChange=${setMin} label="Durée en minutes" />
    </div>
    <label class="field">
      <span class="field-label">Calories de ta montre (facultatif)</span>
      <span class="field-box">
        <input type="text" inputmode="numeric" placeholder=${`Estimation : ${est}`} value=${watch} onInput=${e => setWatch(e.target.value.replace(/\D/g, ''))} />
        <span class="muted">kcal</span>
      </span>
    </label>
    <button class="btn btn-dark wide" disabled=${!min} onClick=${() => onAdd({ type, label: a.label, min, kcal, watch: !isNaN(watchKcal) && watchKcal > 0 })}>Ajouter · ${fmt(kcal)} kcal</button>
  </${Sheet}>`;
}
