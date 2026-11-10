import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as store from './lib/store.js';
import { mealForNow } from './lib/nutrition.js';
import { sequence, metKcal, exerciseEntry, recompute, roundKg, isStale, restFor } from './lib/program.js';
import { targetFor } from './lib/nutrition.js';
import { todayKey, hhmm } from './lib/dates.js';
import { unlockAudio, keepAwake } from './lib/sound.js';
import { Icon, ConfirmSheet } from './ui.js';
import { Today } from './views/today.js';
import { Capture, Review } from './views/add.js';
import { Train, Workout, Done } from './views/train.js';
import { Ideas, Shop, Plan } from './views/ideas.js';
import { Onboarding, Settings, ActivitySheet } from './views/settings.js';

const { uid } = store;

// Écrans où l'app peut se recharger sans rien te faire perdre (mise à jour automatique).
const SAFE = ['today', 'train', 'ideas', 'shop', 'plan', 'settings'];
let pendingReload = false;
let currentScreen = 'today';
function tryReload() {
  if (pendingReload && SAFE.includes(currentScreen)) { pendingReload = false; location.reload(); }
}

function enterStep(w, now) {
  const st = sequence(w.plan)[w.step];
  w.phase = 'work';
  w.phaseStart = now;
  w.phaseEnd = st && st.kind === 'timed' ? now + st.min * 60000 : null;
}

// Passe à l'étape suivante. Renvoie true quand la séance est finie.
// reps = répétitions réellement faites sur la série qui se termine (sinon : celles prévues).
function advance(w, now, reps) {
  const seq = sequence(w.plan);
  const cur = seq[w.step];
  if (cur.kind === 'set') {
    const e = w.plan.ex[cur.ex];
    w.done = w.done || {};
    w.done[cur.name] = (w.done[cur.name] || 0) + 1;
    if (e && e.kind !== 'sec') {
      w.sets = w.sets || {};
      (w.sets[cur.name] = w.sets[cur.name] || []).push(reps == null ? e.reps : reps);
    }
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
    w.phaseEnd = now + restFor(w.plan, w.plan.ex[cur.ex]) * 1000;
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

// Supprime une activité ; si c'est une séance, annule aussi sa progression et remet le programme en place.
function removeActivityIn(d, date, id) {
  if (!d.days[date]) return;
  const a = d.days[date].activities.find(x => x.id === id);
  d.days[date].activities = d.days[date].activities.filter(x => x.id !== id);
  if (!a || a.type !== 'session') return;
  const i = a.sid ? d.sessions.findIndex(s => s.id === a.sid) : d.sessions.findIndex(s => s.date === date && s.name === a.label);
  if (i >= 0) {
    // c'était la dernière séance : le programme la repropose au lieu de la sauter
    if (i === d.sessions.length - 1) d.sessIdx = Math.max(0, d.sessIdx - 1);
    d.sessions.splice(i, 1);
  }
  if (a.sid) Object.entries(d.progress).forEach(([name, p]) => {
    if (!p.hist || !p.hist.some(h => h.sid === a.sid)) return;
    p.hist = p.hist.filter(h => h.sid !== a.sid);
    recompute(p, name);
  });
}

function App() {
  const [db, setDb] = useState(store.load);
  const [ui, setUi] = useState(() => ({ screen: db.workout ? 'workout' : 'today', date: todayKey(), draft: null, sheet: null, done: null }));
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const toastT = useRef(null);
  const seenToday = useRef(todayKey());

  useEffect(() => { window.scrollTo(0, 0); }, [ui.screen, !!db.profile]);
  useEffect(() => { currentScreen = db.profile ? ui.screen : 'today'; tryReload(); }, [ui.screen, !!db.profile]);

  const update = fn =>
    setDb(prev => {
      const draft = structuredClone(prev);
      const res = fn(draft);
      const next = res || draft;
      if (!store.save(next)) notify('Mémoire du téléphone pleine : exporte puis efface d’anciennes données.');
      return next;
    });

  // undo : état à restaurer si tu touches « Annuler » dans le message.
  function notify(msg, undo) {
    setToast({ msg, undo: undo || null });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), undo ? 6000 : 2800);
  }
  function undoLast() {
    if (!toast || !toast.undo) return;
    store.save(toast.undo);
    setDb(toast.undo);
    clearTimeout(toastT.current);
    setToast(null);
  }

  // Question posée dans une fenêtre de l'app. Renvoie true, false, ou l'id du bouton supplémentaire.
  const ask = opts => new Promise(resolve => setDialog({ ...opts, resolve }));
  const answer = v => { const d = dialog; setDialog(null); if (d) d.resolve(v); };

  const go = (screen, extra = {}) => setUi(u => ({ ...u, screen, sheet: null, ...extra }));

  function finishWorkout(wArg) {
    const w = wArg || db.workout;
    if (!w) return;
    // Séance oubliée : on arrête le compteur à ta dernière action, pas à maintenant.
    const now = isStale(w, Date.now()) ? (w.lastAt || w.startedAt) : Date.now();
    const seq = sequence(w.plan);
    const cur = seq[w.step];
    let finSec = w.finSec;
    if (cur && cur.finisher && w.phase === 'work') finSec += Math.max(0, (Math.min(now, w.phaseEnd || now) - w.phaseStart) / 1000);
    const min = Math.max(1, Math.round((now - w.startedAt - (w.pausedMs || 0)) / 60000));
    const finMin = Math.min(min, finSec / 60);
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
        const done = (w.sets && w.sets[e.name]) || null;
        const entry = { date: k, sid, kg: e.kg, reps: e.reps, sec: e.sec, sets, rating: (w.ratings && w.ratings[e.name]) || 'bien' };
        if (done && done.some(r => r < e.reps)) { entry.done = done; entry.miss = true; }
        p.hist.push(entry);
        if (p.hist.length > 60) p.hist = p.hist.slice(-60);
        recompute(p, e.name);
      });
    });
    keepAwake(false);
    go('done', { done: { sid, name, kcal, min, preSum: w.preSum } });
  }

  const actions = {
    update, notify, go, ask,
    setDate: date => setUi(u => ({ ...u, date })),
    replaceDb: next => { store.save(next); setDb(next); go('today', { date: todayKey() }); },
    wipe: () => { store.wipe(); setDb(store.defaultDb()); go('today', { date: todayKey() }); },

    // Ajout de repas (depuis Entraînement, c'est toujours pour aujourd'hui)
    openAdd: (meal, mode = 'text') => go('add', {
      draft: { meal: meal || mealForNow(), date: ui.screen === 'today' ? ui.date || todayKey() : todayKey(), mode },
    }),
    reviewItems: (meal, date, items, extra = {}) => go('review', {
      draft: { meal, date, mode: 'text', source: 'text', items: items.map(i => ({ ...i })), photo: null, product: null, text: '', ...extra },
    }),
    closeAdd: () => go('today'),
    toReview: patch => setUi(u => ({ ...u, screen: 'review', draft: { ...u.draft, ...patch } })),
    backToCapture: mode => setUi(u => ({ ...u, screen: 'add', draft: { ...u.draft, mode } })),
    addEntries: (date, meal, items, source, favName) => {
      const time = hhmm();
      const snap = db;
      update(d => {
        d.days[date] = d.days[date] || store.emptyDay();
        items.forEach(i => d.days[date].entries.push({
          id: uid(), meal, time, src: i.src || source,
          name: i.name, g: i.g, unit: i.unit, k100: i.k100, p100: i.p100 || 0, c100: i.c100 || 0, f100: i.f100 || 0,
        }));
        const fresh = items.map(i => ({ name: i.name, g: i.g, unit: i.unit, k100: i.k100, p100: i.p100 || 0, c100: i.c100 || 0, f100: i.f100 || 0, src: i.src || source }));
        d.recents = [...fresh, ...d.recents.filter(r => !fresh.some(f => f.name === r.name))].slice(0, 24);
        if (favName) d.favs = [{ id: uid(), name: favName, items: fresh }, ...d.favs.filter(f => f.name !== favName)].slice(0, 12);
      });
      go('today', { date });
      notify(favName ? 'Repas ajouté et gardé dans tes repas habituels' : 'Repas ajouté', snap);
    },
    removeFav: id => update(d => { d.favs = d.favs.filter(f => f.id !== id); }),
    removeEntry: (date, id) => {
      const snap = db;
      update(d => { if (d.days[date]) d.days[date].entries = d.days[date].entries.filter(e => e.id !== id); });
      notify('Aliment supprimé', snap);
    },
    updateEntry: (date, id, patch) => update(d => {
      const e = d.days[date] && d.days[date].entries.find(x => x.id === id);
      if (e) Object.assign(e, patch);
    }),

    // Activités
    openActivity: () => setUi(u => ({ ...u, sheet: 'activity' })),
    removeActivity: (date, id) => {
      const snap = db;
      const act = db.days[date] && db.days[date].activities.find(x => x.id === id);
      if (!act) return;
      update(d => removeActivityIn(d, date, id));
      notify(act.type === 'session' ? 'Séance supprimée' : 'Activité supprimée', snap);
    },

    // Séance
    startWorkout: (plan, B) => {
      unlockAudio();
      keepAwake(true);
      const now = Date.now();
      update(d => {
        d.workout = { v: 2, plan, date: todayKey(), startedAt: now, lastAt: now, pausedMs: 0, step: 0, phase: 'work', phaseStart: now, phaseEnd: null, finSec: 0, preSum: B.sum, done: {}, sets: {}, ratings: {} };
        enterStep(d.workout, now);
      });
      go('workout');
    },
    workoutTick: () => setDb(prev => {
      const w = prev.workout;
      if (!w || !w.phaseEnd || Date.now() < w.phaseEnd || isStale(w, Date.now())) return prev;
      const next = structuredClone(prev);
      const nw = next.workout;
      const now = Date.now();
      nw.autoAt = now;
      if (nw.phase === 'rest') enterStep(nw, now);
      else if (advance(nw, now)) nw.ended = true;
      store.save(next);
      return next;
    }),
    workoutPrimary: reps => {
      const w = db.workout;
      if (!w) return;
      unlockAudio(); // réactive le son après une reprise de séance
      const now = Date.now();
      const nw = structuredClone(w);
      nw.lastAt = now;
      if (nw.phase === 'rest') {
        enterStep(nw, now);
      } else if (advance(nw, now, reps)) {
        finishWorkout(nw);
        return;
      }
      update(d => { d.workout = nw; });
    },
    // Reprise d'une séance laissée en plan : le temps d'absence ne compte pas.
    resumeWorkout: () => {
      unlockAudio();
      keepAwake(true);
      update(d => {
        const w = d.workout;
        if (!w) return;
        const now = Date.now();
        const last = w.lastAt || w.startedAt;
        w.pausedMs = (w.pausedMs || 0) + Math.max(0, now - last);
        if (w.phaseEnd) w.phaseEnd = now + Math.max(0, w.phaseEnd - Math.max(w.phaseStart, last));
        w.phaseStart = now - Math.max(0, last - w.phaseStart);
        w.lastAt = now;
      });
    },
    rate: (name, rating) => update(d => {
      if (!d.workout) return;
      d.workout.lastAt = Date.now();
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
        if (d.workout) { d.workout.lastAt = Date.now(); d.workout.plan.ex.forEach(e => { if (e.name === name) e.kg = v; }); }
      });
    },
    setTarget: (name, patch) => update(d => {
      d.progress[name] = { ...(d.progress[name] || {}), ...patch };
      if (d.workout) d.workout.plan.ex.forEach(e => { if (e.name === name) Object.assign(e, patch); });
    }),
    // Pesée : garde l'historique et met à jour le poids du profil (donc la cible de calories).
    addWeight: kg => {
      const before = targetFor(db.profile);
      const k = todayKey();
      update(d => {
        d.weights = [...d.weights.filter(w => w.date !== k), { date: k, kg }].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-400);
        d.profile.weight = kg;
      });
      const after = targetFor({ ...db.profile, weight: kg });
      notify(after !== before ? `Poids noté · ta cible passe à ${String(after).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kcal par jour` : 'Poids noté');
    },
    setStep: (name, step) => update(d => { d.progress[name] = { ...(d.progress[name] || {}), step }; }),
    swap: (slot, name, mode) => {
      update(d => {
        if (mode === 'always') {
          if (name === slot) delete d.swaps[slot];
          else d.swaps[slot] = name;
        }
        if (d.workout) d.workout.lastAt = Date.now();
        swapInWorkout(d, slot, name);
      });
      notify(name === slot ? `Retour à ${slot}` : mode === 'always' ? `${name} remplace ${slot} · retenu pour les prochaines séances` : `${name} pour cette séance seulement`);
    },
    finishWorkout: async (sure) => {
      const w = db.workout;
      if (!w) return;
      const left = sequence(w.plan).length - w.step - 1;
      if (!sure && left > 0 && !(await ask({ title: 'Terminer la séance maintenant ?', text: 'Elle sera enregistrée avec les séries déjà faites.', ok: 'Terminer et enregistrer', cancel: 'Continuer la séance' }))) return;
      finishWorkout();
    },
    quitWorkout: async (sure) => {
      if (!sure && !(await ask({ title: 'Quitter sans enregistrer ?', text: 'Les séries faites pendant cette séance seront perdues.', ok: 'Quitter sans enregistrer', cancel: 'Continuer la séance', danger: true }))) return;
      update(d => { d.workout = null; });
      keepAwake(false);
      go('train');
    },
  };

  // Fin automatique quand le dernier minuteur (cardio final) se termine.
  useEffect(() => { if (db.workout && db.workout.ended) finishWorkout(); }, [db.workout && db.workout.ended]);

  // Demande au téléphone de ne pas effacer les données de l'app quand il manque de place.
  useEffect(() => { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* non supporté */ } }, []);

  // Au retour dans l'app : écran allumé pendant la séance, et passage au nouveau jour après minuit.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (db.workout && !isStale(db.workout, Date.now())) keepAwake(true);
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
  const showTabs = s === 'today' || s === 'train' || s === 'ideas';
  return html`<div class="app">
    ${s === 'today' && html`<${Today} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'train' && html`<${Train} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'ideas' && html`<${Ideas} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'shop' && html`<${Shop} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'plan' && html`<${Plan} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'settings' && html`<${Settings} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'add' && html`<${Capture} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'review' && html`<${Review} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'workout' && html`<${Workout} db=${db} ui=${ui} actions=${actions} />`}
    ${s === 'done' && html`<${Done} db=${db} ui=${ui} actions=${actions} />`}

    ${showTabs && html`<nav class="tabbar" aria-label="Navigation">
      <button class=${s === 'today' ? 'on' : ''} aria-current=${s === 'today' ? 'page' : undefined} onClick=${() => go('today', { date: todayKey() })}>Aujourd’hui</button>
      <button class=${s === 'ideas' ? 'on' : ''} aria-current=${s === 'ideas' ? 'page' : undefined} onClick=${() => go('ideas')}>Idées</button>
      <button class=${s === 'train' ? 'on' : ''} aria-current=${s === 'train' ? 'page' : undefined} onClick=${() => go('train')}>Entraînement</button>
      <button class="fab" aria-label="Ajouter un repas" onClick=${() => actions.openAdd()}><${Icon} name="plus" size=${24} stroke=${2.6} /></button>
    </nav>`}

    ${ui.sheet === 'activity' && html`<${ActivitySheet} db=${db} onClose=${() => setUi(u => ({ ...u, sheet: null }))}
      onAdd=${a => {
        const k = ui.date || todayKey();
        update(d => { d.days[k] = d.days[k] || store.emptyDay(); d.days[k].activities.push({ id: uid(), time: hhmm(), ...a }); });
        setUi(u => ({ ...u, sheet: null }));
        notify('Activité ajoutée');
      }} />`}

    ${dialog && html`<${ConfirmSheet} ...${dialog} onAnswer=${answer} />`}

    ${toast && html`<div class=${`toast ${showTabs && !dialog ? 'above-tabs' : ''}`} role="status" onClick=${() => { if (!toast.undo) setToast(null); }}>
      <span>${toast.msg}</span>
      ${toast.undo && html`<button onClick=${undoLast}>Annuler</button>`}
    </div>`}
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));

// Service worker : hors ligne + mise à jour automatique.
// Quand une nouvelle version prend la main, l'app se recharge dès que tu es sur un écran sans saisie en cours.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // première installation : rien à recharger
    pendingReload = true;
    tryReload();
  });
  navigator.serviceWorker.register('./sw.js').then(reg => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
}
