import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as store from './lib/store.js';
import { mealForNow } from './lib/nutrition.js';
import { sequence, metKcal, exerciseEntry, recompute, roundKg } from './lib/program.js';
import { todayKey, hhmm } from './lib/dates.js';
import { unlockAudio, keepAwake } from './lib/sound.js';
import { Icon } from './ui.js';
import { Today } from './views/today.js';
import { Capture, Review } from './views/add.js';
import { Train, Workout, Done } from './views/train.js';
import { Onboarding, Settings, ActivitySheet } from './views/settings.js';

const { uid } = store;

function enterStep(w, now) {
  const st = sequence(w.plan)[w.step];
  w.phase = 'work';
  w.phaseStart = now;
  w.phaseEnd = st && st.kind === 'timed' ? now + st.min * 60000 : null;
}

// Passe à l'étape suivante. Renvoie true quand la séance est finie.
function advance(w, now) {
  const seq = sequence(w.plan);
  const cur = seq[w.step];
  if (cur.kind === 'set') {
    w.done = w.done || {};
    w.done[cur.name] = (w.done[cur.name] || 0) + 1;
  }
  if (cur.kind === 'timed' && cur.finisher) w.finSec += Math.max(0, (Math.min(now, w.phaseEnd || now) - w.phaseStart) / 1000);
  if (w.step + 1 >= seq.length) {
    w.phase = 'ended';
    w.phaseEnd = null;
    return true;
  }
  w.step += 1;
  if (cur.kind === 'set') {
    w.phase = 'rest';
    w.phaseStart = now;
    w.phaseEnd = now + w.plan.rest * 1000;
  } else {
    enterStep(w, now);
  }
  return false;
}

// Remplace un exercice dans la séance en cours (mêmes séries, nouvelle charge).
function swapInWorkout(d, slot, name) {
  const w = d.workout;
  if (!w) return;
  const i = w.plan.ex.findIndex(e => e.slot === slot);
  if (i < 0) return;
  const old = w.plan.ex[i];
  if (old.name === name) return;
  // séries déjà faites sur l'ancien exercice : on les garde pour l'historique
  if (w.done && w.done[old.name]) w.swappedOut = [...(w.swappedOut || []), old];
  const slotObj = { n: slot, s: old.base, alts: old.alts.filter(a => a !== slot) };
  w.plan.ex[i] = exerciseEntry(d, slotObj, name, w.plan.goal, old.d);
}

function App() {
  const [db, setDb] = useState(store.load);
  const [ui, setUi] = useState(() => ({ screen: db.workout ? 'workout' : 'today', date: todayKey(), draft: null, sheet: null, done: null }));
  const [toast, setToast] = useState('');
  const toastT = useRef(null);
  const seenToday = useRef(todayKey());

  useEffect(() => { window.scrollTo(0, 0); }, [ui.screen, !!db.profile]);

  const update = fn =>
    setDb(prev => {
      const draft = structuredClone(prev);
      const res = fn(draft);
      const next = res || draft;
      if (!store.save(next)) notify('Mémoire du téléphone pleine : exporte puis efface d’anciennes données.');
      return next;
    });

  function notify(msg) {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 2800);
  }

  const go = (screen, extra = {}) => setUi(u => ({ ...u, screen, sheet: null, ...extra }));

  function finishWorkout(wArg) {
    const w = wArg || db.workout;
    if (!w) return;
    const now = Date.now();
    const seq = sequence(w.plan);
    const cur = seq[w.step];
    let finSec = w.finSec;
    if (cur && cur.finisher && w.phase === 'work') finSec += (now - w.phaseStart) / 1000;
    const min = Math.max(1, Math.round((now - w.startedAt) / 60000));
    const finMin = finSec / 60;
    const kcal = metKcal(5, db.profile.weight, Math.max(0, min - finMin)) + metKcal(8, db.profile.weight, finMin);
    const name = w.plan.session.name;
    const sid = uid();
    update(d => {
      const k = w.date;
      d.days[k] = d.days[k] || store.emptyDay();
      d.days[k].activities.push({ id: uid(), sid, type: 'session', label: name, min, kcal, time: hhmm(new Date(w.startedAt)) });
      d.sessions.push({ id: sid, date: k, name, min, kcal, pct: w.plan.pct });
      d.sessions = d.sessions.slice(-200);
      d.sessIdx += 1;
      d.workout = null;
      // Historique et progression de chaque exercice réellement fait
      const seen = new Set();
      [...w.plan.ex, ...(w.swappedOut || [])].forEach(e => {
        if (seen.has(e.name)) return;
        seen.add(e.name);
        const sets = (w.done && w.done[e.name]) || 0;
        if (!sets) return;
        const p = (d.progress[e.name] = d.progress[e.name] || {});
        p.hist = p.hist || [];
        p.hist.push({ date: k, sid, kg: e.kg, reps: e.reps, sec: e.sec, sets, rating: (w.ratings && w.ratings[e.name]) || 'bien' });
        if (p.hist.length > 60) p.hist = p.hist.slice(-60);
        recompute(p, e.name);
      });
    });
    keepAwake(false);
    go('done', { done: { sid, name, kcal, min, preSum: w.preSum } });
  }

  const actions = {
    update, notify, go,
    setDate: date => setUi(u => ({ ...u, date })),
    replaceDb: next => { store.save(next); setDb(next); go('today'); },
    wipe: () => { store.wipe(); setDb(store.defaultDb()); go('today', { date: todayKey() }); },

    // Ajout de repas (depuis Entraînement, c'est toujours pour aujourd'hui)
    openAdd: (meal, mode = 'text') => go('add', {
      draft: { meal: meal || mealForNow(), date: ui.screen === 'today' ? ui.date || todayKey() : todayKey(), mode },
    }),
    closeAdd: () => go('today'),
    toReview: patch => setUi(u => ({ ...u, screen: 'review', draft: { ...u.draft, ...patch } })),
    backToCapture: mode => setUi(u => ({ ...u, screen: 'add', draft: { ...u.draft, mode } })),
    addEntries: (date, meal, items, source) => {
      const time = hhmm();
      update(d => {
        d.days[date] = d.days[date] || store.emptyDay();
        items.forEach(i => d.days[date].entries.push({
          id: uid(), meal, time, src: i.src || source,
          name: i.name, g: i.g, unit: i.unit, k100: i.k100, p100: i.p100 || 0, c100: i.c100 || 0, f100: i.f100 || 0,
        }));
        const fresh = items.map(i => ({ name: i.name, g: i.g, unit: i.unit, k100: i.k100, p100: i.p100 || 0, c100: i.c100 || 0, f100: i.f100 || 0, src: i.src || source }));
        d.recents = [...fresh, ...d.recents.filter(r => !fresh.some(f => f.name === r.name))].slice(0, 24);
      });
      go('today', { date });
      notify('Repas ajouté');
    },
    removeEntry: (date, id) => update(d => { if (d.days[date]) d.days[date].entries = d.days[date].entries.filter(e => e.id !== id); }),
    updateEntry: (date, id, patch) => update(d => {
      const e = d.days[date] && d.days[date].entries.find(x => x.id === id);
      if (e) Object.assign(e, patch);
    }),

    // Activités
    openActivity: () => setUi(u => ({ ...u, sheet: 'activity' })),
    removeActivity: (date, id) => update(d => {
      if (!d.days[date]) return;
      const a = d.days[date].activities.find(x => x.id === id);
      d.days[date].activities = d.days[date].activities.filter(x => x.id !== id);
      if (a && a.type === 'session') {
        const i = a.sid ? d.sessions.findIndex(s => s.id === a.sid) : d.sessions.findIndex(s => s.date === date && s.name === a.label);
        if (i >= 0) d.sessions.splice(i, 1);
        // annule aussi la progression enregistrée pendant cette séance
        if (a.sid) Object.entries(d.progress).forEach(([name, p]) => {
          if (!p.hist || !p.hist.some(h => h.sid === a.sid)) return;
          p.hist = p.hist.filter(h => h.sid !== a.sid);
          recompute(p, name);
        });
      }
    }),

    // Séance
    startWorkout: (plan, B) => {
      unlockAudio();
      keepAwake(true);
      const now = Date.now();
      update(d => {
        d.workout = { v: 2, plan, date: todayKey(), startedAt: now, step: 0, phase: 'work', phaseStart: now, phaseEnd: null, finSec: 0, preSum: B.sum, done: {}, ratings: {} };
        enterStep(d.workout, now);
      });
      go('workout');
    },
    workoutTick: () => setDb(prev => {
      const w = prev.workout;
      if (!w || !w.phaseEnd || Date.now() < w.phaseEnd) return prev;
      const next = structuredClone(prev);
      const nw = next.workout;
      const now = Date.now();
      nw.autoAt = now;
      if (nw.phase === 'rest') enterStep(nw, now);
      else if (advance(nw, now)) nw.ended = true;
      store.save(next);
      return next;
    }),
    workoutPrimary: () => {
      const w = db.workout;
      if (!w) return;
      unlockAudio(); // réactive le son après une reprise de séance
      const now = Date.now();
      const nw = structuredClone(w);
      if (nw.phase === 'rest') {
        enterStep(nw, now);
      } else if (advance(nw, now)) {
        finishWorkout(nw);
        return;
      }
      update(d => { d.workout = nw; });
    },
    rate: (name, rating) => update(d => {
      if (!d.workout) return;
      d.workout.ratings = d.workout.ratings || {};
      d.workout.ratings[name] = rating;
    }),
    rateAfter: (sid, name, rating) => update(d => {
      const p = d.progress[name];
      const h = p && p.hist && p.hist.find(x => x.sid === sid);
      if (!h) return;
      h.rating = rating;
      if (p.hist[p.hist.length - 1] === h) recompute(p, name);
    }),
    setLoad: (name, kg) => {
      const v = roundKg(kg);
      update(d => {
        d.progress[name] = { ...(d.progress[name] || {}), kg: v };
        if (d.workout) d.workout.plan.ex.forEach(e => { if (e.name === name) e.kg = v; });
      });
    },
    setTarget: (name, patch) => update(d => {
      d.progress[name] = { ...(d.progress[name] || {}), ...patch };
      if (d.workout) d.workout.plan.ex.forEach(e => { if (e.name === name) Object.assign(e, patch); });
    }),
    setStep: (name, step) => update(d => { d.progress[name] = { ...(d.progress[name] || {}), step }; }),
    swap: (slot, name, mode) => {
      update(d => {
        if (mode === 'always') {
          if (name === slot) delete d.swaps[slot];
          else d.swaps[slot] = name;
        }
        swapInWorkout(d, slot, name);
      });
      notify(name === slot ? `Retour à ${slot}` : mode === 'always' ? `${name} remplace ${slot} dans ton programme` : `${name} pour cette séance`);
    },
    finishWorkout: () => {
      const w = db.workout;
      if (!w) return;
      const left = sequence(w.plan).length - w.step - 1;
      if (left > 0 && !confirm('Terminer la séance maintenant ? Elle sera enregistrée avec les séries déjà faites.')) return;
      finishWorkout();
    },
    quitWorkout: () => {
      if (!confirm('Quitter la séance sans l’enregistrer ?')) return;
      update(d => { d.workout = null; });
      keepAwake(false);
      go('train');
    },
  };

  // Fin automatique quand le dernier minuteur (cardio final) se termine.
  useEffect(() => { if (db.workout && db.workout.ended) finishWorkout(); }, [db.workout && db.workout.ended]);

  // Au retour dans l'app : écran allumé pendant la séance, et passage au nouveau jour après minuit.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (db.workout) keepAwake(true);
      const tk = todayKey();
      if (tk !== seenToday.current) {
        const old = seenToday.current;
        seenToday.current = tk;
        setUi(u => (u.date === old ? { ...u, date: tk } : u));
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [db.workout]);

  if (!db.profile) {
    return html`<div class="app"><${Onboarding} onDone=${p => update(d => { d.profile = p; })} /></div>`;
  }

  const s = ui.screen;
  const showTabs = s === 'today' || s === 'train';
  return html`<div class="app">
    ${s === 'today' && html`<${Today} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'train' && html`<${Train} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'settings' && html`<${Settings} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'add' && html`<${Capture} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'review' && html`<${Review} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'workout' && html`<${Workout} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'done' && html`<${Done} db=${db} ui=${ui} actions=${actions} />`}

    ${showTabs && html`<nav class="tabbar" aria-label="Navigation">
      <button class=${s === 'today' ? 'on' : ''} aria-current=${s === 'today' ? 'page' : undefined} onClick=${() => go('today', { date: todayKey() })}>Aujourd’hui</button>
      <button class="fab" aria-label="Ajouter un repas" onClick=${() => actions.openAdd()}><${Icon} name="plus" size=${26} stroke=${2.6} /></button>
      <button class=${s === 'train' ? 'on' : ''} aria-current=${s === 'train' ? 'page' : undefined} onClick=${() => go('train')}>Entraînement</button>
    </nav>`}

    ${ui.sheet === 'activity' && html`<${ActivitySheet} db=${db} onClose=${() => setUi(u => ({ ...u, sheet: null }))}
      onAdd=${a => {
        const k = ui.date || todayKey();
        update(d => { d.days[k] = d.days[k] || store.emptyDay(); d.days[k].activities.push({ id: uid(), time: hhmm(), ...a }); });
        setUi(u => ({ ...u, sheet: null }));
        notify('Activité ajoutée');
      }} />`}

    ${toast && html`<div class="toast" role="status">${toast}</div>`}
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
