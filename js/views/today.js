import { html, useState } from '../../vendor/preact-htm.js';
import { getDay } from '../lib/store.js';
import { GOALS, MEALS, targetFor, macroTargets, dayTotals, kcalOf } from '../lib/nutrition.js';
import { balance, currentSession, buildPlan, nextTrainingDay, summary, planKcal } from '../lib/program.js';
import { todayKey, addDays, longLabel, relativeDay } from '../lib/dates.js';
import { fmt, sg, pctTxt, Icon, BarcodeGlyph, Ring, Sheet, Stepper, Kicker } from '../ui.js';

function SourceThumb({ src }) {
  return html`<div class="thumb">
    ${src === 'photo' && html`<div class="thumb-photo"><${Icon} name="camera" size=${20} /></div>`}
    ${src === 'barcode' && html`<${BarcodeGlyph} />`}
    ${src !== 'photo' && src !== 'barcode' && html`<div class="thumb-text">Aa</div>`}
  </div>`;
}

export function linkCard(db) {
  const tk = todayKey();
  const B = balance(db, tk);
  const sess = currentSession(db);
  const plan = buildPlan(sess, db.profile.goal, B.steps, db);
  const when = relativeDay(nextTrainingDay(db, tk), tk);
  const kind = B.steps > 0 ? 'up' : B.steps < 0 ? 'down' : 'even';
  const snack = Math.max(200, Math.min(500, Math.round(Math.abs(B.sum) / 3 / 50) * 50));
  const s = summary(plan);
  const sentence = s ? s.charAt(0).toUpperCase() + s.slice(1) + '.' : '';
  return {
    kind, B, plan, sess, when, snack, kcal: planKcal(plan, db.profile.weight),
    label: `Bilan 3 jours · ${kind === 'even' ? 'équilibré' : sg(B.sum) + ' kcal'}`,
    title: kind === 'up' ? `${when} : séance renforcée ${pctTxt(B.pct)}` : kind === 'down' ? `${when} : séance allégée ${pctTxt(B.pct)}` : `${when} : séance normale`,
    sub: kind === 'up' ? `${sess.name}. ${sentence}`
      : kind === 'down' ? `${sess.name}. ${sentence} Ajoute une collation riche en protéines (~${snack} kcal).`
      : `${sess.name} · ${plan.minutes} min, telle que prévue.`,
  };
}

function EditEntry({ entry, onSave, onDelete, onClose }) {
  const [g, setG] = useState(entry.g);
  const kcal = kcalOf({ ...entry, g });
  return html`<${Sheet} onClose=${onClose} title=${entry.name}>
    <div class="sheet-title">${entry.name}</div>
    <div class="row-between">
      <${Stepper} value=${g} unit=${entry.unit} step=${entry.unit === 'ml' ? 50 : g >= 150 ? 25 : 10} onChange=${setG} label=${`Quantité de ${entry.name}`} />
      <div class="big-num">${fmt(kcal)}<span class="unit"> kcal</span></div>
    </div>
    <div class="muted small">Pour 100 ${entry.unit} : ${fmt(entry.k100)} kcal · P ${Math.round(entry.p100)} g · G ${Math.round(entry.c100)} g · L ${Math.round(entry.f100)} g</div>
    <div class="btn-row">
      <button class="btn btn-ghost danger" onClick=${onDelete}><${Icon} name="trash" size=${18} /> Supprimer</button>
      <button class="btn btn-dark" onClick=${() => onSave(g)}>Enregistrer</button>
    </div>
  </${Sheet}>`;
}

export function Today({ db, ui, actions }) {
  const tk = todayKey();
  const k = ui.date || tk;
  const isToday = k === tk;
  const day = getDay(db, k);
  const t = dayTotals(day);
  const p = db.profile;
  const G = GOALS[p.goal];
  const target = targetFor(p);
  const net = t.eaten - t.burned;
  const over = net - target;
  const mt = macroTargets(p);
  const [open, setOpen] = useState({});
  const [editing, setEditing] = useState(null);
  const L = isToday ? linkCard(db) : null;
  const linkStyle = L && { up: 'link-up', down: 'link-down', even: 'link-even' }[L.kind];

  const mealGroups = MEALS.map(m => {
    const entries = day.entries.filter(e => e.meal === m.id);
    const kcal = entries.reduce((s, e) => s + kcalOf(e), 0);
    const srcCount = {};
    entries.forEach(e => { srcCount[e.src] = (srcCount[e.src] || 0) + 1; });
    const src = Object.keys(srcCount).sort((a, b) => srcCount[b] - srcCount[a])[0] || 'text';
    const time = entries.length ? entries[0].time : '';
    return { ...m, entries, kcal, src, time };
  });

  return html`<div class="screen scroll">
    <header class="top">
      <div class="top-titles">
        <div class="date-nav">
          <button class="icon-btn small" aria-label="Jour précédent" onClick=${() => actions.setDate(addDays(k, -1))}><${Icon} name="left" size=${16} /></button>
          <${Kicker}>${longLabel(k)}</${Kicker}>
          <button class="icon-btn small" aria-label="Jour suivant" disabled=${isToday} onClick=${() => actions.setDate(addDays(k, 1))}><${Icon} name="right" size=${16} /></button>
        </div>
        <h1>${relativeDay(k, tk)}</h1>
      </div>
      <button class="avatar" aria-label="Réglages" onClick=${() => actions.go('settings')}><${Icon} name="user" /></button>
    </header>

    <section class="card ring-card">
      <button class="chip" onClick=${() => actions.go('settings')}>${G.short} · ${fmt(target)} kcal / jour</button>
      <${Ring} value=${net} max=${target} color=${over > 0 ? 'var(--accent)' : 'var(--ink)'}
        number=${over > 0 ? '+' + fmt(over) : fmt(-over)} label=${over > 0 ? 'kcal au-dessus' : 'kcal restantes'} />
      <div class="stats3">
        <div><div class="stat-num">${fmt(t.eaten)}</div><div class="stat-lbl">Mangé</div></div>
        <div><div class="stat-num green">${fmt(t.burned)}</div><div class="stat-lbl">Dépensé</div></div>
        <div><div class="stat-num">${fmt(target)}</div><div class="stat-lbl">Cible</div></div>
      </div>
    </section>

    ${L && html`<button class=${`link-card ${linkStyle}`} onClick=${() => actions.go('train')}>
      <div class="link-txt">
        <div class="kicker on-color">${L.label}</div>
        <div class="link-title">${L.title}</div>
        <div class="link-sub">${L.sub}</div>
      </div>
      <div class="link-arrow" aria-hidden="true">→</div>
    </button>`}

    <section class="card macros">
      ${[['Protéines', 'p'], ['Glucides', 'c'], ['Lipides', 'f']].map(([label, key]) => html`<div class="macro" key=${key}>
        <div class="stat-lbl">${label}</div>
        <div class="bar"><div style=${`width:${Math.min(100, (t[key] / mt[key]) * 100)}%`}></div></div>
        <div class="macro-val">${t[key]}<span class="muted"> / ${mt[key]} g</span></div>
      </div>`)}
    </section>

    <section class="stack">
      <div class="section-head"><h2>Repas</h2><span class="muted small">${fmt(t.eaten)} kcal</span></div>
      ${mealGroups.map(m => m.entries.length === 0
        ? html`<button key=${m.id} class="meal-empty" onClick=${() => actions.openAdd(m.id)}><span>${m.label}</span><span class="add-plus"><${Icon} name="plus" size=${18} /></span></button>`
        : html`<div key=${m.id} class="card meal">
            <button class="meal-head" aria-expanded=${!!open[m.id]} onClick=${() => setOpen({ ...open, [m.id]: !open[m.id] })}>
              <${SourceThumb} src=${m.src} />
              <div class="meal-txt">
                <div class="meal-name">${m.label}<span class="mono muted">${m.time}</span></div>
                <div class="meal-items">${m.entries.map(e => e.name).join(', ')}</div>
              </div>
              <div class="meal-kcal">${fmt(m.kcal)}</div>
            </button>
            ${open[m.id] && html`<div class="meal-body">
              ${m.entries.map(e => html`<button key=${e.id} class="entry" onClick=${() => setEditing(e)}>
                <span class="entry-name">${e.name}</span>
                <span class="muted">${e.g} ${e.unit}</span>
                <span class="entry-kcal">${fmt(kcalOf(e))}</span>
              </button>`)}
              <button class="text-btn" onClick=${() => actions.openAdd(m.id)}><${Icon} name="plus" size=${16} /> Ajouter un aliment</button>
            </div>`}
          </div>`)}
    </section>

    <section class="stack">
      <div class="section-head"><h2>Activité</h2><span class="muted small">${fmt(t.burned)} kcal</span></div>
      ${day.activities.map(a => html`<div key=${a.id} class="card act-row">
        <div class="act-dot" aria-hidden="true"><${Icon} name="bolt" size=${18} /></div>
        <div class="meal-txt">
          <div class="meal-name">${a.label}<span class="mono muted">${a.time || ''}</span></div>
          <div class="meal-items">${a.min} min${a.watch ? ' · valeur de la montre' : ''}</div>
        </div>
        <div class="meal-kcal green">−${fmt(a.kcal)}</div>
        <button class="icon-btn" aria-label=${`Supprimer ${a.label}`} onClick=${() => actions.removeActivity(k, a.id)}><${Icon} name="close" size=${16} /></button>
      </div>`)}
      <button class="meal-empty" onClick=${() => actions.openActivity()}><span>Ajouter une activité</span><span class="add-plus"><${Icon} name="plus" size=${18} /></span></button>
    </section>

    ${editing && html`<${EditEntry} entry=${editing} onClose=${() => setEditing(null)}
      onDelete=${() => { actions.removeEntry(k, editing.id); setEditing(null); }}
      onSave=${g => { actions.updateEntry(k, editing.id, { g }); setEditing(null); }} />`}
  </div>`;
}
