// Lecture de code-barres : API native quand elle existe (Chrome Android),
// sinon le polyfill ZXing (WebAssembly) embarqué dans /vendor, qui marche sur iPhone.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let detectorPromise = null;

function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const ok = FORMATS.filter(f => supported.includes(f));
          if (ok.length) return new window.BarcodeDetector({ formats: ok });
        } catch (e) { /* on bascule sur le polyfill */ }
      }
      const mod = await import('../../vendor/barcode-detector.js');
      const wasmUrl = new URL('../../vendor/zxing_reader.wasm', import.meta.url).href;
      mod.setZXingModuleOverrides({ locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) });
      return new mod.BarcodeDetector({ formats: FORMATS });
    })();
    detectorPromise.catch(() => { detectorPromise = null; });
  }
  return detectorPromise;
}

/** Ouvre la caméra arrière dans <video> et appelle onCode(code) au premier code lu. Renvoie stop(). */
export async function startScanner(video, onCode) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('La caméra n’est pas disponible dans ce navigateur.');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  let stopped = false;
  const stop = () => {
    stopped = true;
    stream.getTracks().forEach(t => t.stop());
    if (video) video.srcObject = null;
  };
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.srcObject = stream;
  await video.play().catch(() => {});
  const detector = await getDetector();
  const loop = async () => {
    if (stopped) return;
    if (video.readyState >= 2) {
      try {
        const codes = await detector.detect(video);
        const hit = codes.find(c => /^\d{8,14}$/.test(c.rawValue));
        if (hit && !stopped) {
          stop();
          onCode(hit.rawValue);
          return;
        }
      } catch (e) { /* image pas encore prête */ }
    }
    setTimeout(loop, 180);
  };
  loop();
  return stop;
}

/** Fiche produit Open Food Facts (base collaborative, gratuite, sans clé). */
export async function lookupBarcode(code) {
  const fields = 'product_name,product_name_fr,brands,quantity,serving_quantity,nutriments';
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
  let data = null;
  try { data = await res.json(); } catch (e) { /* réponse vide */ }
  if (!data && !res.ok) throw new Error('Open Food Facts ne répond pas. Réessaie dans un instant.');
  if (!data || data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
  const num = v => (v == null || isNaN(Number(v)) ? null : Math.round(Number(v) * 10) / 10);
  return {
    code,
    name: p.product_name_fr || p.product_name || 'Produit sans nom',
    brand: (p.brands || '').split(',')[0].trim(),
    quantity: p.quantity || '',
    serving: num(p.serving_quantity),
    k100: num(kcal),
    p100: num(n.proteins_100g) ?? 0,
    c100: num(n.carbohydrates_100g) ?? 0,
    f100: num(n.fat_100g) ?? 0,
    liquid: /\b(ml|cl|l)\b/i.test(p.quantity || ''),
  };
}
