import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { GOALS, dayTotals } from '../lib/nutrition.js';
import {
  WARM, sequence, blocks, specOf, metKcal, nextTrainingDay, exInfo, currentTarget,
  stepChoices, defaultStep, RATINGS, fmtKg,
} from '../lib/program.js';
import { todayKey, addDays, mondayOf, weekday, dayNum, DAY_LETTER, DAY_SHORT, relativeDay } from '../lib/dates.js';
import { getDay } from '../lib/store.js';
import { fmt, sg, pctTxt, adjShort, fmtClock, Icon, Kicker, Sheet, Seg, Stepper, LoadControl, Sparkline } from '../ui.js';
import { linkCard } from './today.js';
import { beep } from '../lib/sound.js';

const ratingName = id => (RATINGS.find(r => r.id === id) || RATINGS[1]).label;

function valueOf(kind, h) {
  return kind === 'kg' ? h.kg : kind === 'bw' ? h.reps : h.sec;
}
function valueLabel(kind, v) {
  return kind === 'kg' ? `${fmtKg(v)} kg` : kind === 'bw' ? `${v} reps` : `${v} s`;
}
function lastLabel(exo, h) {
  if (exo.kind === 'kg') return `${fmtKg(h.kg)} kg × ${h.reps}`;
  return exo.kind === 'bw' ? `${h.reps} reps` : `${h.sec} s`;
}
function lastTime(db, name) {
  const h = db.progress[name] && db.progress[name].hist;
  return h && h.length ? h[h.length - 1] : null;
}

/** Fiche d'un exercice : charge, progression et remplacements. */
export function ExerciseSheet({ db, name, slot, alts, scope, actions, onClose }) {
  const info = exInfo(name);
  const p = db.progress[name] || {};
  const t = currentTarget(db, name);
  const hist = (p.hist || []).slice(-12);
  const values = hist.map(h => valueOf(info.kind, h));
  const last = hist[hist.length - 1];
  const [mode, setMode] = useState(scope === 'workout' ? 'once' : 'always');
  const others = (alts || []).filter(a => a !== name);

  return html`<${Sheet} onClose=${onClose} title=${name}>
    <div>
      <div class="sheet-title">${name}</div>
      <div class="muted small">${info.gear}${info.per ? ' · charge par main' : ''}</div>
    </div>

    ${info.kind === 'kg'
      ? html`<div class="stack-s">
          <div class="field-label">${scope === 'workout' ? 'Charge' : 'Charge prévue'}</div>
          <${LoadControl} value=${t.kg} step=${p.step || defaultStep(name)} steps=${stepChoices(name)}
            onChange=${v => actions.setLoad(name, v)} onStep=${s => actions.setStep(name, s)} />
        </div>`
      : html`<div class="row-between">
          <span class="field-label">${info.kind === 'bw' ? 'Répétitions prévues' : 'Durée prévue'}</span>
          <${Stepper} value=${info.kind === 'bw' ? t.reps : t.sec} unit=${info.kind === 'bw' ? 'reps' : 's'} step=${info.kind === 'bw' ? 1 : 5}
            onChange=${v => actions.setTarget(name, info.kind === 'bw' ? { reps: Math.max(1, v) } : { sec: Math.max(5, v) })}
            label=${info.kind === 'bw' ? 'Répétitions' : 'Durée en secondes'} />
        </div>`}

    <div class="card prog-card">
      <div class="row-between">
        <span class="strong">Progression</span>
        <span class="accent"><${Sparkline} values=${values} /></span>
      </div>
      <div class="muted small">${last
        ? `Dernière fois : ${valueLabel(info.kind, valueOf(info.kind, last))}${info.kind === 'kg' ? ` × ${last.reps}` : ''} · ${ratingName(last.rating)} · ${relativeDay(last.date)}`
        : 'Pas encore fait : règle la charge à ta première séance, l’app la retient.'}</div>
      ${values.length > 1 && html`<div class="muted small">Depuis le début : ${valueLabel(info.kind, values[0])} → ${valueLabel(info.kind, info.kind === 'kg' ? t.kg : info.kind === 'bw' ? t.reps : t.sec)}</div>`}
    </div>

    ${others.length > 0 && html`<div class="stack-s">
      <div class="field-label">Remplacer par</div>
      ${scope === 'workout' && html`<${Seg} small options=${[{ id: 'once', label: 'Cette séance' }, { id: 'always', label: 'Toujours' }]} value=${mode} onChange=${setMode} />`}
      <div class="alt-list">
        ${others.map(a => html`<button key=${a} class="alt" onClick=${() => { actions.swap(slot, a, scope === 'workout' ? mode : 'always'); onClose(); }}>
          <div class="alt-txt">
            <div class="strong">${a}${a === slot ? html` <span class="muted small">· d’origine</span>` : ''}</div>
            <div class="muted small">${exInfo(a).gear}</div>
          </div>
          <${Icon} name="right" size=${18} />
        </button>`)}
      </div>
      ${scope !== 'workout' && html`<div class="muted tiny">Ton choix est retenu pour les prochaines séances. Tu peux revenir à l’exercice d’origine ici.</div>`}
    </div>`}
  </${Sheet}>`;
}

function row(name, spec, tag, dir, muted, ex) {
  return { name, spec, tag, dir, muted, ex };
}

export function planRows(plan) {
  const rows = [row('Échauffement', `${WARM} min · mobilité et cardio léger`)];
  plan.ex.forEach(e => rows.push(row(e.name, specOf(e), e.d > 0 ? '+1 série' : e.d < 0 ? '−1 série' : '', e.d, false, e)));
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
  const [sheet, setSheet] = useState(null);
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
  const progList = Object.entries(db.progress)
    .filter(([, pr]) => pr.hist && pr.hist.length)
    .map(([name, pr]) => ({ name, pr, last: pr.hist[pr.hist.length - 1], info: exInfo(name) }))
    .sort((a, b) => (a.last.date < b.last.date ? 1 : a.last.date > b.last.date ? -1 : 0))
    .slice(0, 10);

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
          <div class=${`week-dot ${d.done ? 'done' : d.next ? 'next' : d.planned ? 'planned' : ''} ${d.today ? 'today' : ''}`}
            aria-label=${d.done ? 'séance faite' : d.next ? 'prochaine séance' : d.planned ? 'séance prévue' : 'repos'}>
            ${d.done ? html`<${Icon} name="check" size=${16} stroke=${3} />` : dayNum(d.k)}
          </div>
        </div>`)}
      </div>
      <div class="legend">
        <span><i class="lg-done"></i>Faite</span>
        <span><i class="lg-next"></i>Prochaine</span>
        <span><i class="lg-planned"></i>Prévue</span>
        <span class="muted">${doneWeek}/${p.days.length} cette semaine</span>
      </div>
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
      ${planRows(plan).map((r, i) => r.ex
        ? html`<button key=${i} class="plan-row tap" onClick=${() => setSheet(r.ex)}>
            <div class="plan-txt">
              <div class="strong">${r.name}</div>
              <div class="muted small">${r.spec}</div>
            </div>
            ${r.tag && html`<div class=${`tag ${r.dir > 0 ? 'up' : 'down'}`}>${r.tag}</div>`}
            <span class="chev"><${Icon} name="right" size=${16} /></span>
          </button>`
        : html`<div key=${i} class="plan-row">
            <div class="plan-txt">
              <div class=${`strong ${r.muted ? 'muted' : ''}`}>${r.name}</div>
              <div class="muted small">${r.spec}</div>
            </div>
            ${r.tag && html`<div class=${`tag ${r.dir > 0 ? 'up' : 'down'}`}>${r.tag}</div>`}
          </div>`)}
      <div class="muted tiny session-hint">Touche un exercice pour régler sa charge ou le remplacer.</div>
    </section>

    ${kind === 'down' && html`<div class="nudge">Il te manque de l’énergie pour bien récupérer : ajoute une collation riche en protéines (~${L.snack} kcal) avant la séance.</div>`}

    <button class="btn btn-dark wide" onClick=${() => actions.startWorkout(plan, B)}>Commencer la séance</button>

    <section class="stack">
      <div class="section-head"><h2>Progression des charges</h2></div>
      ${progList.length === 0
        ? html`<div class="card empty-card muted small">Après ta première séance, tu verras ici l’évolution de chaque exercice. Note ton ressenti à la fin de chaque exercice : l’app ajuste la charge suivante.</div>`
        : progList.map(x => {
          const values = x.pr.hist.map(h => valueOf(x.info.kind, h));
          const t = currentTarget(db, x.name);
          const next = x.info.kind === 'kg' ? t.kg : x.info.kind === 'bw' ? t.reps : t.sec;
          const delta = next - values[values.length - 1];
          return html`<button key=${x.name} class="card prog-row" onClick=${() => setSheet({ name: x.name, slot: null, alts: [] })}>
            <div class="plan-txt">
              <div class="strong">${x.name}</div>
              <div class="muted small">Prochaine fois : ${valueLabel(x.info.kind, next)}${delta ? html` <span class=${delta > 0 ? 'green strong' : 'blue strong'}>(${delta > 0 ? '+' : '−'}${valueLabel(x.info.kind, Math.abs(delta))})</span>` : ''}</div>
            </div>
            <span class="accent"><${Sparkline} values=${[...values, next]} /></span>
          </button>`;
        })}
    </section>

    ${recent.length > 0 && html`<section class="stack">
      <div class="section-head"><h2>Dernières séances</h2></div>
      ${recent.map(s => html`<div key=${s.id} class="card hist">
        <div>
          <div class="strong">${s.name}</div>
          <div class="muted small">${relativeDay(s.date, tk)} · ${s.min} min · ${adjShort(s.pct)}</div>
        </div>
        <div class="strong">${fmt(s.kcal)} kcal</div>
      </div>`)}
    </section>`}

    <div class="muted tiny foot">Calories estimées à partir de ton poids (méthode MET). L’Apple Watch pourra les remplacer par des mesures réelles.</div>

    ${sheet && html`<${ExerciseSheet} db=${db} name=${sheet.name} slot=${sheet.slot} alts=${sheet.alts} scope="plan" actions=${actions} onClose=${() => setSheet(null)} />`}
  </div>`;
}

export function Workout({ db, actions }) {
  const w = db.workout;
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState(null);
  const lastAuto = useRef(w ? w.autoAt : null);
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); actions.workoutTick(); }, 500);
    return () => clearInterval(t);
  }, []);
  // Bip uniquement quand un minuteur se termine tout seul (pas quand tu appuies).
  useEffect(() => {
    if (!w) return;
    if (w.autoAt && w.autoAt !== lastAuto.current) beep(w.phase === 'work' ? 2 : 1);
    lastAuto.current = w.autoAt;
  }, [w && w.autoAt]);
  const seq = w ? sequence(w.plan) : [];
  const cur = w ? seq[w.step] : null;
  if (!w || !cur) return null;

  const elapsed = (now - w.startedAt) / 1000;
  const left = w.phaseEnd ? (w.phaseEnd - now) / 1000 : 0;
  const weight = db.profile.weight;
  const finMin = (w.finSec + (cur.finisher && w.phase === 'work' ? (now - w.phaseStart) / 1000 : 0)) / 60;
  const kcal = metKcal(5, weight, elapsed / 60 - finMin) + metKcal(8, weight, finMin);
  const exo = cur.kind === 'set' ? w.plan.ex[cur.ex] : null;
  const prev = w.step > 0 ? seq[w.step - 1] : null;
  const justFinished = w.phase === 'rest' && prev && prev.kind === 'set' && prev.i === prev.n ? prev.name : null;
  const last = exo ? lastTime(db, exo.name) : null;

  let heading, sub, big, bigLabel, primary;
  if (w.phase === 'rest') {
    heading = 'Repos';
    sub = `Ensuite : ${cur.name}${cur.kind === 'set' ? ` · série ${cur.i}/${cur.n}` : ''}`;
    big = fmtClock(left); bigLabel = 'de récupération'; primary = 'Passer le repos';
  } else if (cur.kind === 'set') {
    heading = cur.name; sub = `Série ${cur.i} sur ${cur.n}`;
    big = exo.kind === 'sec' ? String(exo.sec) : String(exo.reps);
    bigLabel = exo.kind === 'sec' ? `secondes${exo.side ? ' par côté' : ''}` : exo.kind === 'bw' ? `répétitions${exo.side ? ' par jambe' : ''} · poids du corps` : `répétitions${exo.per ? ' · charge par main' : ''}`;
    primary = 'Série terminée';
  } else {
    heading = cur.name; sub = cur.sub; big = fmtClock(left); bigLabel = 'restantes'; primary = 'Passer';
  }
  const pctLabel = w.plan.pct === 0 ? 'séance normale' : `${w.plan.pct > 0 ? 'renforcée' : 'allégée'} ${pctTxt(w.plan.pct)}`;

  // Progression par bloc (échauffement, chaque exercice, cardio)
  const names = blocks(w.plan);
  const stats = names.map(() => ({ total: 0, done: 0 }));
  seq.forEach((st, idx) => { stats[st.block].total += 1; if (idx < w.step) stats[st.block].done += 1; });
  const curBlock = cur.block;

  return html`<div class="workout">
    <div class="row-between">
      <button class="pill-dark" onClick=${() => actions.quitWorkout()}>Quitter</button>
      <div class="mono small dim">Durée ${fmtClock(elapsed)}</div>
    </div>
    <div class="wk-head">
      <div class="dim small">${w.plan.session.name} · ${pctLabel}</div>
      <div class="wk-title">${heading}</div>
      <div class="row-between">
        <div class="wk-sub">${sub}</div>
        ${cur.kind === 'set' && html`<button class="pill-dark small" onClick=${() => setSheet(w.plan.ex[cur.ex])}>Remplacer</button>`}
      </div>
    </div>

    <div class="wk-center">
      <div class="wk-big">${big}</div>
      <div class="dim">${bigLabel}</div>

      ${justFinished && html`<div class="rate">
        <div class="small">${justFinished} terminé : c’était comment ?</div>
        <div class="rate-row">
          ${RATINGS.map(r => html`<button key=${r.id} class=${(w.ratings && w.ratings[justFinished]) === r.id ? 'on' : ''} onClick=${() => actions.rate(justFinished, r.id)}>${r.label}</button>`)}
        </div>
      </div>`}

      ${w.phase === 'work' && exo && exo.kind === 'kg' && html`<${LoadControl} dark value=${exo.kg}
        step=${(db.progress[exo.name] && db.progress[exo.name].step) || defaultStep(exo.name)} steps=${stepChoices(exo.name)}
        onChange=${v => actions.setLoad(exo.name, v)} onStep=${s => actions.setStep(exo.name, s)} />`}
      ${w.phase === 'work' && exo && last && html`<div class="tiny dim">Dernière fois : ${lastLabel(exo, last)} · ${ratingName(last.rating)}${exo.kind === 'kg' && exo.kg !== last.kg ? ` · aujourd’hui ${exo.kg > last.kg ? '+' : '−'}${fmtKg(Math.abs(exo.kg - last.kg))} kg` : ''}</div>`}
    </div>

    <div class="wk-stats">
      <div><div class="tiny dim">Calories estimées</div><div class="wk-stat">≈ ${fmt(kcal)} kcal</div></div>
      <div><div class="tiny dim">Fréquence cardiaque</div><div class="wk-stat">— <span class="tiny dim">montre bientôt</span></div></div>
    </div>

    <div class="wk-steps" aria-label=${`Étape ${curBlock + 1} sur ${names.length} : ${names[curBlock]}`}>
      <div class="wk-seg">
        ${stats.map((st, i) => html`<div key=${i} class=${i === curBlock ? 'cur' : ''}><div style=${`width:${st.total ? (st.done / st.total) * 100 : 0}%`}></div></div>`)}
      </div>
      <div class="tiny dim">Étape ${curBlock + 1} sur ${names.length} · ${names[curBlock]}</div>
    </div>

    <div class="wk-buttons">
      <button class="btn btn-outline-light" onClick=${() => actions.finishWorkout()}>Terminer</button>
      <button class="btn btn-light" onClick=${() => actions.workoutPrimary()}>${primary}</button>
    </div>

    ${sheet && html`<${ExerciseSheet} db=${db} name=${sheet.name} slot=${sheet.slot} alts=${sheet.alts} scope="workout" actions=${actions} onClose=${() => setSheet(null)} />`}
  </div>`;
}

export function Done({ db, ui, actions }) {
  const r = ui.done || {};
  const tk = todayKey();
  const L = linkCard(db);
  const t = dayTotals(getDay(db, tk));
  const target = L.B.target;
  const net = t.eaten - t.burned - target;
  const done = Object.entries(db.progress)
    .map(([name, p]) => ({ name, p, entry: (p.hist || []).find(h => h.sid === r.sid), info: exInfo(name) }))
    .filter(x => x.entry);

  return html`<div class="done-screen">
    <${Kicker} style="color:var(--green)">Séance enregistrée · ${r.name}</${Kicker}>
    <div class="done-num">${fmt(r.kcal)} kcal</div>
    <div class="done-sub">dépensées en ${r.min} min</div>

    ${done.length > 0 && html`<div class="card list-card">
      <div class="strong">Ton ressenti → prochaine charge</div>
      ${done.map(x => {
        const tg = currentTarget(db, x.name);
        const now = valueOf(x.info.kind, x.entry);
        const next = x.info.kind === 'kg' ? tg.kg : x.info.kind === 'bw' ? tg.reps : tg.sec;
        const isLast = x.p.hist[x.p.hist.length - 1] === x.entry;
        return html`<div key=${x.name} class="done-ex">
          <div class="row-between base">
            <span class="strong">${x.name}</span>
            <span class="small">${valueLabel(x.info.kind, now)}${isLast ? html` → <b class=${next > now ? 'green' : next < now ? 'blue' : ''}>${valueLabel(x.info.kind, next)}</b>` : ''}</span>
          </div>
          <${Seg} small options=${RATINGS} value=${x.entry.rating} onChange=${v => actions.rateAfter(r.sid, x.name, v)} />
        </div>`;
      })}
      <div class="muted tiny">Facile : on monte dès la prochaine fois. Bien deux fois de suite : on monte. Difficile deux fois : on redescend.</div>
    </div>`}

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
