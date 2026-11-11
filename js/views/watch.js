import { html, useState } from '../../vendor/preact-htm.js';
import { parseWatch } from '../lib/watch.js';
import { todayKey, relativeDay } from '../lib/dates.js';
import { fmt, Icon, Sheet, cap } from '../ui.js';

const STEPS = [
  ['Ouvre l’app Raccourcis', 'Touche + pour créer un raccourci et nomme-le « Montre vers Plate & Pace ».'],
  ['Ajoute « Rechercher des échantillons de santé »', 'Type : Entraînements. Ajoute le filtre « Date de début est dans les 7 derniers jours ».'],
  ['Ajoute « Répéter avec chaque »', 'Il se branche tout seul sur les entraînements trouvés.'],
  ['Dans la boucle, ajoute « Texte »', 'Insère quatre variables de l’élément répété, séparées par une barre verticale : Type d’activité | Date de début | Durée | Énergie active'],
  ['Toujours dans la boucle, « Ajouter à la variable »', 'Nomme la variable « Liste ».'],
  ['Après la boucle, « Copier dans le presse-papiers »', 'Choisis la variable « Liste ». À la première utilisation, autorise l’accès à Santé.'],
];

/** Importe les entraînements de l'Apple Watch, copiés par un Raccourci iOS. */
export function WatchSheet({ db, actions, onClose }) {
  const tk = todayKey();
  const [text, setText] = useState('');
  const [found, setFound] = useState(null);
  const [off, setOff] = useState({});
  const [help, setHelp] = useState(false);
  const [msg, setMsg] = useState('');
  const known = new Set(Object.values(db.days).flatMap(d => d.activities.map(a => a.wid).filter(Boolean)));

  const read = raw => {
    const r = parseWatch(raw, tk);
    if (!r.workouts.length && !r.weight) { setMsg('Je ne reconnais aucun entraînement dans ce texte. Lance d’abord le raccourci, puis réessaie.'); setFound(null); return; }
    setMsg('');
    setOff(Object.fromEntries(r.workouts.filter(w => known.has(w.wid)).map(w => [w.wid, true])));
    setFound(r);
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      read(t);
    } catch (e) {
      setMsg('Impossible de lire le presse-papiers. Colle le texte dans la zone ci-dessous (appui long, puis Coller).');
    }
  };
  const chosen = found ? found.workouts.filter(w => !off[w.wid]) : [];

  return html`<${Sheet} onClose=${onClose} title="Apple Watch">
    <div>
      <div class="sheet-title">Importer depuis l’Apple Watch</div>
      <div class="muted small">Lance ton raccourci « Montre vers Plate & Pace », puis reviens ici : les calories mesurées par la montre remplacent les estimations.</div>
    </div>

    ${!found && html`
      <button class="btn btn-dark wide" onClick=${paste}><${Icon} name="clock" size=${18} /> Coller les entraînements</button>
      <textarea class="area" rows="3" placeholder="… ou colle ici le texte copié par le raccourci" aria-label="Texte copié par le raccourci"
        value=${text} onInput=${e => setText(e.target.value)}></textarea>
      ${text.trim() && html`<button class="btn btn-ghost wide" onClick=${() => read(text)}>Lire ce texte</button>`}
      ${msg && html`<div class="err-box" role="alert">${msg}</div>`}
      <button class="text-btn" aria-expanded=${help} onClick=${() => setHelp(!help)}>${help ? 'Masquer' : 'Créer le raccourci (une seule fois, 3 minutes)'}</button>
      ${help && html`<ol class="steps">
        ${STEPS.map(([t, d], n) => html`<li key=${n}><span class="step-n">${n + 1}</span><span><b>${t}</b><br /><span class="muted small">${d}</span></span></li>`)}
      </ol>
      <div class="muted tiny">Le nom exact des actions peut varier selon ta version d’iOS. Si ta montre mesure en kilojoules, l’app convertit. Rien ne quitte ton téléphone.</div>`}`}

    ${found && html`
      ${found.workouts.length > 0 && html`<div class="card shop-group">
        ${found.workouts.map(w => {
          const on = !off[w.wid];
          return html`<div key=${w.wid} class=${`shop-row ${on ? '' : 'skip'}`}>
            <button class="shop-check" role="checkbox" aria-checked=${on} aria-label=${w.label} onClick=${() => setOff({ ...off, [w.wid]: on })}>
              <span class=${`box ${on ? 'on' : ''}`}>${on && html`<${Icon} name="check" size=${14} stroke=${3} />`}</span>
              <span class="shop-name">${w.label}<br /><span class="muted small">${cap(relativeDay(w.date, tk))}${w.time ? ` · ${w.time}` : ''} · ${w.min} min${known.has(w.wid) ? ' · déjà importé' : ''}${w.guessedDate ? ' · date non lue' : ''}</span></span>
              <span class="shop-qty">${fmt(w.kcal)} kcal</span>
            </button>
          </div>`;
        })}
      </div>`}
      ${found.weight && html`<div class="muted small">Poids lu : ${String(found.weight).replace('.', ',')} kg (sera enregistré comme pesée du jour).</div>`}
      <div class="btn-row">
        <button class="btn btn-ghost" onClick=${() => setFound(null)}>Retour</button>
        <button class="btn btn-dark" disabled=${!chosen.length && !found.weight} onClick=${() => { actions.importWatch(chosen, found.weight); onClose(); }}>Importer${chosen.length ? ` (${chosen.length})` : ''}</button>
      </div>`}
  </${Sheet}>`;
}
