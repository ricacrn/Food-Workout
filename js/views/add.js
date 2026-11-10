import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { MEALS, kcalOf, macroOf } from '../lib/nutrition.js';
import { parseText, PLATES } from '../lib/foods.js';
import { startScanner, lookupBarcode } from '../lib/scanner.js';
import { analyzePhoto, analyzeText, fileToJpeg } from '../lib/ai.js';
import { balance } from '../lib/program.js';
import { todayKey } from '../lib/dates.js';
import { uid } from '../lib/store.js';
import { fmt, adjShort, Icon, Seg, Stepper, Kicker, BarcodeGlyph } from '../ui.js';

const dec = v => String(v ?? 0).replace('.', ',');
const MODES = [{ id: 'text', label: 'Texte' }, { id: 'photo', label: 'Photo' }, { id: 'barcode', label: 'Code-barres' }];

function camError(e) {
  if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) return 'Accès à la caméra refusé. Autorise-le dans Réglages › Safari › Caméra, ou saisis le code à la main.';
  if (e && e.name === 'NotFoundError') return 'Aucune caméra trouvée. Saisis le code à la main.';
  return (e && e.message) || 'Caméra indisponible.';
}

function productItem(p) {
  const unit = p.liquid ? 'ml' : 'g';
  return {
    name: p.brand ? `${p.name} · ${p.brand}` : p.name,
    g: Math.round(p.serving || (p.liquid ? 250 : 100)), unit,
    k100: p.k100 ?? 0, p100: p.p100, c100: p.c100, f100: p.f100,
    unknown: p.k100 == null, src: 'barcode',
  };
}

export function Capture({ db, ui, actions }) {
  const d = ui.draft;
  const [mode, setMode] = useState(d.mode || 'text');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(d.photo || null);
  const [text, setText] = useState(d.text || '');
  const [code, setCode] = useState('');
  const [scanKey, setScanKey] = useState(0);
  const video = useRef(null);
  const camInput = useRef(null);
  const galInput = useRef(null);
  const hasKey = !!db.settings.apiKey;
  const meal = MEALS.find(m => m.id === d.meal) || MEALS[3];
  const alive = useRef(true);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => () => { alive.current = false; }, []);
  // Chaque passage à la vérification remet à zéro ce qui vient d'une autre source.
  const review = patch => { if (alive.current) actions.toReview({ photo: null, product: null, text: '', favId: null, favName: '', ...patch }); };

  const switchMode = m => { setError(''); setBusy(''); setMode(m); };

  async function handleCode(c) {
    setError('');
    setBusy('Recherche du produit…');
    try {
      const p = await lookupBarcode(c);
      if (!alive.current || modeRef.current !== 'barcode') return;
      if (!p) {
        setBusy('');
        setError(`Produit introuvable (code ${c}). Essaie de l’écrire en mode Texte.`);
        return;
      }
      review({ source: 'barcode', items: [productItem(p)], product: p });
    } catch (e) {
      setBusy('');
      setError(e.message);
    }
  }

  useEffect(() => {
    if (mode !== 'barcode' || busy || error) return undefined;
    let stop = null;
    let cancelled = false;
    startScanner(video.current, c => { if (!cancelled) handleCode(c); })
      .then(s => { if (cancelled) s(); else stop = s; })
      .catch(e => { if (!cancelled) setError(camError(e)); });
    return () => { cancelled = true; if (stop) stop(); };
  }, [mode, scanKey, !!busy, !!error]);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const jpg = await fileToJpeg(file);
      setPhoto(jpg);
      if (!hasKey) {
        setMode('text');
        setError('Reconnaissance automatique désactivée : ajoute une clé API dans Réglages. En attendant, décris ton assiette.');
        return;
      }
      setBusy('Identification des aliments…');
      const items = await analyzePhoto(db.settings, jpg);
      if (!items.length) throw new Error('Aucun aliment reconnu. Reprends la photo de plus près ou décris le repas.');
      review({ source: 'photo', items: items.map(i => ({ ...i, src: 'photo' })), photo: jpg });
    } catch (err) {
      if (!alive.current) return;
      setBusy('');
      setError(err.message);
    }
  }

  async function analyze() {
    if (!text.trim()) return;
    setError('');
    let items = parseText(text);
    const unknown = items.filter(i => i.unknown);
    if (unknown.length && hasKey) {
      setBusy('Analyse…');
      try {
        // on envoie ce que tu as écrit, pas la quantité devinée par l'app
        const ai = await analyzeText(db.settings, unknown.map(i => i.raw || `${i.g} g ${i.name}`).join(', '));
        if (ai.length) items = [...items.filter(i => !i.unknown), ...ai.map(a => ({ ...a, src: 'text' }))];
      } catch (err) {
        // on garde l'estimation locale, mais on te dit pourquoi
        actions.notify(`IA indisponible, estimations à vérifier. ${err.message}`);
      }
      if (!alive.current) return;
    }
    review({ source: photo ? 'photo' : 'text', items: items.map(i => ({ ...i, src: photo ? 'photo' : 'text' })), text, photo });
  }

  return html`<div class="capture">
    <div class="capture-top">
      <button class="pill-dark" onClick=${() => actions.closeAdd()}>Annuler</button>
      <div class="capture-title">${meal.label}</div>
      <div style="width:84px"></div>
    </div>

    ${mode === 'photo' && html`<div class="viewfinder">
      ${photo ? html`<img class="vf-img" src=${photo} alt="Ta photo" />` : html`<div class="vf-hint">
        <${Icon} name="camera" size=${36} stroke=${1.5} />
        <div>Prends ton assiette en photo, vue de dessus si possible.</div>
        ${!hasKey && html`<div class="vf-note">La reconnaissance automatique demande une clé API (Réglages). Sans clé, tu décriras le repas à l’étape suivante.</div>`}
      </div>`}
      ${busy && html`<div class="vf-dim"></div><div class="scanline"></div>`}
    </div>`}

    ${mode === 'barcode' && html`<div class="viewfinder">
      <video ref=${video} class="vf-video" playsinline muted></video>
      <div class="bc-frame"><div class="bc-line"></div></div>
      ${busy && html`<div class="vf-dim"></div>`}
    </div>`}

    ${mode === 'text' && html`<div class="text-panel">
      ${photo && html`<img class="text-photo" src=${photo} alt="Ta photo" />`}
      <label for="meal-text" class="kicker on-dark">Qu’as-tu mangé ?</label>
      <textarea id="meal-text" value=${text} onInput=${e => setText(e.target.value)}
        placeholder="Ex : 150 g de riz, 120 g de saumon, brocolis"></textarea>
      <div class="text-help">Sépare les aliments par des virgules. Les grammes sont facultatifs : tu les ajustes à l’étape suivante.</div>
      ${db.favs.length > 0 && html`<div class="recents">
        <div class="kicker on-dark">Repas habituels</div>
        <div class="chips">
          ${db.favs.map(f => html`<button key=${f.id} class="chip-dark fav"
            onClick=${() => review({ source: 'text', items: f.items.map(i => ({ ...i })), favId: f.id, favName: f.name })}><${Icon} name="star" size=${14} /> ${f.name} · ${fmt(f.items.reduce((s, i) => s + kcalOf(i), 0))} kcal</button>`)}
        </div>
      </div>`}
      <div class="recents">
        <div class="kicker on-dark">Cantine, resto, à emporter</div>
        <div class="chips">
          ${PLATES.map(p => html`<button key=${p.name} class="chip-dark"
            onClick=${() => review({ source: 'text', items: parseText(p.text).map(i => ({ ...i, src: 'text' })), text: p.name })}>${p.name}</button>`)}
        </div>
      </div>
      ${db.recents.length > 0 && html`<div class="recents">
        <div class="kicker on-dark">Récents</div>
        <div class="chips">
          ${db.recents.slice(0, 10).map(r => html`<button key=${r.name} class="chip-dark"
            onClick=${() => review({ source: 'text', items: [{ ...r }] })}>${r.name} · ${r.g} ${r.unit}</button>`)}
        </div>
      </div>`}
    </div>`}

    <div class="capture-bottom">
      <div class=${`capture-msg ${error ? 'err' : ''}`} role="status">${error || busy || (mode === 'barcode' ? 'Vise le code-barres, la lecture est automatique' : mode === 'photo' ? 'Cadre toute l’assiette' : '')}</div>

      <div class="capture-actions">
        ${mode === 'photo' && html`
          <button class="round-ghost" aria-label="Choisir dans la galerie" onClick=${() => galInput.current.click()} disabled=${!!busy}><${Icon} name="image" /></button>
          <button class="shutter" aria-label="Prendre la photo" onClick=${() => camInput.current.click()} disabled=${!!busy}><span></span></button>
          <div style="width:52px"></div>
          <input ref=${camInput} type="file" accept="image/*" capture="environment" hidden onChange=${onFile} />
          <input ref=${galInput} type="file" accept="image/*" hidden onChange=${onFile} />`}
        ${mode === 'barcode' && html`<form class="code-form" onSubmit=${e => { e.preventDefault(); if (/^\d{8,14}$/.test(code)) handleCode(code); else setError('Un code-barres compte 8 à 14 chiffres.'); }}>
          <input type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Ou tape le code" aria-label="Code-barres" value=${code} onInput=${e => setCode(e.target.value.replace(/\D/g, ''))} />
          <button type="submit" class="btn btn-light" disabled=${!!busy}>OK</button>
          ${error && html`<button type="button" class="btn btn-ghost-dark" onClick=${() => { setError(''); setScanKey(scanKey + 1); }}>Réessayer</button>`}
        </form>`}
        ${mode === 'text' && html`<button class="btn btn-light wide" disabled=${!text.trim() || !!busy} onClick=${analyze}>${busy || 'Analyser'}</button>`}
      </div>

      <${Seg} dark options=${MODES} value=${mode} onChange=${switchMode} />
    </div>
  </div>`;
}

export function Review({ db, ui, actions }) {
  const d = ui.draft;
  const [items, setItems] = useState(() => d.items.map(i => ({
    ...i, id: uid(), on: true, step: i.unit === 'ml' ? 50 : i.g >= 150 ? 25 : 10,
  })));
  const [meal, setMeal] = useState(d.meal);
  const [more, setMore] = useState('');
  const [fav, setFav] = useState(false);
  const [favName, setFavName] = useState('');
  const isFav = !!d.favId && db.favs.some(f => f.id === d.favId);
  const tk = todayKey();
  const isToday = d.date === tk;
  const active = items.filter(i => i.on && i.g > 0);
  const total = active.reduce((s, i) => s + kcalOf(i), 0);
  const B = balance(db, tk);
  const B2 = balance(db, tk, isToday ? total : 0);
  const mealInfo = MEALS.find(m => m.id === meal) || MEALS[3];
  const set = (id, patch) => setItems(items.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const addMore = e => {
    e.preventDefault();
    if (!more.trim()) return;
    const extra = parseText(more).map(i => ({ ...i, id: uid(), on: true, step: i.unit === 'ml' ? 50 : i.g >= 150 ? 25 : 10 }));
    setItems([...items, ...extra]);
    setMore('');
  };

  const detail = i => {
    const src = i.src === 'photo' ? (i.conf ? `Photo · ${i.conf} % de confiance` : 'Photo')
      : i.src === 'barcode' ? 'Code-barres · valeurs du paquet'
      : i.unknown ? 'Estimation à corriger' : 'Base nutritionnelle';
    return `${src} · P ${Math.round(macroOf(i, 'p'))} G ${Math.round(macroOf(i, 'c'))} L ${Math.round(macroOf(i, 'f'))}`;
  };

  return html`<div class="review">
    ${d.source === 'photo' && d.photo
      ? html`<div class="review-photo" style=${`background-image:url(${d.photo})`}>
          <button class="pill-light" onClick=${() => actions.backToCapture('photo')}>Reprendre</button>
        </div>`
      : html`<div class="review-top"><button class="pill-light" onClick=${() => actions.backToCapture(d.source === 'barcode' ? 'barcode' : 'text')}>
          ${d.source === 'barcode' ? 'Scanner à nouveau' : 'Modifier'}</button></div>`}

    <div class=${`review-body ${d.source === 'photo' && d.photo ? 'overlap' : ''}`}>
      <div class="row-between end">
        <div>
          <${Kicker}>${d.source === 'barcode' ? 'Produit reconnu' : `${items.length} aliment${items.length > 1 ? 's' : ''}`}</${Kicker}>
          <h2 class="h2-big">${d.source === 'barcode' ? 'Choisis ta portion' : d.source === 'photo' ? 'Vérifie ton assiette' : 'Vérifie ton repas'}</h2>
        </div>
        <div class="total"><div class="total-num">${fmt(total)}</div><div class="muted small">kcal</div></div>
      </div>

      ${d.product && html`<div class="card product">
        <div class="thumb"><${BarcodeGlyph} w=${28} h=${20} /></div>
        <div>
          <div class="strong">${[d.product.brand, d.product.quantity].filter(Boolean).join(' · ') || d.product.name}</div>
          <div class="muted small">Pour 100 ${d.product.liquid ? 'ml' : 'g'} : ${d.product.k100 == null ? '? ' : fmt(d.product.k100)} kcal · P ${dec(d.product.p100)} g · G ${dec(d.product.c100)} g · L ${dec(d.product.f100)} g</div>
        </div>
      </div>`}
      ${d.source === 'text' && d.text && html`<div class="quote">« ${d.text} »</div>`}

      <${Seg} small options=${MEALS.map(m => ({ id: m.id, label: m.short }))} value=${meal} onChange=${setMeal} />

      ${items.map(i => html`<div key=${i.id} class=${`card item ${i.on ? '' : 'off'}`}>
        <div class="row-between base">
          <div class="item-txt">
            <div class="item-name">${i.name}</div>
            <div class="muted tiny">${detail(i)}</div>
          </div>
          <div class="item-kcal">${fmt(i.on ? kcalOf(i) : 0)}</div>
        </div>
        ${i.unknown && html`<label class="k100">
          <span>kcal pour 100 ${i.unit}</span>
          <input type="text" inputmode="numeric" value=${String(i.k100)} onInput=${e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); set(i.id, { k100: isNaN(v) ? 0 : v }); }} />
        </label>`}
        <div class="row-between">
          <${Stepper} value=${i.g} unit=${i.unit} step=${i.step} onChange=${g => set(i.id, { g })} label=${`Quantité de ${i.name}`} />
          <button class="text-btn accent" onClick=${() => set(i.id, { on: !i.on })}>${i.on ? 'Retirer' : 'Remettre'}</button>
        </div>
      </div>`)}

      <form class="add-more" onSubmit=${addMore}>
        <input type="text" placeholder="Ajouter un aliment (ex : 1 c. à soupe d’huile)" aria-label="Ajouter un aliment" value=${more} onInput=${e => setMore(e.target.value)} />
        <button type="submit" class="icon-btn dark" aria-label="Ajouter"><${Icon} name="plus" size=${18} /></button>
      </form>

      ${isFav
        ? html`<button class="text-btn danger" onClick=${() => { actions.removeFav(d.favId); actions.notify('Retiré de tes repas habituels'); }}>Retirer « ${d.favName} » de mes repas habituels</button>`
        : d.source !== 'barcode' && active.length > 0 && html`<div class="fav-box">
            <button class="text-btn" role="switch" aria-checked=${fav} onClick=${() => { setFav(!fav); if (!favName) setFavName(`${mealInfo.label} habituel`); }}>
              <span class=${`box ${fav ? 'on' : ''}`}>${fav && html`<${Icon} name="check" size=${14} stroke=${3} />`}</span> Garder comme repas habituel</button>
            ${fav && html`<input type="text" class="fav-name" maxlength="40" aria-label="Nom du repas habituel" value=${favName} onInput=${e => setFavName(e.target.value)} />`}
          </div>`}
    </div>

    <div class="review-foot">
      ${isToday && html`<div class="row-between small">
        <span class="muted">Prochaine séance</span>
        <span class=${`strong ${B2.steps > B.steps ? 'accent' : B2.steps < B.steps ? 'blue' : ''}`}>
          ${B2.steps === B.steps ? `inchangée (${adjShort(B.pct)})` : `${adjShort(B.pct)} → ${adjShort(B2.pct)}`}</span>
      </div>`}
      <button class="btn btn-dark wide" disabled=${!active.length}
        onClick=${() => actions.addEntries(d.date, meal, active, d.source, fav && !isFav ? (favName.trim() || `${mealInfo.label} habituel`) : '')}>Ajouter ${mealInfo.prep} · ${fmt(total)} kcal</button>
    </div>
  </div>`;
}
