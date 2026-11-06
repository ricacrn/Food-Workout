import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as store from './lib/store.js';
import { mealForNow } from './lib/nutrition.js';
import { sequence, metKcal } from './lib/program.js';
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
  if (cur.kind === 'timed' && cur.finisher) w.finSec += Math.max(0, (Math.min(now, w.phaseEnd || now) - w.phaseStart) / 1000);
  if (w.step + 1 >= seq.length) return true;
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

function App() {
  const [db, setDb] = useState(store.load);
  const [ui, setUi] = useState(() => ({ screen: 'today', date: todayKey(), draft: null, sheet: null, done: null }));
  const [toast, setToast] = useState('');
  const toastT = useRef(null);

  useEffect(() => {
    if (db.workout) setUi(u => ({ ...u, screen: 'workout' }));
  }, []);

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

  function finishWorkout() {
    const w = db.workout;
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
    update(d => {
      const k = w.date;
      d.days[k] = d.days[k] || store.emptyDay();
      d.days[k].activities.push({ id: uid(), type: 'session', label: name, min, kcal, time: hhmm(new Date(w.startedAt)) });
      d.sessions.push({ id: uid(), date: k, name, min, kcal, pct: w.plan.pct });
      d.sessions = d.sessions.slice(-200);
      d.sessIdx += 1;
      d.workout = null;
    });
    keepAwake(false);
    go('done', { done: { name, kcal, min, preSum: w.preSum } });
  }

  const actions = {
    update, notify, go,
    setDate: date => setUi(u => ({ ...u, date })),
    replaceDb: next => { store.save(next); setDb(next); go('today'); },
    wipe: () => { store.wipe(); setDb(store.defaultDb()); go('today'); },

    // Ajout de repas
    openAdd: (meal, mode = 'photo') => go('add', { draft: { meal: meal || mealForNow(), date: ui.date || todayKey(), mode } }),
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
      go('today');
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
        const i = d.sessions.findIndex(s => s.date === date && s.name === a.label);
        if (i >= 0) d.sessions.splice(i, 1);
      }
    }),

    // Séance
    startWorkout: (plan, B) => {
      unlockAudio();
      keepAwake(true);
      const now = Date.now();
      update(d => {
        d.workout = { plan, date: todayKey(), startedAt: now, step: 0, phase: 'work', phaseStart: now, phaseEnd: null, finSec: 0, preSum: B.sum };
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
      if (nw.phase === 'rest') enterStep(nw, now);
      else if (advance(nw, now)) { nw.phaseEnd = null; nw.ended = true; }
      store.save(next);
      return next;
    }),
    workoutPrimary: () => {
      const w = db.workout;
      if (!w) return;
      if (w.phase === 'rest') { update(d => enterStep(d.workout, Date.now())); return; }
      const now = Date.now();
      if (advance(structuredClone(w), now)) { finishWorkout(); return; }
      update(d => { advance(d.workout, now); });
    },
    setLoad: (name, kg) => {
      const v = Math.max(0, Math.round(kg * 2) / 2);
      update(d => {
        d.loads[name] = v;
        const e = d.workout && d.workout.plan.ex.find(x => x.name === name);
        if (e) e.kg = v;
      });
    },
    finishWorkout,
    quitWorkout: () => {
      if (!confirm('Quitter la séance sans l’enregistrer ?')) return;
      update(d => { d.workout = null; });
      keepAwake(false);
      go('train');
    },
  };

  // Fin automatique quand le dernier minuteur (cardio final) se termine.
  useEffect(() => { if (db.workout && db.workout.ended) finishWorkout(); }, [db.workout && db.workout.ended]);

  // Revenir sur aujourd'hui après minuit si l'app reste ouverte.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (db.workout) keepAwake(true);
      setUi(u => (u.screen === 'today' && u.date !== todayKey() && u.stickToday !== false ? { ...u, date: todayKey() } : u));
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
