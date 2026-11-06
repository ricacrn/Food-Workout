import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { GOALS, dayTotals } from '../lib/nutrition.js';
import { WARM, sequence, specOf, metKcal, nextTrainingDay } from '../lib/program.js';
import { todayKey, addDays, mondayOf, weekday, dayNum, DAY_LETTER, DAY_SHORT, relativeDay } from '../lib/dates.js';
import { getDay } from '../lib/store.js';
import { fmt, sg, pctTxt, adjShort, fmtClock, Icon, Kicker } from '../ui.js';
import { linkCard } from './today.js';
import { beep } from '../lib/sound.js';

function row(name, spec, tag, dir, muted) {
  return { name, spec, tag, dir, muted };
}

export function planRows(plan) {
  const rows = [row('Échauffement', `${WARM} min · mobilité et cardio léger`)];
  plan.ex.forEach(e => rows.push(row(e.name, specOf(e), e.d > 0 ? '+1 série' : e.d < 0 ? '−1 série' : '', e.d)));
  if (plan.fin || plan.finBase) {
    const tag = plan.fin > plan.finBase ? (plan.finBase ? `+${plan.fin - plan.finBase} min` : 'ajouté') : plan.fin < plan.finBase ? 'retiré' : '';
    rows.push(row('Cardio final', plan.fin ? `${plan.fin} min · vélo ou rameur` : 'retiré pour cette séance', tag, Math.sign(plan.fin - plan.finBase), !plan.fin));
  }
  rows.push(row('Repos entre les séries', `${plan.rest} s`, plan.rest < 90 ? '−30 s' : plan.rest > 90 ? '+30 s' : '', plan.rest < 90 ? 1 : -1));
  return rows;
}

export function Train({ db, actions }) {
  const tk = todayKey();
  const L = linkCard(db);
  const { B, plan, kind } = L;
  const p = db.profile;
  const G = GOALS[p.goal];
  const nextK = nextTrainingDay(db, tk);
  const mon = mondayOf(tk);
  const week = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const k = addDays(mon, i);
    const done = db.sessions.some(s => s.date === k);
    const planned = p.days.includes(i);
    return { k, i, done, planned, next: k === nextK && !done, today: k === tk };
  });
  const doneWeek = week.filter(d => d.done).length;
  const scale = 46 / Math.max(600, ...B.days.map(d => Math.abs(d.v)));
  const recent = db.sessions.slice(-5).reverse();

  return html`<div class="screen scroll">
    <header class="top">
      <div class="top-titles">
        <${Kicker}>Programme · ${G.short}</${Kicker}>
        <h1>Entraînement</h1>
      </div>
      <button class="avatar" aria-label="Réglages" onClick=${() => actions.go('settings')}><${Icon} name="user" /></button>
    </header>

    <section class="card week">
      <div class="week-grid">
        ${week.map(d => html`<div key=${d.k} class="week-day">
          <div class="mono muted tiny">${DAY_LETTER[d.i]}</div>
          <div class=${`week-dot ${d.done ? 'done' : d.next ? 'next' : d.planned ? 'planned' : ''} ${d.today ? 'today' : ''}`}>
            ${d.done ? html`<${Icon} name="check" size=${16} stroke=${3} />` : dayNum(d.k)}
          </div>
        </div>`)}
      </div>
      <div class="muted tiny center">${p.days.length} séances prévues cette semaine · ${doneWeek} faite${doneWeek > 1 ? 's' : ''}</div>
    </section>

    <section class="balance">
      <div class="row-between base">
        <div class="kicker on-dark">Bilan 3 jours</div>
        <div class="strong">${kind === 'even' ? `${sg(B.sum) || '0'} kcal · équilibré` : `${sg(B.sum)} kcal`}</div>
      </div>
      <div class="bars">
        ${B.days.map(d => {
          const v = d.v;
          const h = !d.counted || v === 0 ? 0 : Math.max(3, Math.round(Math.abs(v) * scale));
          const up = v >= 0;
          const val = !d.counted ? 'non noté' : d.live && d.raw <= 0 ? 'en cours' : sg(v) || '0';
          return html`<div key=${d.k} class="bar-col">
            <div class=${`bar-val ${(!d.counted || (d.live && d.raw <= 0)) ? 'dim' : ''}`}>${val}</div>
            <div class="bar-track">
              <div class="bar-axis"></div>
              <div class="bar-fill" style=${`top:${up ? 48 - h : 48}px;height:${h}px;background:${up ? 'var(--surplus)' : 'var(--deficit)'};opacity:${d.live ? 0.75 : 1}`}></div>
            </div>
            <div class="mono tiny on-dark-dim">${d.live ? 'Auj.' : DAY_SHORT[weekday(d.k)]}</div>
          </div>`;
        })}
      </div>
      <div class="balance-sep"></div>
      <div class=${`verdict ${kind}`}>${kind === 'even' ? 'Séance normale' : `Séance ${B.pct > 0 ? 'renforcée' : 'allégée'} ${pctTxt(B.pct)}`}</div>
      <div class="on-dark-dim small">Chaque 250 kcal d’écart ajuste ta séance de 5 %, jusqu’à ±20 %. Aujourd’hui compte dès que tu dépasses ta cible ; un jour sans repas noté est ignoré.</div>
    </section>

    <section class="card session">
      <div class="row-between start">
        <div>
          <${Kicker}>${relativeDay(nextK, tk)} · ${plan.minutes} min · ≈ ${fmt(L.kcal)} kcal</${Kicker}>
          <div class="session-name">${plan.session.name}</div>
        </div>
        <div class=${`adj-chip ${kind}`}>${adjShort(B.pct)}</div>
      </div>
      ${planRows(plan).map(r => html`<div key=${r.name} class="plan-row">
        <div class="plan-txt">
          <div class=${`strong ${r.muted ? 'muted' : ''}`}>${r.name}</div>
          <div class="muted small">${r.spec}</div>
        </div>
        ${r.tag && html`<div class=${`tag ${r.dir > 0 ? 'up' : 'down'}`}>${r.tag}</div>`}
      </div>`)}
    </section>

    ${kind === 'down' && html`<div class="nudge">Il te manque de l’énergie pour bien récupérer : ajoute une collation riche en protéines (~${L.snack} kcal) avant la séance.</div>`}

    <button class="btn btn-dark wide" onClick=${() => actions.startWorkout(plan, B)}>Commencer la séance</button>

    ${recent.length > 0 && html`<section class="stack">
      <div class="section-head"><h2>Dernières séances</h2></div>
      ${recent.map(s => html`<div key=${s.id} class="card hist">
        <div>
          <div class="strong">${s.name}</div>
          <div class="muted small">${relativeDay(s.date, tk)} · ${s.min} min · ${adjShort(s.pct)}</div>
        </div>
        <div class="strong green">−${fmt(s.kcal)}</div>
      </div>`)}
    </section>`}

    <div class="muted tiny foot">Calories estimées à partir de ton poids (méthode MET). L’Apple Watch pourra les remplacer par des mesures réelles.</div>
  </div>`;
}

export function Workout({ db, actions }) {
  const w = db.workout;
  const [now, setNow] = useState(Date.now());
  const last = useRef(null);
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); actions.workoutTick(); }, 500);
    return () => clearInterval(t);
  }, []);
  const seq = w ? sequence(w.plan) : [];
  const cur = w ? seq[w.step] : null;
  useEffect(() => {
    if (!w) return;
    const sig = `${w.step}-${w.phase}`;
    if (last.current && last.current !== sig) beep(w.phase === 'work' ? 2 : 1);
    last.current = sig;
  }, [w && w.step, w && w.phase]);
  if (!w || !cur) return null;

  const elapsed = (now - w.startedAt) / 1000;
  const left = w.phaseEnd ? (w.phaseEnd - now) / 1000 : 0;
  const weight = db.profile.weight;
  const finMin = (w.finSec + (cur.finisher && w.phase === 'work' ? (now - w.phaseStart) / 1000 : 0)) / 60;
  const kcal = metKcal(5, weight, elapsed / 60 - finMin) + metKcal(8, weight, finMin);
  const exo = w.plan.ex.find(e => e.name === cur.ex);

  let heading, sub, big, bigLabel, primary;
  if (w.phase === 'rest') {
    heading = 'Repos';
    sub = `Ensuite : ${cur.name}${cur.kind === 'set' ? ` · série ${cur.i}/${cur.n}` : ''}`;
    big = fmtClock(left); bigLabel = 'de récupération'; primary = 'Passer le repos';
  } else if (cur.kind === 'set') {
    heading = cur.name; sub = `Série ${cur.i} sur ${cur.n}`;
    big = cur.sec ? String(cur.sec) : String(cur.reps);
    bigLabel = cur.sec ? 'secondes' : exo && exo.weighted ? 'répétitions' : 'répétitions · poids du corps';
    primary = 'Série terminée';
  } else {
    heading = cur.name; sub = cur.sub; big = fmtClock(left); bigLabel = 'restantes'; primary = 'Passer';
  }
  const pctLabel = w.plan.pct === 0 ? 'séance normale' : `${w.plan.pct > 0 ? 'renforcée' : 'allégée'} ${pctTxt(w.plan.pct)}`;

  return html`<div class="workout">
    <div class="row-between">
      <button class="pill-dark" onClick=${() => actions.quitWorkout()}>Quitter</button>
      <div class="mono small dim">${fmtClock(elapsed)} · ${w.step + 1}/${seq.length}</div>
    </div>
    <div class="wk-head">
      <div class="dim">${w.plan.session.name} · ${pctLabel}</div>
      <div class="wk-title">${heading}</div>
      <div class="wk-sub">${sub}</div>
    </div>
    <div class="wk-center">
      <div class="wk-big">${big}</div>
      <div class="dim">${bigLabel}</div>
      ${w.phase === 'work' && cur.kind === 'set' && exo && exo.weighted && html`<div class="load">
        <button aria-label="Moins 2,5 kg" onClick=${() => actions.setLoad(exo.name, exo.kg - 2.5)}>−</button>
        <div><span class="load-num">${String(exo.kg).replace('.', ',')}</span> kg</div>
        <button aria-label="Plus 2,5 kg" onClick=${() => actions.setLoad(exo.name, exo.kg + 2.5)}>+</button>
      </div>`}
    </div>
    <div class="wk-stats">
      <div><div class="tiny dim">Calories estimées</div><div class="wk-stat">≈ ${fmt(kcal)} kcal</div></div>
      <div><div class="tiny dim">Fréquence cardiaque</div><div class="wk-stat">— <span class="tiny dim">montre bientôt</span></div></div>
    </div>
    <div class="wk-progress"><div style=${`width:${(w.step / seq.length) * 100}%`}></div></div>
    <div class="wk-buttons">
      <button class="btn btn-outline-light" onClick=${() => actions.finishWorkout()}>Terminer</button>
      <button class="btn btn-light" onClick=${() => actions.workoutPrimary()}>${primary}</button>
    </div>
  </div>`;
}

export function Done({ db, ui, actions }) {
  const r = ui.done || {};
  const tk = todayKey();
  const L = linkCard(db);
  const t = dayTotals(getDay(db, tk));
  const target = L.B.target;
  const net = t.eaten - t.burned - target;
  return html`<div class="done">
    <${Kicker} style="color:var(--green)">Séance enregistrée · ${r.name}</${Kicker}>
    <div class="done-num">+${fmt(r.kcal)}</div>
    <div class="done-sub">kcal dépensées en ${r.min} min</div>
    <div class="card list-card">
      <div class="row-between"><span class="muted">Mangé</span><span class="strong">${fmt(t.eaten)}</span></div>
      <div class="row-between"><span class="muted">Dépensé</span><span class="strong green">−${fmt(t.burned)}</span></div>
      <div class="sep"></div>
      <div class="row-between"><span class="strong">Net vs cible</span><span class="strong">${net > 0 ? `+${fmt(net)} kcal` : net === 0 ? 'Pile sur la cible' : `${fmt(net)} sous la cible`}</span></div>
    </div>
    <div class="card list-card">
      <div class="row-between"><span class="muted">Bilan 3 jours</span><span class="strong">${sg(r.preSum) || '0'} → ${sg(L.B.sum) || '0'} kcal</span></div>
      <div class="sep"></div>
      <div class="muted small">Prochaine séance</div>
      <div class="strong">${L.when} · ${L.sess.name} · ${adjShort(L.B.pct)}</div>
    </div>
    <div class="spacer"></div>
    <button class="btn btn-dark wide" onClick=${() => actions.go('today', { date: tk })}>Retour à aujourd’hui</button>
  </div>`;
}
