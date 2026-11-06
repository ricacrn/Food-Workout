import { html, useState, useEffect } from '../vendor/preact-htm.js';

export const fmt = n => String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const sg = n => (Math.round(n) > 0 ? '+' : Math.round(n) < 0 ? '−' : '') + fmt(n);
export const pctTxt = p => (p > 0 ? '+' : '−') + Math.abs(p) + ' %';
export const adjShort = p => (p === 0 ? 'normale' : pctTxt(p));
export const fmtClock = s => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c.9-4 4-6.5 8-6.5s7.1 2.5 8 6.5',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  check: 'M5 12l5 5 9-10',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
};

export function Icon({ name, size = 20, stroke = 2, label }) {
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden=${label ? undefined : 'true'}
    role=${label ? 'img' : undefined} aria-label=${label}><path d=${PATHS[name]} /></svg>`;
}

export function BarcodeGlyph({ w = 30, h = 22, color = '#1F1B17' }) {
  return html`<div style=${`width:${w}px;height:${h}px;background:repeating-linear-gradient(90deg,${color} 0 2px,transparent 2px 4px,${color} 4px 5px,transparent 5px 8px)`}></div>`;
}

export function Ring({ value, max, color, number, label, size = 200 }) {
  const r = size * 0.43;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return html`<div class="ring" style=${`width:${size}px;height:${size}px`}>
    <svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`} style="transform:rotate(-90deg)">
      <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke="var(--track)" stroke-width="16" />
      <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke=${color} stroke-width="16" stroke-linecap="round"
        stroke-dasharray=${C} stroke-dashoffset=${C * (1 - pct)} style="transition:stroke-dashoffset .8s ease" />
    </svg>
    <div class="ring-center">
      <div class="ring-number">${number}</div>
      <div class="ring-label">${label}</div>
    </div>
  </div>`;
}

export function Seg({ options, value, onChange, dark, small }) {
  return html`<div class=${`seg ${dark ? 'seg-dark' : ''} ${small ? 'seg-small' : ''}`} role="radiogroup"
    style=${`grid-template-columns:repeat(${options.length},minmax(0,1fr))`}>
    ${options.map(o => html`<button type="button" role="radio" aria-checked=${value === o.id}
      class=${value === o.id ? 'on' : ''} onClick=${() => onChange(o.id)}>${o.label}</button>`)}
  </div>`;
}

export function Stepper({ value, unit, step = 10, onChange, label }) {
  const set = v => onChange(Math.max(0, Math.min(5000, Math.round(v))));
  return html`<div class="stepper">
    <button type="button" aria-label="Moins" onClick=${() => set(value - step)}>−</button>
    <label class="stepper-val">
      <input type="text" inputmode="numeric" pattern="[0-9]*" aria-label=${label} value=${String(value)}
        onInput=${e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); set(isNaN(v) ? 0 : v); }} />
      <span>${unit}</span>
    </label>
    <button type="button" aria-label="Plus" onClick=${() => set(value + step)}>+</button>
  </div>`;
}

export function Sheet({ onClose, children, title }) {
  return html`<div class="sheet-wrap">
    <button class="sheet-scrim" aria-label="Fermer" onClick=${onClose}></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-label=${title}>
      <div class="sheet-handle"></div>
      ${children}
    </div>
  </div>`;
}

export function Kicker({ children, style }) {
  return html`<div class="kicker" style=${style}>${children}</div>`;
}

const kgTxt = v => String(Math.max(0, Math.round(v * 4) / 4)).replace('.', ',');

/** Réglage de charge : − / + avec un pas au choix, ou saisie directe. */
export function LoadControl({ value, step, steps, onChange, onStep, dark }) {
  const [txt, setTxt] = useState(kgTxt(value));
  useEffect(() => { setTxt(kgTxt(value)); }, [value]);
  const commit = () => {
    const v = parseFloat(String(txt).replace(',', '.'));
    if (!isNaN(v) && v >= 0 && v <= 500) onChange(Math.round(v * 4) / 4);
    else setTxt(kgTxt(value));
  };
  return html`<div class=${`loadc ${dark ? 'dark' : ''}`}>
    <div class="loadc-row">
      <button type="button" aria-label=${`Moins ${kgTxt(step)} kg`} onClick=${() => onChange(Math.max(0, value - step))}>−</button>
      <label class="loadc-val">
        <input type="text" inputmode="decimal" aria-label="Charge en kg" value=${txt}
          onFocus=${e => e.target.select()} onInput=${e => setTxt(e.target.value.replace(/[^\d.,]/g, ''))}
          onBlur=${commit} onKeyDown=${e => { if (e.key === 'Enter') e.target.blur(); }} />
        <span>kg</span>
      </label>
      <button type="button" aria-label=${`Plus ${kgTxt(step)} kg`} onClick=${() => onChange(value + step)}>+</button>
    </div>
    <div class="loadc-steps" role="radiogroup" aria-label="Pas de réglage">
      <span>Pas</span>
      ${steps.map(s => html`<button key=${s} type="button" role="radio" aria-checked=${s === step}
        class=${s === step ? 'on' : ''} onClick=${() => onStep(s)}>${kgTxt(s)}</button>`)}
    </div>
  </div>`;
}

/** Mini-courbe d'évolution. */
export function Sparkline({ values, w = 88, h = 30, color = 'currentColor' }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    3 + (i * (w - 6)) / (values.length - 1),
    h - 3 - ((v - min) / span) * (h - 6),
  ]);
  const last = pts[pts.length - 1];
  return html`<svg width=${w} height=${h} viewBox=${`0 0 ${w} ${h}`} aria-hidden="true" class="spark">
    <polyline points=${pts.map(p => p.join(',')).join(' ')} fill="none" stroke=${color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx=${last[0]} cy=${last[1]} r="3" fill=${color} />
  </svg>`;
}
