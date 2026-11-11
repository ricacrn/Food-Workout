import { html } from '../../vendor/preact-htm.js';
import { EQUIPMENT, EQUIP_GROUPS, PLACES, defaultGear } from '../lib/program.js';
import { Icon, Seg, Sheet } from '../ui.js';

/** Le matériel disponible, lieu par lieu, avec une photo de chaque appareil. Le programme n'utilise que ce qui est coché. */
export function GearPicker({ db, actions }) {
  const g = db.gear || defaultGear();
  const all = EQUIPMENT.map(e => e.id);
  const has = g[g.active] || all;
  const setHas = list => actions.update(d => {
    d.gear = { ...defaultGear(), ...(d.gear || {}) };
    d.gear[d.gear.active] = all.every(id => list.includes(id)) ? null : list; // tout coché = pas de filtre
  });
  const toggle = id => setHas(has.includes(id) ? has.filter(x => x !== id) : [...has, id]);
  const count = all.filter(id => has.includes(id)).length;

  return html`<div class="stack">
    <${Seg} options=${PLACES} value=${g.active} onChange=${v => actions.update(d => { d.gear = { ...defaultGear(), ...(d.gear || {}), active: v }; })} />
    <div class="row-between">
      <span class="muted small">${count} sur ${all.length} cochés</span>
      <span class="gear-all">
        <button class="text-btn small" onClick=${() => setHas(all)}>Tout cocher</button>
        <button class="text-btn small" onClick=${() => setHas([])}>Tout décocher</button>
      </span>
    </div>
    ${EQUIP_GROUPS.map(grp => html`<div key=${grp.id} class="stack-s">
      <div class="field-label">${grp.label}</div>
      <div class="gear-grid">
        ${EQUIPMENT.filter(e => e.group === grp.id).map(e => {
          const on = has.includes(e.id);
          return html`<button key=${e.id} type="button" role="checkbox" aria-checked=${on} class=${`gear-card ${on ? 'on' : ''}`} onClick=${() => toggle(e.id)}>
            <span class="gear-img"><img src=${e.photo} alt="" loading="lazy" onError=${ev => { ev.target.style.display = 'none'; }} /></span>
            <span class="gear-name">${e.label}</span>
            <span class="gear-check">${on && html`<${Icon} name="check" size=${14} stroke=${3} />`}</span>
          </button>`;
        })}
      </div>
    </div>`)}
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
