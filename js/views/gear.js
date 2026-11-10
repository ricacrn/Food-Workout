import { html } from '../../vendor/preact-htm.js';
import { EQUIPMENT, PLACES, defaultGear } from '../lib/program.js';
import { Icon, Seg, Sheet } from '../ui.js';

/** Le matériel disponible, lieu par lieu. Le programme n'utilise que ce qui est coché. */
export function GearPicker({ db, actions }) {
  const g = db.gear || defaultGear();
  const all = EQUIPMENT.map(e => e.id);
  const has = g[g.active] || all;
  const setHas = list => actions.update(d => {
    d.gear = { ...defaultGear(), ...(d.gear || {}) };
    d.gear[d.gear.active] = list.length === all.length ? null : list; // tout coché = pas de filtre
  });
  const toggle = id => setHas(has.includes(id) ? has.filter(x => x !== id) : [...has, id]);
  const group = (title, items) => html`<div class="stack-s">
    <div class="field-label">${title}</div>
    <div class="chips wrap">
      ${items.map(e => html`<button key=${e.id} type="button" role="checkbox" aria-checked=${has.includes(e.id)}
        class=${`chip gear ${has.includes(e.id) ? 'on' : ''}`} onClick=${() => toggle(e.id)}>
        ${has.includes(e.id) && html`<${Icon} name="check" size=${14} stroke=${3} />`}${e.label}</button>`)}
    </div>
  </div>`;

  return html`<div class="stack">
    <${Seg} options=${PLACES} value=${g.active} onChange=${v => actions.update(d => { d.gear = { ...defaultGear(), ...(d.gear || {}), active: v }; })} />
    ${group('Matériel libre', EQUIPMENT.filter(e => !e.machine))}
    ${group('Machines', EQUIPMENT.filter(e => e.machine))}
    <div class="btn-row">
      <button class="btn btn-ghost" onClick=${() => setHas(all)}>Tout cocher</button>
      <button class="btn btn-ghost" onClick=${() => setHas([])}>Tout décocher</button>
    </div>
    <div class="muted tiny">Les exercices au poids du corps restent toujours disponibles. Si un exercice demande du matériel que tu n’as pas, le programme prend automatiquement la première alternative faisable.</div>
  </div>`;
}

export function GearSheet({ db, actions, onClose }) {
  return html`<${Sheet} onClose=${onClose} title="Mon matériel">
    <div>
      <div class="sheet-title">Où t’entraînes-tu ?</div>
      <div class="muted small">Coche ce qui existe dans chaque lieu, une fois pour toutes.</div>
    </div>
    <${GearPicker} db=${db} actions=${actions} />
    <button class="btn btn-dark wide" onClick=${onClose}>C’est bon</button>
  </${Sheet}>`;
}
