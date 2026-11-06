// Reconnaissance par l'IA (Claude) — facultative, avec ta propre clé API.
// La clé reste sur ton téléphone et n'est envoyée qu'à api.anthropic.com.
const API = 'https://api.anthropic.com/v1/messages';

export const MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', sub: 'Plus précis · ~1 centime la photo' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', sub: 'Plus rapide et moins cher' },
];

const SYSTEM = `Tu es diététicien. On te montre un repas (photo ou description).
Liste chaque aliment séparément. Estime de façon réaliste la quantité réellement présente, en grammes (ou en ml pour les boissons),
en tenant compte de la taille de l'assiette et des couverts. N'oublie pas l'huile, le beurre ou la sauce visibles.
Donne les valeurs nutritionnelles moyennes pour 100 g (ou 100 ml), proches de la table CIQUAL. Noms en français, courts.`;

const TOOL = {
  name: 'aliments',
  description: 'Enregistre les aliments identifiés dans le repas.',
  input_schema: {
    type: 'object',
    properties: {
      aliments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Nom court en français' },
            quantite: { type: 'number', description: 'Quantité estimée' },
            unite: { type: 'string', enum: ['g', 'ml'] },
            kcal_100: { type: 'number', description: 'kcal pour 100 g ou 100 ml' },
            proteines_100: { type: 'number' },
            glucides_100: { type: 'number' },
            lipides_100: { type: 'number' },
            confiance: { type: 'number', description: 'Confiance dans l’identification, de 0 à 100' },
          },
          required: ['nom', 'quantite', 'unite', 'kcal_100', 'proteines_100', 'glucides_100', 'lipides_100', 'confiance'],
        },
      },
    },
    required: ['aliments'],
  },
};

async function call(settings, content) {
  if (!settings?.apiKey) throw new Error('Ajoute ta clé API Claude dans Réglages pour activer la reconnaissance.');
  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model || MODELS[0].id,
        max_tokens: 1500,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'aliments' },
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (e) {
    throw new Error('Pas de connexion à Internet.');
  }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error?.message || ''; } catch (e) { /* rien */ }
    if (res.status === 401) throw new Error('Clé API refusée. Vérifie-la dans Réglages.');
    if (/credit balance/i.test(msg)) throw new Error('Plus de crédit sur ton compte Claude. Ajoute du crédit sur platform.claude.com › Billing.');
    if (/workspace/i.test(msg)) throw new Error('Ta clé n’est liée à aucun espace de travail. Crée une nouvelle clé en choisissant un espace de travail (Workspace).');
    if (res.status === 429) throw new Error('Trop de demandes d’un coup. Réessaie dans une minute.');
    if (res.status === 529 || res.status >= 500) throw new Error('Le service est surchargé. Réessaie dans un instant.');
    throw new Error(msg || `Erreur ${res.status}`);
  }
  const data = await res.json();
  const tool = (data.content || []).find(c => c.type === 'tool_use');
  const list = tool?.input?.aliments || [];
  return list
    .filter(a => a && a.nom)
    .map(a => ({
      name: String(a.nom).slice(0, 60),
      g: Math.max(0, Math.round(Number(a.quantite) || 0)),
      unit: a.unite === 'ml' ? 'ml' : 'g',
      k100: Math.max(0, Number(a.kcal_100) || 0),
      p100: Math.max(0, Number(a.proteines_100) || 0),
      c100: Math.max(0, Number(a.glucides_100) || 0),
      f100: Math.max(0, Number(a.lipides_100) || 0),
      conf: Math.round(Number(a.confiance) || 0),
    }));
}

export function analyzePhoto(settings, dataUrl, note = '') {
  return call(settings, [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dataUrl.split(',')[1] } },
    { type: 'text', text: 'Identifie les aliments de ce repas et estime les quantités.' + (note ? ` Précision de l’utilisateur : ${note}` : '') },
  ]);
}

export function analyzeText(settings, text) {
  return call(settings, [
    { type: 'text', text: `Repas décrit par l’utilisateur : « ${text} ». Utilise les quantités indiquées ; sinon une portion habituelle.` },
  ]);
}

/** Réduit la photo (1024 px max, JPEG) avant envoi : plus rapide et moins cher. */
export function fileToJpeg(file, max = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette photo.'));
    };
    img.src = url;
  });
}
