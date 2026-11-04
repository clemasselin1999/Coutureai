/* CoutureIA – Tableau des tailles/métrages au dos du patron + Ajustement / gradation (calcul 100 % local) */
"use strict";

// ---------------------------------------------------------------- référentiel
const GZ = {
  HT: { k: "Hauteur totale", s: "Stature / Hauteur", l: 1, h: "stature du corps" },
  P: { k: "Tour de poitrine", s: "Poitrine", c: 1 },
  T: { k: "Tour de taille", s: "Taille", c: 1 },
  H: { k: "Tour de hanches", s: "Hanches", c: 1 },
  E: { k: "Largeur épaules", s: "Épaules" },
  C: { k: "Tour de cou", s: "Cou", c: 1 },
  B: { k: "Tour de bras", s: "Bras", c: 1 },
  CU: { k: "Tour de cuisse", s: "Cuisse", c: 1 },
  LD: { k: "Longueur dos", s: "Long. dos", l: 1, h: "nuque → taille" },
  LB: { k: "Longueur bras", s: "Long. bras", l: 1, h: "épaule → poignet" },
  LV: { k: "Longueur du vêtement", s: "Long. vêtement", l: 1, h: "longueur finie souhaitée" },
  EJ: { k: "Longueur entrejambe", s: "Entrejambe", l: 1, h: "fourche → cheville" },
};
const GCODES = [
  ["HT", "Hauteur totale / Stature"],
  ["P", "Tour de poitrine"], ["T", "Tour de taille"], ["H", "Tour de hanches"],
  ["E", "Largeur épaules"], ["C", "Tour de cou"], ["B", "Tour de bras"], ["CU", "Tour de cuisse"],
  ["LD", "Longueur dos"], ["LB", "Longueur bras"], ["LV", "Longueur vêtement"], ["EJ", "Entrejambe"],
  ["MESURE", "Autre mesure (cm)"],
  ["TISSU", "Quantité tissu"], ["AUTRE", "Fourniture / Autre"],
];
const GTYPES = {
  haut: { l: "Haut / chemise", z: ["HT", "P", "T", "H", "E", "C", "B", "LD", "LB", "LV"] },
  robe: { l: "Robe", z: ["HT", "P", "T", "H", "E", "C", "B", "LD", "LB", "LV"] },
  veste: { l: "Veste / manteau", z: ["HT", "P", "T", "H", "E", "C", "B", "LD", "LB", "LV"] },
  jupe: { l: "Jupe", z: ["HT", "T", "H", "LV"] },
  pantalon: { l: "Pantalon / short", z: ["HT", "T", "H", "CU", "EJ", "LV"] },
};
const GEASE = {
  pres: { l: "Près du corps (maille)", P: 0, T: 0, H: 0, B: 0, CU: 0, C: 1 },
  ajuste: { l: "Ajusté", P: 6, T: 4, H: 4, B: 4, CU: 4, C: 2 },
  semi: { l: "Semi-ajusté", P: 10, T: 10, H: 8, B: 7, CU: 7, C: 2 },
  ample: { l: "Ample", P: 16, T: 18, H: 14, B: 10, CU: 12, C: 3 },
};
const CAT2TYPE = { "Haut": "haut", "Robe": "robe", "Manteau/Veste": "veste", "Bas": "pantalon" };

S.g = {
  pid: "", type: "haut", method: "A", fit: "ajuste", profId: "",
  selSize: "", base: {}, target: {}, fba: false, showAllMeasures: false,
  out: null, ai: null, aiBusy: false,
  scScanning: false, scEditing: false, scDraft: null,
};

// Re-classe automatiquement un intitulé de colonne si Gemini l'a mis en AUTRE par erreur
function gInferCode(label, rawCode) {
  const l = String(label || "").toLowerCase();
  const c = String(rawCode || "AUTRE").toUpperCase();
  if (/tissu|fabric|laize|m[eé]trage|doublure|lining|thermocol|entoilage|interfacing|bord-c[oô]te|bord cote|ribbing|empi[eè]cement|yoke|manches longues|manches courtes|long sleeves|short sleeves/.test(l)) return "TISSU";
  if (/bouton|button|fermeture|zip|[eé]lastique|elastic|aiguille|press|[oœ]illet|biais|ruban|cordon/.test(l)) return "AUTRE";
  if (/stature|height|hauteur totale|taille corporelle/.test(l)) return "HT";
  if (/poitrine|buste|chest|bust/.test(l) && !/hauteur/.test(l)) return "P";
  if (/tour de taille|waist/.test(l) || /^(taille|taille \(cm\))$/.test(l.trim())) return "T";
  if (/hanche|bassin|hip/.test(l)) return "H";
  if (/[eé]paule|carrure|shoulder/.test(l)) return "E";
  if (/cou|encolure|neck/.test(l)) return "C";
  if (/cuisse|thigh/.test(l)) return "CU";
  if (/entrejambe|inseam/.test(l)) return "EJ";
  if (/longueur dos|taille dos|hauteur buste|back waist|back length/.test(l)) return "LD";
  if (/longueur bras|longueur de bras|longueur manche|sleeve length/.test(l)) return "LB";
  if (/longueur v[eê]tement|longueur du v[eê]tement|longueur finie|longueur totale|garment length/.test(l)) return "LV";
  if (/tour de bras|biceps|upper arm/.test(l)) return "B";
  return c;
}

// Compatibilité & normalisation locale d'un tableau des tailles
function gEnsureHeaders(sc) {
  if (!sc) return sc;
  let headers = (sc.headers || []).map((h) => ({ label: h.label, code: gInferCode(h.label, h.code) }));
  if (!headers.length) {
    const cols = Object.keys(GZ).filter((k) => sc.sizes?.some((s) => s[k] != null));
    headers = cols.map((k) => ({ label: GZ[k].k, code: k }));
    if (sc.sizes?.some((s) => s.tissu_140)) headers.push({ label: "Tissu 140 cm", code: "TISSU" });
    if (sc.sizes?.some((s) => s.tissu_110)) headers.push({ label: "Tissu 110 cm", code: "TISSU" });
  }
  const sizes = (sc.sizes || []).map((s) => {
    const values = s.values ? [...s.values] : headers.map((h) => {
      if (h.code in GZ) return s[h.code] != null ? `${s[h.code]} cm` : "";
      if (h.label.includes("140")) return s.tissu_140 ? `${s.tissu_140} m` : "";
      if (h.label.includes("110")) return s.tissu_110 ? `${s.tissu_110} m` : "";
      return "";
    });
    const row = { ...s, values };
    const tissuParts = [], extraParts = [];
    headers.forEach((h, idx) => {
      const v = String(values[idx] || "").trim();
      if (!v) return;
      const nums = (v.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(",", ".")));
      if ((h.code in GZ || h.code === "MESURE") && nums.length) {
        const key = h.code === "MESURE" ? `M_${idx}` : h.code;
        let lo = nums[0], hi = nums.length > 1 && nums[0] <= nums[1] && nums[1] <= nums[0] * 1.35 ? nums[1] : nums[0];
        if (/\bm\b/i.test(v) && !/cm|mm/i.test(v) && hi < 5) { lo = +(lo * 100).toFixed(1); hi = +(hi * 100).toFixed(1); }
        row[key] = +((lo + hi) / 2).toFixed(1);
        row[`${key}_min`] = lo;
        row[`${key}_max`] = hi;
        row[`${key}_txt`] = v;
      } else if (h.code === "TISSU") {
        tissuParts.push(`${h.label} : ${v}`);
        if (nums.length && !row.tissu_m) row.tissu_m = +(nums[0] > 15 || /cm/i.test(v) ? nums[0] / 100 : nums[0]).toFixed(2);
      } else {
        extraParts.push(`${h.label} : ${v}`);
      }
    });
    if (tissuParts.length) row.tissu_txt = tissuParts.join(" • ");
    if (extraParts.length) row.fournitures_txt = extraParts.join(" • ");
    return row;
  });
  return { ...sc, headers, sizes };
}

// Liste dynamique des mesures à afficher dans Ajuster selon le tableau du patron
function gChartMeasureZones(p) {
  const sc = gEnsureHeaders(p?.sizeChart);
  if (!sc?.headers?.length || !sc?.sizes?.length) return [];
  const zones = [], seen = new Set();
  sc.headers.forEach((h, idx) => {
    if (h.code in GZ && !seen.has(h.code)) {
      seen.add(h.code);
      zones.push({ z: h.code, k: GZ[h.code].k, chartLabel: h.label, h: GZ[h.code].h, c: GZ[h.code].c, l: GZ[h.code].l, fromChart: true });
    } else if (h.code === "MESURE") {
      const z = `M_${idx}`;
      zones.push({ z, k: h.label, chartLabel: h.label, fromChart: true, custom: true });
    }
  });
  return zones;
}

function gActiveZones(g) {
  const p = S.patterns.find((x) => x.id === g.pid);
  const chartZones = gChartMeasureZones(p);
  const typeZs = GTYPES[g.type].z;
  if (!chartZones.length) {
    return typeZs.map((z) => ({ z, ...GZ[z], fromChart: false }));
  }
  if (!g.showAllMeasures) return chartZones;
  const inChart = new Set(chartZones.map((x) => x.z));
  const extra = typeZs.filter((z) => !inChart.has(z)).map((z) => ({ z, ...GZ[z], fromChart: false }));
  return [...chartZones, ...extra];
}

function gZoneInfo(z, g) {
  if (GZ[z]) return GZ[z];
  const found = gActiveZones(g || S.g).find((x) => x.z === z);
  return found || { k: z, s: z };
}

// ---------------------------------------------------------------- bloc Dossier du patron : Tableau des tailles & Métrage tissu
function sizeChartBox(p) {
  const g = S.g, sc = gEnsureHeaders(p.sizeChart);
  if (g.scScanning) {
    return `<div class="card pad center" style="min-height:180px;margin-bottom:16px;border-color:var(--rose-200);background:var(--rose-50)">
      <div class="spin"></div><b>Lecture du tableau des tailles et fournitures par Gemini…</b></div>`;
  }
  const fileInputs = `<input type="file" id="sccam" accept="image/*" capture="environment" class="hidden" data-file="scscan">
    <input type="file" id="scimg" accept="image/*" class="hidden" data-file="scscan">`;

  if (g.scEditing && g.scDraft) {
    const d = g.scDraft;
    const hCells = d.headers.map((h, c) => `<th style="min-width:130px">
      <div class="row" style="gap:4px;margin-bottom:4px">
        <input data-sch="${c}.label" value="${esc(h.label)}" placeholder="Intitulé" style="font-size:12px;padding:4px 6px;font-weight:700">
        <button class="icon-btn danger" data-act="scrmcol" data-c="${c}" title="Supprimer cette colonne" style="padding:2px">${ico("x", "ico", 2)}</button>
      </div>
      <select data-sch="${c}.code" style="font-size:11px;padding:3px 6px">
        ${GCODES.map(([k, l]) => `<option value="${k}" ${h.code === k ? "selected" : ""}>→ ${l}</option>`).join("")}
      </select>
    </th>`).join("");
    const rows = d.sizes.map((s, r) => `<tr>
      <td><input data-sc="${r}.taille" value="${esc(s.taille ?? "")}" placeholder="ex: S, 40" style="width:84px;font-weight:700"></td>
      ${d.headers.map((_, c) => `<td><input data-scv="${r}.${c}" value="${esc((s.values || [])[c] ?? "")}" placeholder="ex: 86 / 90 cm" style="min-width:115px"></td>`).join("")}
      <td><button class="icon-btn danger" data-act="scrmrow" data-i="${r}">${ico("x")}</button></td></tr>`).join("");
    return `<div class="card pad stack" style="margin-bottom:16px;border-color:var(--rose-200)">
      <div class="row between wrap">
        <div><h3 style="font-size:16px">📐 Tableau des tailles & fournitures (dos du patron)</h3>
          <span class="muted small">Les colonnes correspondent exactement aux lignes de votre image (fourchettes comme « 86 / 90 cm » acceptées).</span></div>
        <div class="seg">
          <button data-act="sctype" data-v="corps" class="${d.type_mesures !== "vetement" ? "on" : ""}">Mensurations corps</button>
          <button data-act="sctype" data-v="vetement" class="${d.type_mesures === "vetement" ? "on" : ""}">Vêtement fini</button>
        </div>
      </div>
      ${d.error ? `<div class="mverdict">⚠️ ${esc(d.error)} — Saisissez les tailles à la main ci-dessous.</div>` : ""}
      ${d.imageUri ? `<div class="row"><img src="${esc(d.imageUri)}" alt="Tableau" style="max-height:150px;border-radius:8px;cursor:pointer;border:1px solid var(--s200)" data-act="previewurl" data-url="${esc(d.imageUri)}"><span class="muted small">Cliquez sur la photo pour zoomer</span></div>` : ""}
      <div style="overflow-x:auto"><table class="mtable">
        <thead><tr><th style="width:90px">TAILLE</th>${hCells}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="row between wrap">
        <div class="row wrap">
          <button class="btn" data-act="scaddrow">${ico("plus", "ico")} Ajouter une taille</button>
          <button class="btn" data-act="scaddcol">${ico("plus", "ico")} Ajouter une colonne</button>
        </div>
        <div class="row">
          <button class="btn" data-act="sccancel">Annuler</button>
          <button class="btn primary" data-act="scsave">${ico("check", "ico")} Enregistrer le tableau</button>
        </div>
      </div>${fileInputs}</div>`;
  }

  if (!sc || (!sc.sizes?.length && !sc.imageUri)) {
    return `<div class="card pad stack" style="margin-bottom:16px;background:var(--rose-50);border-color:var(--rose-200)">
      <div class="row between wrap">
        <div><h3 style="font-size:16px;color:#be123c">📐 Tableau des tailles & métrage tissu (dos du patron)</h3>
          <p class="muted small">Photographiez le tableau au dos de la pochette : les dimensions par taille, métrages de tissu et fournitures seront extraits tels quels et utilisés pour ajuster le patron.</p></div>
        <div class="row wrap">
          <button class="btn primary" data-act="sccam">${ico("camera", "ico")} Photo du tableau</button>
          <button class="btn" data-act="scimg">${ico("upload", "ico")} Importer</button>
          <button class="btn" data-act="scedit">${ico("edit", "ico")} Saisir à la main</button>
        </div>
      </div>${fileInputs}</div>`;
  }

  const headers = sc.headers || [];
  return `<div class="card pad stack" style="margin-bottom:16px;border-color:var(--rose-200)">
    <div class="row between wrap">
      <div class="row">
        ${sc.imageUri ? `<img src="${esc(sc.imageUri)}" alt="Tableau" style="width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer;border:1px solid var(--s200)" data-act="previewurl" data-url="${esc(sc.imageUri)}" title="Agrandir la photo du tableau">` : ""}
        <div><h3 style="font-size:16px">📐 Tableau des tailles & fournitures</h3>
          <span class="muted small">${sc.sizes.length} taille(s) • ${sc.type_mesures === "vetement" ? "Mesures vêtement fini" : "Mensurations du corps"}</span></div>
      </div>
      <div class="row wrap">
        <button class="btn" data-act="sccam" title="Reprendre en photo">${ico("camera", "ico")}</button>
        <button class="btn" data-act="scimg" title="Importer une autre image">${ico("upload", "ico")}</button>
        <button class="btn" data-act="scedit">${ico("edit", "ico")} Modifier</button>
        <button class="btn primary" data-act="gradefrom">${ico("sliders", "ico")} Ajuster à une taille</button>
      </div>
    </div>
    ${sc.sizes.length ? `<div style="overflow-x:auto"><table class="mtable">
      <thead><tr><th>Taille</th>${headers.map((h) => `<th>${esc(h.label)}</th>`).join("")}</tr></thead>
      <tbody>${sc.sizes.map((s) => `<tr><td><b>${esc(s.taille)}</b></td>${headers.map((_, c) => `<td>${esc((s.values || [])[c] || "–")}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>` : '<p class="muted small">Aucune taille renseignée. Cliquez sur « Modifier » pour saisir les chiffres.</p>'}
    ${fileInputs}</div>`;
}

// ---------------------------------------------------------------- calcul de gradation
const gn = (v) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(x) ? null : x; };
const cm = (v) => (Math.round(Math.abs(v) * 10) / 10).toLocaleString("fr-FR") + " cm";
const mv = (v) => (v >= 0 ? "écarte de " : "fais chevaucher de ") + cm(v);
const big = (v) => v != null && Math.abs(v) >= 0.3;

// Trouve la taille du tableau la plus proche des mesures cibles (prend en compte Poitrine, Taille, Hanches, Stature/Hauteur totale et mesures du tableau)
function gBestSize(sizes, target, type) {
  if (!sizes?.length) return null;
  const allKeys = ["P", "T", "H", "HT", "E", "B", "CU", "LD", "LB", "LV", "EJ", ...Object.keys(target || {}).filter((k) => k.startsWith("M_"))];
  let best = sizes[0], bestScore = Infinity;
  for (const s of sizes) {
    let score = 0, n = 0;
    for (const k of allKeys) {
      const sv = gn(s[k]), tv = gn(target[k]);
      if (sv != null && tv != null) {
        const w = k === "P" || k === "HT" ? 1.5 : 1;
        score += Math.abs(tv - sv) * w;
        n += w;
      }
    }
    if (n && score / n < bestScore) { bestScore = score / n; best = s; }
  }
  return best;
}

function gApplySizeRow(row, chart) {
  if (!row) return;
  S.g.selSize = row.taille;
  S.g.method = chart?.type_mesures === "vetement" ? "B" : "A";
  S.g.base = {};
  for (const k of Object.keys(row)) {
    if ((k in GZ || /^M_\d+$/.test(k)) && typeof row[k] === "number") {
      S.g.base[k] = row[k];
    }
  }
}

function gDeltas(g) {
  const d = {};
  for (const item of gActiveZones(g)) {
    const z = item.z;
    const b = gn(g.base[z]), t = gn(g.target[z]);
    if (b == null || t == null) continue;
    const ease = g.method === "B" && GZ[z]?.c ? (GEASE[g.fit][z] ?? 0) : 0;
    d[z] = Math.round((t + ease - b) * 10) / 10;
  }
  return d;
}

function gSteps(g) {
  const d = gDeltas(g), st = [], T = g.type, top = ["haut", "robe", "veste"].includes(T);
  const add = (t, b) => st.push({ t, b });
  const lvl = (rows) => `<table class="mtable"><tbody>${rows.filter((r) => r[1] != null).map(([l, v]) => `<tr><td>${l}</td><td><b>${mv(v)}</b></td></tr>`).join("")}</tbody></table>`;
  if (!Object.keys(d).length) return { d, st, warn: "Renseignez au moins une mesure cible en face de la mesure du patron pour calculer l'ajustement." };

  const p = S.patterns.find((x) => x.id === g.pid);
  const sc = gEnsureHeaders(p?.sizeChart);
  const szRow = sc?.sizes?.find((s) => s.taille === g.selSize);
  const sizeLabel = g.selSize ? `la <b>taille ${esc(g.selSize)}</b>` : "la taille choisie";

  if (szRow && (szRow.tissu_txt || szRow.tissu_m || szRow.tissu_140 || szRow.fournitures_txt)) {
    const extraL = Math.max(0, d.LV || 0, d.EJ || 0, d.HT ? d.HT * 0.45 : 0) + Math.max(0, d.LD || 0) + Math.max(0, d.LB || 0);
    const maxCirc = Math.max(0, d.P || 0, d.T || 0, d.H || 0);
    const bonus = Math.round(((extraL * 2) / 100 + (maxCirc > 8 ? 0.25 : maxCirc > 4 ? 0.15 : 0)) * 20) / 20;
    const baseM = szRow.tissu_m || szRow.tissu_140;
    add("Métrage de tissu & fournitures à prévoir", `D'après le tableau du patron pour ${sizeLabel} :
      <ul>
        ${szRow.tissu_txt ? `<li><b>${esc(szRow.tissu_txt)}</b>${baseM && bonus > 0 ? ` → prévois environ <b>+${bonus.toFixed(2).replace(".", ",")} m</b> supplémentaires pour tes agrandissements` : ""}</li>`
          : baseM ? `<li>Tissu : <b>${baseM} m</b>${bonus > 0 ? ` → prévois <b>${(baseM + bonus).toFixed(2).replace(".", ",")} m</b>` : ""}</li>` : ""}
        ${szRow.fournitures_txt ? `<li>Fournitures : <b>${esc(szRow.fournitures_txt)}</b></li>` : ""}
      </ul>`);
  }

  // Si toutes les différences sont nulles (0 cm), la taille choisie correspond pile !
  const hasAnyDiff = Object.values(d).some((v) => Math.abs(v) >= 0.3);
  if (!hasAnyDiff) {
    add("Bonne nouvelle : aucun ajustement nécessaire !", `Les mesures cibles correspondent exactement à ${sizeLabel} du patron.
      Tu peux décalquer et coudre directement ${sizeLabel} telle quelle sans modifier le patron.`);
    return { d, st };
  }

  add("Préparer la base", `Décalque chaque pièce de ${sizeLabel} <b>sans les marges de couture</b> (efface-les si elles sont incluses).
    Trace sur chaque pièce le droit-fil et les lignes horizontales de repère : <b>poitrine</b> (sous l'emmanchure), <b>taille</b>, <b>hanches</b>.
    Garde l'original intact : on travaille sur une copie.`);

  // Cas d'un ajustement basé sur la Stature / Hauteur totale (HT)
  if (big(d.HT)) {
    const dh = d.HT;
    if (top) {
      const bustH = !big(d.LD) ? +(dh * 0.22).toFixed(1) : null;
      const hemH = !big(d.LV) ? +(dh * (T === "robe" ? 0.45 : 0.18)).toFixed(1) : null;
      const slvH = !big(d.LB) ? +(dh * 0.33).toFixed(1) : null;
      add(`Adapter à la stature (${dh > 0 ? "+" : ""}${dh.toLocaleString("fr-FR")} cm sur la hauteur totale)`,
        `Pour adapter ${sizeLabel} à une stature de <b>${g.target.HT} cm</b> (au lieu de ${g.base.HT} cm), répartis la hauteur sur les lignes horizontales du patron :
        ${lvl([
          ["1. Hauteur du buste (ligne horizontale entre emmanchure et taille, devant & dos)", bustH],
          [T === "robe" ? "2. Longueur de la jupe (ligne horizontale sous les hanches)" : "2. Bas du buste (ligne horizontale entre taille et ourlet)", hemH],
          ["3. Manche longue – au-dessus du coude", slvH ? +(slvH / 2).toFixed(1) : null],
          ["4. Manche longue – au-dessous du coude", slvH ? +(slvH / 2).toFixed(1) : null],
        ])}
        ${!big(d.P) && !big(d.T) && !big(d.H) ? `<p class="small muted" style="margin-top:6px">Note : le tableau du patron ne donne que la stature. Si la carrure/largeur de ${sizeLabel} va déjà bien, ne touche qu'aux longueurs ci-dessus. S'il faut aussi élargir ou rétrécir d'une taille en largeur, ${mv(dh * 0.08)} sur chaque couture de côté.</p>` : ""}`);
    } else {
      const riseH = +(dh * 0.12).toFixed(1);
      const legH = !big(d.EJ) && !big(d.LV) ? +(dh * 0.45).toFixed(1) : null;
      add(`Adapter à la stature (${dh > 0 ? "+" : ""}${dh.toLocaleString("fr-FR")} cm sur la hauteur totale)`,
        `Répartis la différence de stature sur la hauteur du bas :
        ${lvl([
          ["1. Hauteur de bassin / fourche (ligne horizontale à mi-hauteur de hanche)", riseH],
          [T === "pantalon" ? "2. Jambe – au-dessus du genou" : "2. Longueur de jupe (sous les hanches)", legH ? (T === "pantalon" ? +(legH / 2).toFixed(1) : legH) : null],
          [T === "pantalon" ? "3. Jambe – sous le genou" : "", T === "pantalon" && legH ? +(legH / 2).toFixed(1) : null],
        ])}`);
    }
  }

  if (top) {
    const q = (z) => (d[z] != null ? d[z] / 4 : null);
    const circ = ["P", "T", "H"].filter((z) => d[z] != null);
    const maxC = Math.max(0, ...circ.map((z) => Math.abs(d[z])));
    const fba = g.fba && d.P > 0;
    if (fba) {
      const a = d.P / 2;
      add("FBA – ajustement poitrine (devant uniquement)", `Les épaules vont bien : on n'ajoute du volume qu'au devant, en « Y ».
        <ol><li>Marque la <b>pointe de poitrine</b> (apex) sur le devant.</li>
        <li><b>Ligne 1</b> : de l'apex, descends parallèlement au droit-fil jusqu'à l'ourlet.</li>
        <li><b>Ligne 2</b> : de l'apex, remonte vers le tiers inférieur de l'emmanchure.</li>
        <li><b>Ligne 3</b> : de la couture de côté (au milieu de la pince de côté) jusqu'à l'apex.</li>
        <li>Coupe la ligne 1 puis la ligne 2 jusqu'à l'emmanchure en laissant une <b>charnière de 1 mm</b>. Coupe la ligne 3 jusqu'à l'apex (charnière).</li>
        <li>Écarte la ligne 1 de <b>${cm(a)}</b> à hauteur de poitrine, parallèlement au droit-fil.</li>
        <li>La partie côté remonte : <b>abaisse-la</b> le long de la ligne 3 pour que l'ourlet soit à nouveau aligné. L'ouverture créée devient la nouvelle <b>pince de côté</b>, plus profonde.</li>
        <li>Redessine la pince : pointe <b>à 2 cm de l'apex</b>. Prolonge l'ourlet du devant de la même valeur pour rattraper le dos.</li></ol>
        Le dos reste inchangé à la poitrine.`);
    }
    const qP = fba ? 0 : q("P"), qT = q("T"), qH = q("H");
    if (circ.length && maxC >= 0.3) {
      if (maxC <= 3 || (fba && Math.max(Math.abs(d.T || 0), Math.abs(d.H || 0)) <= 3)) {
        add("Ajuster par les coutures de côté", `Écart faible : on modifie seulement les côtés, sur le <b>devant et le dos</b> (même valeur des deux côtés).
          ${lvl([["Poitrine", fba ? null : qP], ["Taille", qT], ["Hanches", qH]])}
          Repère ces points depuis la couture de côté d'origine (vers l'extérieur pour agrandir), puis relie-les par une ligne douce.`);
      } else {
        const s = (v) => (v == null ? null : v / 3);
        add("Tracer les lignes de coupe (devant et dos)", `<ul><li><b>Ligne A</b> : du milieu de l'épaule, verticale (parallèle au droit-fil) jusqu'à l'ourlet. Sur le devant elle passe par la pince / pointe de poitrine.</li>
          <li><b>Ligne B</b> : depuis le creux de l'emmanchure (là où la courbe devient verticale), verticale jusqu'à l'ourlet.</li></ul>
          L'écart total est réparti en 3 parts égales : ligne A, ligne B et couture de côté.`);
        add("Écarter les lignes (sur chaque pièce : ½ devant et ½ dos)", `Pose les morceaux sur une nouvelle feuille, aligne les lignes horizontales de repère, puis à chaque niveau :
          <div class="grid2" style="margin-top:8px"><div><b>Ligne A</b>${lvl([["Poitrine", s(qP)], ["Taille", s(qT)], ["Hanches / ourlet", s(qH)]])}</div>
          <div><b>Ligne B</b>${lvl([["Poitrine", s(qP)], ["Taille", s(qT)], ["Hanches / ourlet", s(qH)]])}</div></div>
          <b>Couture de côté</b> : ${lvl([["Poitrine", s(qP)], ["Taille", s(qT)], ["Hanches", s(qH)]])}
          ${big(d.E) ? `<p>Épaule : en haut de la ligne A, ${mv(d.E / 2)} (carrure).</p>` : `<p>Épaule : la carrure ne change pas → laisse une <b>charnière à l'épaule</b> sur la ligne A et ouvre en éventail vers le bas.</p>`}
          Scotche les morceaux.`);
      }
    } else if (big(d.E)) {
      add("Carrure", `Trace la ligne A (milieu de l'épaule → ourlet) sur devant et dos, et ${mv(d.E / 2)} en haut, en faisant charnière à la taille.`);
    }
    if (big(d.C)) {
      const r = d.C / 6.3;
      add("Encolure", `Décale toute la courbe d'encolure (devant et dos) de <b>${cm(r)}</b> ${d.C > 0 ? "vers l'intérieur de la pièce (on agrandit le trou)" : "vers l'extérieur (on réduit le trou)"}, parallèlement à la courbe d'origine.
        S'il y a un col ou une parementure : ${d.C > 0 ? "allonge" : "raccourcis"}-les de <b>${cm(d.C / 2)}</b> au milieu dos (pièce coupée au pli).`);
    }
    if (big(d.LD)) add("Longueur du buste", `Trace une ligne horizontale entre le bas de l'emmanchure et la taille (devant, dos, et parementures). Coupe et ${mv(d.LD)}, parallèlement.`);
    if (big(d.B)) add("Tour de bras (manche ouverte en croix)", `<ol><li>Trace une ligne verticale au milieu de la manche, du sommet de tête de manche à l'ourlet.</li>
        <li>Trace la ligne de biceps (horizontale, d'un dessous de bras à l'autre).</li>
        <li>Coupe la verticale jusqu'au sommet (charnière 1 mm) et la ligne de biceps jusqu'aux bords (charnières).</li>
        <li>${d.B > 0 ? "Écarte" : "Fais chevaucher"} les deux moitiés de <b>${cm(d.B)}</b> au niveau du biceps : les 4 morceaux pivotent, la tête de manche s'abaisse légèrement.</li>
        <li>Redessine la tête de manche et le dessous de bras.</li></ol>`);
    if (big(d.LB)) add("Longueur de manche", `Coupe la manche horizontalement à mi-hauteur entre dessous de bras et coude, et ${mv(d.LB / 2)} ; refais la même chose entre coude et poignet (${mv(d.LB / 2)}).`);
    if (big(d.LV)) add("Longueur du vêtement", `Coupe devant et dos horizontalement au-dessus de l'ourlet (sous les hanches) et ${mv(d.LV)}.`);
  }

  if (T === "jupe" || T === "pantalon") {
    const qT = d.T != null ? d.T / 4 : null, qH = d.H != null ? d.H / 4 : null;
    const maxC = Math.max(Math.abs(d.T || 0), Math.abs(d.H || 0));
    if (maxC >= 0.3 && maxC <= 3) {
      add("Ajuster par les coutures de côté", `Sur devant et dos (de chaque côté) : ${lvl([["Taille", qT], ["Hanches", qH]])} Relie en suivant le galbe d'origine.`);
    } else if (maxC > 3) {
      const h = qH ?? qT ?? 0, pants = T === "pantalon";
      const parts = pants ? { line: 0.25, side: 0.5, crotch: 0.25 } : { line: 0.5, side: 0.5, crotch: 0 };
      add("Tracer la ligne de coupe", `Sur le devant et le dos : une ligne verticale ${pants ? "sur le pli (droit-fil), de la taille à l'ourlet" : "passant par le milieu de la pince, de la taille à l'ourlet"}.`);
      add("Répartir l'écart aux hanches (par pièce)", `${lvl([["Ligne verticale", h * parts.line], ["Couture de côté", h * parts.side], pants ? ["Pointe de fourche (entrejambe)", h * parts.crotch] : ["", null]])}
        ${pants ? "Pour la fourche, prolonge la pointe de fourche horizontalement de cette valeur et redessine la courbe en douceur." : ""}`);
      if (qT != null) {
        const dart = h - qT;
        add("Ajuster la taille par les pinces", Math.abs(dart) < 0.2 ? "La taille suit la même proportion : rien à changer aux pinces."
          : `À la taille, chaque pièce a reçu ${cm(h)} alors qu'il faut ${cm(qT)}. ${dart > 0 ? `<b>Approfondis</b> la pince de ${cm(dart)} (garde la même pointe).`
            : `<b>Réduis</b> la pince de ${cm(-dart)}. Si la pince devient plus petite que 0, supprime-la et reporte le reste sur la couture de côté.`}`);
      }
    }
    if (T === "pantalon" && big(d.CU)) add("Tour de cuisse", `Sur l'entrejambe du devant et du dos, au niveau de la fourche : ${mv(d.CU / 4)} vers l'extérieur, puis rejoins la couture d'origine en mourant au genou. Fais de même sur la couture de côté (${mv(d.CU / 4)}).`);
    if (big(d.EJ)) add("Longueur de jambe", `Coupe horizontalement chaque jambe au-dessus du genou (${mv(d.EJ / 2)}) et sous le genou (${mv(d.EJ / 2)}).`);
    if (big(d.LV) && T === "jupe") add("Longueur", `Coupe devant et dos horizontalement sous les hanches et ${mv(d.LV)}.`);
  }

  // Mesures personnalisées éventuelles issues du tableau (M_0, M_1...)
  for (const [z, val] of Object.entries(d)) {
    if (z.startsWith("M_") && big(val)) {
      const info = gZoneInfo(z, g);
      add(`Ajuster « ${info.k} » (${val > 0 ? "+" : ""}${val.toLocaleString("fr-FR")} cm)`,
        `Pour <b>${esc(info.k)}</b>, reporte la différence de <b>${val > 0 ? "+" : ""}${val.toLocaleString("fr-FR")} cm</b> sur la zone correspondante du patron (si c'est un tour, répartis <b>${cm(val / 4)}</b> sur chaque quart devant et dos ; si c'est une longueur ou largeur simple, ${mv(val)}).`);
    }
  }

  add("Adoucir les courbes", `Redessine des lignes continues là où les morceaux ont été décalés (côtés, ourlet, emmanchure, taille) avec un pistolet ou à main levée.
    Les pinces : referme-les sur le papier et recoupe la ligne de taille pour qu'elle soit droite une fois pliée.`);
  add("Vérifier avant de couper", `<ul><li>Les coutures qui s'assemblent ont la <b>même longueur</b> (côté devant = côté dos, entrejambes…).</li>
    ${top ? "<li>Mesure l'emmanchure (devant + dos) et la tête de manche : la manche doit être 1 à 3 cm plus longue (embu).</li>" : ""}
    <li>Ajoute les marges de couture, reporte crans et droit-fil.</li><li>Idéalement : une <b>toile d'essai</b> dans un tissu bon marché.</li></ul>`);
  return { d, st };
}

// ---------------------------------------------------------------- vue Ajuster
function gradeView() {
  const g = S.g;
  const pats = S.patterns.map((p) => `<option value="${p.id}" ${g.pid === p.id ? "selected" : ""}>${esc(p.name)}${p.brand ? " – " + esc(p.brand) : ""}${p.sizeChart?.sizes?.length ? " (📐 " + p.sizeChart.sizes.length + " tailles)" : ""}</option>`).join("");
  const p = S.patterns.find((x) => x.id === g.pid);
  const sc = gEnsureHeaders(p?.sizeChart), sizes = sc?.sizes || [];
  const bestRow = gBestSize(sizes, g.target, g.type);
  const curRow = sizes.find((s) => s.taille === g.selSize);
  const chartZones = gChartMeasureZones(p);
  const activeZones = gActiveZones(g);
  const pr = S.profiles.find((x) => x.id === g.profId);

  let sizeBanner = "";
  if (p) {
    if (sizes.length) {
      sizeBanner = `<div class="card pad stack" style="background:var(--rose-50);border-color:var(--rose-200)">
        <div class="row between wrap">
          <div><b style="color:#be123c">📐 Tailles enregistrées au dos de « ${esc(p.name)} »</b>
            <div class="muted small">Choisissez la taille de départ à décalquer${bestRow ? ` (recommandée pour ces mesures : <b>Taille ${esc(bestRow.taille)}</b>)` : ""} :</div></div>
          ${sc.imageUri ? `<img src="${esc(sc.imageUri)}" alt="Tableau" style="width:48px;height:48px;object-fit:cover;border-radius:8px;cursor:pointer;border:1px solid var(--rose-200)" data-act="previewurl" data-url="${esc(sc.imageUri)}" title="Voir la photo du tableau">` : ""}
        </div>
        <div class="row wrap" style="gap:6px">
          ${sizes.map((s) => `<button class="chip ${g.selSize === s.taille ? "on" : ""}" data-act="gselsize" data-v="${esc(s.taille)}">Taille <b>${esc(s.taille)}</b>${bestRow?.taille === s.taille ? " ⭐" : ""}</button>`).join("")}
        </div>
        ${curRow && (curRow.tissu_txt || curRow.fournitures_txt) ? `<div class="small">🧵 <b>Taille ${esc(curRow.taille)} :</b> ${esc([curRow.tissu_txt, curRow.fournitures_txt].filter(Boolean).join(" • "))}</div>` : ""}
      </div>`;
    } else {
      sizeBanner = `<div class="card pad row between wrap" style="background:var(--amber-50);border-color:var(--amber-200)">
        <div><b>⚠️ Aucun tableau des tailles enregistré pour « ${esc(p.name)} »</b>
          <div class="muted small">Prenez en photo le tableau au dos de la pochette pour remplir automatiquement les dimensions de base.</div></div>
        <div class="row">
          <button class="btn primary" data-act="gopensc">${ico("camera", "ico")} Photographier le dos du patron</button>
        </div>
      </div>`;
    }
  }

  const rows = activeZones.map((item) => {
    const z = item.z, rangeTxt = curRow?.[`${z}_txt`];
    const profVal = pr?.measurements?.[item.k];
    const curTarget = gn(g.target[z]);
    const isMissingInProf = pr && profVal == null;
    const isDiffFromProf = pr && profVal != null && curTarget != null && Math.abs(curTarget - profVal) >= 0.1;
    return `<tr>
      <td>
        <b>${esc(item.k)}</b>
        ${item.chartLabel && item.chartLabel.toLowerCase() !== item.k.toLowerCase() ? `<div class="muted small">Tableau : ${esc(item.chartLabel)}</div>` : item.h ? `<div class="muted small">${item.h}</div>` : ""}
        ${item.fromChart ? `<span class="mbadge good" style="font-size:10px;padding:1px 6px;margin-top:2px">Du tableau</span>` : ""}
      </td>
      <td><input type="number" inputmode="decimal" step="0.1" data-bind="g.base.${z}" value="${esc(g.base[z] ?? "")}">
        ${rangeTxt && rangeTxt.includes("/") ? `<div class="muted small">Tableau : ${esc(rangeTxt)}</div>` : ""}</td>
      <td><input type="number" inputmode="decimal" step="0.1" data-bind="g.target.${z}" value="${esc(g.target[z] ?? "")}" placeholder="${isMissingInProf ? "À compléter" : ""}">
        ${isMissingInProf ? `<div class="small" style="color:var(--amber)">Absent du profil de ${esc(pr.name)} (sera enregistré)</div>` : ""}
        ${isDiffFromProf ? `<div class="small" style="color:var(--rose)">Profil actuel : ${profVal} cm</div>` : ""}</td></tr>`;
  }).join("");

  const toggleExtraBtn = chartZones.length ? `<div class="row between wrap" style="margin-top:4px">
    <span class="muted small">${g.showAllMeasures ? "Toutes les mesures sont affichées." : `Affichage adapté aux ${chartZones.length} mesure(s) du tableau de « ${esc(p.name)} ».`}</span>
    <button class="btn small" data-act="gtoggleall">${g.showAllMeasures ? "N'afficher que les mesures du tableau" : "+ Afficher les autres mesures (si mesuré à plat)"}</button>
  </div>` : "";

  const out = g.out;
  let res = "";
  if (out) {
    res = out.warn ? `<div class="mverdict">${out.warn}</div>` : `<div class="card pad stack"><h3>Écarts à appliquer (${g.selSize ? `depuis la taille ${esc(g.selSize)}` : "tour complet"})</h3>
        <div class="row wrap" style="gap:6px">${Object.entries(out.d).map(([z, v]) => `<span class="mprice ${v > 0 ? "best" : ""}">${esc(gZoneInfo(z, g).k)} <b>${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR")} cm</b></span>`).join("")}</div></div>
      ${out.st.map((s, i) => `<div class="card pad gstep"><div class="gnum">${i + 1}</div><div style="flex:1"><h3>${esc(s.t)}</h3><div class="gbody">${s.b}</div></div></div>`).join("")}
      <div class="card pad stack"><div class="row between wrap"><b>Un doute ? Faire relire le calcul par l'IA</b>
        <button class="btn" data-act="gai" ${g.aiBusy ? "disabled" : ""}>${ico("sparkles", "ico")} Relire (court)</button></div>
        ${g.aiBusy ? '<div class="spin"></div>' : g.ai ? `<div class="chat">${esc(g.ai)}</div>` : '<p class="muted small">Optionnel : seuls les chiffres ci-dessus sont envoyés, pas d\'image.</p>'}</div>`;
  }
  return `<div class="stack" style="max-width:900px;margin:0 auto">
    <h2 style="font-size:24px">Ajuster un patron à une taille</h2>
    <div class="card pad stack">
      <div class="grid2"><div><label class="lbl">1. Patron</label><select data-bind="g.pid" data-gchange="pat"><option value="">— Choisir un patron —</option>${pats}</select></div>
        <div><label class="lbl">2. Personne (mesures cibles)</label><select data-bind="g.profId" data-gchange="prof"><option value="">— Saisie manuelle —</option>${S.profiles.map((x) => `<option value="${x.id}" ${g.profId === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div></div>
      <div class="grid2">
        <div><label class="lbl">Type de vêtement</label><select data-bind="g.type" data-gchange="1">${Object.entries(GTYPES).map(([k, t]) => `<option value="${k}" ${g.type === k ? "selected" : ""}>${t.l}</option>`).join("")}</select></div>
        <div><label class="lbl">Origine des mesures de base</label>
          <div class="seg"><button data-act="gmethod" data-v="A" class="${g.method === "A" ? "on" : ""}">Tableau des tailles</button><button data-act="gmethod" data-v="B" class="${g.method === "B" ? "on" : ""}">Vêtement à plat</button></div></div>
      </div>
      ${sizeBanner}
      ${g.method === "B" ? `<div><label class="lbl">Style / aisance souhaitée</label><select data-bind="g.fit">${Object.entries(GEASE).map(([k, e]) => `<option value="${k}" ${g.fit === k ? "selected" : ""}>${e.l} (poitrine +${e.P} cm)</option>`).join("")}</select></div>` : ""}
      <div style="overflow-x:auto"><table class="mtable gtable"><thead><tr><th>Mesure (cm)</th><th>${g.selSize ? `Taille ${esc(g.selSize)} du patron` : g.method === "A" ? "Taille du patron" : "Vêtement / patron"}</th><th>Cible (${pr ? esc(pr.name) : "corps"})</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${toggleExtraBtn}
      ${["haut", "robe", "veste"].includes(g.type) && activeZones.some((x) => x.z === "P") ? `<label class="row small"><input type="checkbox" data-gfba="1" ${g.fba ? "checked" : ""} style="width:auto"> L'écart est seulement à la poitrine, les épaules vont bien (FBA)</label>` : ""}
      <div class="row wrap"><button class="btn primary" style="flex:2" data-act="gcalc">${ico("check", "ico")} Calculer les étapes pas-à-pas</button></div></div>
    ${res}</div>`;
}

// ---------------------------------------------------------------- actions & synchro profil
function gFillProfile() {
  const pr = S.profiles.find((x) => x.id === S.g.profId);
  const p = S.patterns.find((x) => x.id === S.g.pid);
  const sc = gEnsureHeaders(p?.sizeChart);
  if (pr) {
    S.g.target = {};
    for (const [z, info] of Object.entries(GZ)) {
      const v = pr.measurements?.[info.k];
      if (v != null) S.g.target[z] = v;
    }
    for (const item of gChartMeasureZones(p)) {
      const v = pr.measurements?.[item.k];
      if (v != null) S.g.target[item.z] = v;
    }
  }
  if (sc?.sizes?.length) {
    const best = gBestSize(sc.sizes, S.g.target, S.g.type) || sc.sizes[0];
    gApplySizeRow(best, sc);
  }
}

function gLoadPattern() {
  const p = S.patterns.find((x) => x.id === S.g.pid);
  if (!p) { S.g.selSize = ""; S.g.base = {}; return; }
  S.g.type = CAT2TYPE[p.category] || S.g.type;
  S.g.selSize = "";
  S.g.base = {};
  S.g.showAllMeasures = false;
  if (!S.g.profId && S.profiles.length === 1) S.g.profId = S.profiles[0].id;
  gFillProfile();
}

// Sauvegarde automatique des mesures cibles manquantes dans le profil (et confirmation si une valeur existante diffère)
async function gSyncToProfile() {
  const g = S.g, pr = S.profiles.find((x) => x.id === g.profId);
  if (!pr) return;
  const added = [], changed = [];
  const nextM = { ...(pr.measurements || {}) };
  for (const item of gActiveZones(g)) {
    const val = gn(g.target[item.z]);
    if (val == null || val <= 0) continue;
    const oldVal = gn(pr.measurements?.[item.k]);
    if (oldVal == null) {
      added.push({ k: item.k, val });
    } else if (Math.abs(oldVal - val) >= 0.1) {
      changed.push({ k: item.k, oldVal, val });
    }
  }
  if (!added.length && !changed.length) return;

  let applyChanged = false;
  if (changed.length) {
    const diffList = changed.map((c) => `• ${c.k} : ${c.oldVal} cm → ${c.val} cm`).join("\n");
    applyChanged = confirm(`Certaines mesures diffèrent de celles enregistrées sur le profil de « ${pr.name} » :\n\n${diffList}\n\nVoulez-vous mettre à jour le profil de ${pr.name} avec ces nouvelles valeurs ?`);
  }
  added.forEach((a) => { nextM[a.k] = a.val; });
  if (applyChanged) changed.forEach((c) => { nextM[c.k] = c.val; });

  if (added.length || applyChanged) {
    const updated = await api(`/api/profiles/${pr.id}`, { method: "PUT", json: { ...pr, measurements: nextM } });
    S.profiles = S.profiles.map((x) => (x.id === updated.id ? updated : x));
    const msgParts = [];
    if (added.length) msgParts.push(`${added.length} mesure(s) ajoutée(s)`);
    if (applyChanged) msgParts.push(`${changed.length} mesure(s) mise(s) à jour`);
    toast(`Profil de ${pr.name} sauvegardé (${msgParts.join(", ")}) ✓`);
  }
}

const DEFAULT_HEADERS = () => [
  { label: "Tour de Poitrine", code: "P" },
  { label: "Tour de Taille", code: "T" },
  { label: "Tour de Hanches", code: "H" },
  { label: "Quantité tissu", code: "TISSU" },
];

Object.assign(A, {
  gmethod: (d) => { S.g.method = d.v; S.g.out = null; render(); },
  gtoggleall: () => { S.g.showAllMeasures = !S.g.showAllMeasures; render(); },
  gselsize: (d) => {
    const p = S.patterns.find((x) => x.id === S.g.pid);
    const sc = gEnsureHeaders(p?.sizeChart);
    const row = sc?.sizes?.find((s) => s.taille === d.v);
    if (row) { gApplySizeRow(row, sc); S.g.out = null; render(); }
  },
  gopensc: () => {
    if (!S.g.pid) return;
    S.sel = S.g.pid; S.tab = "patterns"; render();
  },
  gcalc: guard(async () => {
    await gSyncToProfile();
    const p = S.patterns.find((x) => x.id === S.g.pid);
    const sc = gEnsureHeaders(p?.sizeChart);
    if (sc?.sizes?.length) {
      const best = gBestSize(sc.sizes, S.g.target, S.g.type);
      if (best && !S.g.selSize) gApplySizeRow(best, sc);
    }
    S.g.out = gSteps(S.g); S.g.ai = null; render();
    document.querySelector(".gstep, .mverdict")?.scrollIntoView({ behavior: "smooth" });
  }),
  gai: guard(async () => {
    const g = S.g, o = g.out; if (!o || o.warn) return;
    const lines = Object.entries(o.d).map(([z, v]) => `${gZoneInfo(z, g).k}: départ ${g.base[z]}, cible ${g.target[z]}, écart ${v}`).join("; ");
    const q = `Couture, gradation de patron (${GTYPES[g.type].l}, taille départ ${g.selSize || "?"}, ${g.method === "A" ? "tableau des tailles" : "mesures vêtement, aisance " + GEASE[g.fit].l}${g.fba ? ", FBA" : ""}). ${lines}. `
      + `Méthode prévue : ${o.st.map((s) => s.t).join(" > ")}. En 5 points maximum et en français, signale uniquement les risques ou corrections à prévoir.`;
    g.aiBusy = true; render();
    try { g.ai = (await api("/api/ai/think", { json: { query: q } })).text; } finally { g.aiBusy = false; render(); }
  }),
  gradefrom: () => { S.g.pid = S.sel; S.g.out = null; gLoadPattern(); S.tab = "grade"; S.sel = null; scrollTo(0, 0); render(); },
  // actions tableau des tailles dans le dossier du patron
  sccam: () => document.getElementById("sccam")?.click(),
  scimg: () => document.getElementById("scimg")?.click(),
  scedit: () => {
    const sc = gEnsureHeaders(sel()?.sizeChart);
    S.g.scDraft = sc && sc.headers?.length ? JSON.parse(JSON.stringify(sc)) : {
      imageUri: sc?.imageUri || null, type_mesures: "corps", headers: DEFAULT_HEADERS(),
      sizes: [{ taille: "S", values: ["", "", "", ""] }, { taille: "M", values: ["", "", "", ""] }, { taille: "L", values: ["", "", "", ""] }],
    };
    if (!S.g.scDraft.sizes.length) S.g.scDraft.sizes.push({ taille: "S", values: S.g.scDraft.headers.map(() => "") });
    S.g.scEditing = true; render();
  },
  sctype: (d) => { if (S.g.scDraft) { S.g.scDraft.type_mesures = d.v; render(); } },
  scaddrow: () => {
    const d = S.g.scDraft; if (!d) return;
    d.sizes.push({ taille: "", values: d.headers.map(() => "") }); render();
  },
  scrmrow: (d) => { S.g.scDraft?.sizes.splice(+d.i, 1); render(); },
  scaddcol: () => {
    const d = S.g.scDraft; if (!d) return;
    d.headers.push({ label: "Nouvelle ligne", code: "MESURE" });
    d.sizes.forEach((s) => (s.values ||= []).push(""));
    render();
  },
  scrmcol: (d) => {
    const dr = S.g.scDraft, c = +d.c; if (!dr) return;
    dr.headers.splice(c, 1);
    dr.sizes.forEach((s) => s.values?.splice(c, 1));
    render();
  },
  sccancel: () => { S.g.scEditing = false; S.g.scDraft = null; render(); },
  scsave: guard(async () => {
    const d = S.g.scDraft; if (!d) return;
    const clean = d.sizes.filter((s) => String(s.taille || "").trim());
    await api(`/api/patterns/${S.sel}/size-chart`, { method: "PUT", json: { ...d, sizes: clean } });
    S.g.scEditing = false; S.g.scDraft = null;
    await reloadPatterns(); toast("Tableau des tailles enregistré ✓"); render();
  }),
  previewurl: (d) => { S.previewUrl = d.url; render(); },
});

FILES.scscan = guard(async (files) => {
  S.g.scScanning = true; render();
  try {
    const f = await shrink(files[0], 2000);
    const chart = await api(`/api/patterns/${S.sel}/size-chart/scan`, { method: "POST", body: fd({ file: f }) });
    await reloadPatterns();
    S.g.scDraft = JSON.parse(JSON.stringify(gEnsureHeaders(chart)));
    if (!S.g.scDraft.sizes.length) S.g.scDraft.sizes.push({ taille: "S", values: S.g.scDraft.headers.map(() => "") });
    S.g.scEditing = true;
    toast(chart.sizes?.length ? `${chart.sizes.length} taille(s) lues sur la photo ✓` : "Photo enregistrée — complétez les tailles");
  } finally {
    S.g.scScanning = false; render();
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (!S.g.scDraft) return;
  if (t.dataset.sc) {
    const [idx, key] = t.dataset.sc.split(".");
    if (S.g.scDraft.sizes[+idx]) S.g.scDraft.sizes[+idx][key] = t.value;
  } else if (t.dataset.scv) {
    const [r, c] = t.dataset.scv.split(".");
    const row = S.g.scDraft.sizes[+r];
    if (row) { (row.values ||= [])[+c] = t.value; }
  } else if (t.dataset.sch) {
    const [c, key] = t.dataset.sch.split(".");
    if (S.g.scDraft.headers[+c]) S.g.scDraft.headers[+c][key] = t.value;
  }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.sch && S.g.scDraft) {
    const [c, key] = t.dataset.sch.split(".");
    if (S.g.scDraft.headers[+c]) S.g.scDraft.headers[+c][key] = t.value;
    return;
  }
  if (t.dataset.gfba) { S.g.fba = t.checked; return; }
  const k = t.dataset.gchange; if (!k) return;
  S.g.out = null;
  if (k === "pat") gLoadPattern(); else if (k === "prof") gFillProfile(); else gFillProfile();
  render();
});
