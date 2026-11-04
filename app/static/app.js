/* CoutureIA – interface (JS vanilla, aucun build nécessaire) */
"use strict";

// ---------- icônes (style Lucide) ----------
const P = {
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  plusc: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M21 5h-4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  sliders: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
};
const ico = (n, cls = "ico", sw = 2) =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${P[n] || ""}</svg>`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (t) => new Date(t).toLocaleDateString("fr-FR");

// ---------- état ----------
const S = {
  tab: "patterns", loading: true, needLogin: false,
  cfg: { sexes: [], defaultMeasurements: [], categories: [], categoryImages: {} },
  patterns: [], profiles: [],
  sel: null, editing: false, edit: null, addingNote: false, noteDraft: "", editNote: null, fabricIn: "", preview: null,
  f: { q: "", cat: null, sex: null, sub: null }, addingCat: false, catName: "",
  add: { step: "upload", imageUri: null, form: null, fabricIn: "", error: "" },
  prof: { id: null, editing: false, form: null, mName: "", mVal: "" },
  ai: { mode: "search", q: "", busy: false, out: null },
  installEvt: null,
};
const sel = () => S.patterns.find((p) => p.id === S.sel);

// ---------- API ----------
async function api(url, opts = {}) {
  if (opts.json !== undefined) {
    opts.method = opts.method || "POST";
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(opts.json);
  }
  const r = await fetch(url, opts);
  if (r.status === 401) { S.needLogin = true; render(); throw new Error("Code requis"); }
  if (!r.ok) {
    let m = r.statusText;
    try { m = (await r.json()).detail || m; } catch (_) {}
    throw new Error(m);
  }
  const out = await r.json();
  const method = (opts.method || "GET").toUpperCase();
  if (method !== "GET" && !/\/(ai|analyze|compare|receipt\/scan|sync|login|settings)/.test(url)) {
    if (typeof syncScheduleAutoPush === "function") syncScheduleAutoPush();
  }
  return out;
}
function toast(msg, err = false) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast" + (err ? " err" : "");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 3500);
}
const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); render(); } };

async function shrink(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return new File([blob], (file.name || "photo").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch (_) { return file; }
}
const fd = (o) => { const f = new FormData(); for (const k in o) if (o[k] != null) f.append(k, o[k]); return f; };

async function loadAll() {
  S.cfg = await api("/api/config");
  [S.patterns, S.profiles] = await Promise.all([api("/api/patterns"), api("/api/profiles")]);
  S.loading = false;
  if (!S.cfg.httpsUrl) {
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      try {
        const c = await api("/api/config");
        if (c.httpsUrl) { S.cfg.httpsUrl = c.httpsUrl; clearInterval(t); render(); }
      } catch (_) {}
      if (tries >= 10) clearInterval(t);
    }, 2000);
  }
}
const reloadPatterns = async () => { S.patterns = await api("/api/patterns"); };

function installBanner() {
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone || S.hideInstallBanner) return "";
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua), android = /android/i.test(ua);
  if (S.installEvt) {
    return `<div class="card pad row between wrap" style="margin-bottom:14px;background:var(--rose);color:#fff;border-color:var(--rose)">
      <div><b>📲 Installer CoutureIA sur cet appareil</b><div class="small" style="opacity:.9">Accès direct en plein écran depuis votre écran d'accueil</div></div>
      <div class="row"><button class="btn" style="background:#fff;color:var(--rose);font-weight:700;border:0" data-act="install">Installer l'application</button>
      <button class="icon-btn" style="color:#fff" data-act="hidebanner">${ico("x")}</button></div></div>`;
  }
  if ((android || ios) && location.protocol === "http:" && S.cfg.httpsUrl) {
    return `<div class="card pad row between wrap" style="margin-bottom:14px;background:var(--rose);color:#fff;border-color:var(--rose)">
      <div><b>📲 Pour installer l'application en 1 clic</b><div class="small" style="opacity:.9">Passez sur le lien sécurisé HTTPS</div></div>
      <a class="btn" style="background:#fff;color:var(--rose);font-weight:700;border:0" href="${esc(S.cfg.httpsUrl)}">Passer en HTTPS & Installer →</a></div>`;
  }
  return "";
}

// ---------- rendu ----------
const NAV = [["patterns", "Patrons", "scissors"], ["measurements", "Mesures", "ruler"], ["grade", "Ajuster", "sliders"], ["add", "Ajouter", "plusc"], ["merceries", "Merceries", "cart"], ["ai", "Assistant", "sparkles"], ["settings", "Réglages", "settings"]];

function render() {
  const app = document.getElementById("app");
  if (S.needLogin) { app.innerHTML = loginView(); return; }
  if (S.loading) { app.innerHTML = '<div class="center"><div class="spin"></div></div>'; return; }
  const y = window.scrollY;
  app.innerHTML = `<div class="layout">
    <nav><div class="brand">${ico("scissors", "ico", 2)} CoutureIA</div>
      ${NAV.map(([id, l, i]) => `<button data-act="tab" data-id="${id}" class="${S.tab === id ? "active" : ""}">${ico(i)}<span>${l}</span></button>`).join("")}
      <div class="ver">v2.0 • version Python</div></nav>
    <main>${installBanner()}${view()}</main></div>${S.preview || S.previewUrl ? previewModal() : ""}`;
  window.scrollTo(0, y);
}

function view() {
  switch (S.tab) {
    case "patterns": return S.sel && sel() ? detailView(sel()) : listView();
    case "measurements": return measuresView();
    case "grade": return gradeView();
    case "add": return addView();
    case "merceries": return merceriesView();
    case "ai": return aiView();
    case "settings": return settingsView();
  }
}

const loginView = () => `<div class="card login stack"><h1 style="color:var(--rose)">CoutureIA</h1>
  <p class="muted">Entrez le code d'accès</p><input id="code" type="password" placeholder="Code">
  <button class="btn primary block" data-act="login">Entrer</button></div>`;

// ----- liste des patrons -----
function filtered() {
  const { q, cat, sex, sub } = S.f;
  return S.patterns.filter((p) => {
    if (q) return (p.name + p.brand + p.subCategory).toLowerCase().includes(q.toLowerCase());
    return (!cat || p.category === cat) && (!sex || p.sex === sex) && (!sub || p.subCategory === sub);
  });
}
function patternGrid(items, title) {
  return `<div class="stack">${title ? `<h2 style="font-size:18px">${title}</h2>` : ""}<div class="grid">${
    items.length ? items.map((p) => `<div class="card pcard" data-act="open" data-id="${p.id}">
      <div class="pic">${p.imageUri ? `<img loading="lazy" src="${esc(p.imageUri)}" alt="">` : "✂️"}<span class="badge">${esc(p.category)}</span></div>
      <div class="meta"><h3>${esc(p.name)}</h3><div class="muted small" style="font-size:14px">${esc(p.brand)}</div></div></div>`).join("")
      : `<div class="empty">${ico("search", "ico")}<p>Aucun patron ne correspond.</p></div>`}</div></div>`;
}
function listView() {
  const { q, cat, sex, sub } = S.f;
  let body;
  if (q) body = patternGrid(filtered(), "Résultats de recherche");
  else if (!cat) {
    body = `<div class="stack"><h2 style="font-size:18px">Parcourir par catégorie</h2><div class="grid">
      ${S.cfg.categories.map((c) => {
        const img = S.cfg.categoryImages[c], n = S.patterns.filter((p) => p.category === c).length;
        return `<div style="position:relative"><button class="tile ${img ? "img" : ""}" data-act="cat" data-v="${esc(c)}">
          ${img ? `<img src="${esc(img)}" alt=""><div class="shade"></div>` : ""}
          <div class="in">${img ? "" : `<span class="round">${ico("scissors", "ico", 1.6)}</span><br>`}<b style="font-size:18px">${esc(c)}</b><div class="small" style="opacity:.7">${n} patrons</div></div></button>
          <button class="cam-btn" data-act="catimg" data-v="${esc(c)}" title="Modifier l'image">${ico("camera", "ico")}</button></div>`;
      }).join("")}
      ${S.addingCat
        ? `<div class="card pad" style="aspect-ratio:4/3;display:flex;flex-direction:column;justify-content:space-between;border-color:var(--rose-200)">
            <div><label class="lbl">Nom</label><input data-bind="catName" value="${esc(S.catName)}"></div>
            <div class="row"><button class="btn" style="flex:1" data-act="catcancel">Annuler</button><button class="btn primary" style="flex:1" data-act="catcreate">Créer</button></div></div>`
        : `<button class="tile dashed" data-act="catnew">${ico("plus", "ico", 2)}<b>Nouvelle catégorie</b></button>`}
    </div></div><input type="file" id="catfile" accept="image/*" class="hidden" data-file="catimg">`;
  } else {
    const subs = [...new Set(S.patterns.filter((p) => p.category === cat && (!sex || p.sex === sex)).map((p) => p.subCategory).filter(Boolean))].sort();
    const items = filtered();
    body = `<div class="stack"><div class="card pad stack">
      <div class="row between wrap"><h2>${esc(cat)} <span class="chip">${items.length}</span></h2>
        <div class="seg"><button data-act="sex" data-v="" class="${!sex ? "on" : ""}">Tous</button>${S.cfg.sexes.map((s) => `<button data-act="sex" data-v="${s}" class="${sex === s ? "on" : ""}">${s}</button>`).join("")}</div></div>
      ${subs.length ? `<div class="row wrap" style="border-top:1px solid var(--s100);padding-top:10px"><span class="lbl" style="margin:0 6px 0 0">Sous-catégories</span>
        <button class="chip dark ${!sub ? "on" : ""}" data-act="sub" data-v="">Tout</button>
        ${subs.map((s) => `<button class="chip ${sub === s ? "on" : ""}" data-act="sub" data-v="${esc(s)}">${esc(s)}</button>`).join("")}</div>` : ""}
      </div>${patternGrid(items)}</div>`;
  }
  const crumbs = !q && (cat || sex) ? `<div class="crumbs"><button data-act="home" class="row" style="gap:4px">${ico("home", "ico")} Accueil</button>
    ${cat ? `${ico("chev", "ico")}<button data-act="cat" data-v="${esc(cat)}" ${!sex && !sub ? 'style="font-weight:700;color:var(--s800)"' : ""}>${esc(cat)}</button>` : ""}
    ${sex ? `${ico("chev", "ico")}<span>${sex}</span>` : ""}${sub ? `${ico("chev", "ico")}<b style="color:var(--s800)">${esc(sub)}</b>` : ""}</div>` : "";
  const back = !q && cat ? `<button class="row" style="color:var(--rose);font-weight:500;margin-top:10px" data-act="home">${ico("back", "ico")} Retour aux catégories</button>` : "";
  return `<div class="sticky"><div style="position:relative">
    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--s400)">${ico("search")}</span>
    <input data-bind="f.q" data-rerender="1" value="${esc(q)}" placeholder="Rechercher..." style="padding-left:42px;border-radius:12px"></div>${crumbs}${back}</div>${body}`;
}

// ----- détail d'un patron -----
function fabricsEditor(list, rm, add, valKey) {
  return `<div class="row wrap" style="gap:6px;margin-bottom:8px">${(list || []).map((f, i) => `<span class="tag">${esc(f)}<button data-act="${rm}" data-i="${i}">${ico("x", "ico", 2)}</button></span>`).join("")}</div>
    <div class="row"><input data-bind="${valKey}" value="${esc(valKey.split(".").reduce((o, k) => o[k], S))}" placeholder="Ajouter (ex: Lin)" data-enter="${add}">
    <button class="btn" data-act="${add}">${ico("plus", "ico")}</button></div>`;
}
function detailView(p) {
  const e = S.edit;
  const side = S.editing
    ? `<div class="stack">
      <div><label class="lbl">Nom</label><input data-bind="edit.name" value="${esc(e.name)}"></div>
      <div><label class="lbl">Marque</label><input data-bind="edit.brand" value="${esc(e.brand)}"></div>
      <div class="grid2"><div><label class="lbl">Catégorie</label><select data-bind="edit.category">${S.cfg.categories.map((c) => `<option ${c === e.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
        <div><label class="lbl">Genre</label><select data-bind="edit.sex">${S.cfg.sexes.map((c) => `<option ${c === e.sex ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
      <div><label class="lbl">Sous-catégorie</label><input data-bind="edit.subCategory" value="${esc(e.subCategory)}"></div>
      <div><label class="lbl">Tissus conseillés</label>${fabricsEditor(e.fabricSuggestions, "rmfab", "addfab", "fabricIn")}</div>
      <div><label class="lbl">Notes / Description</label><textarea rows="3" data-bind="edit.notes">${esc(e.notes)}</textarea></div></div>`
    : `${p.imageUri ? `<div class="cover"><img src="${esc(p.imageUri)}" alt=""></div>` : ""}<div class="stack">
      <div><div class="lbl">Catégorie</div>${esc(p.category)} › ${esc(p.subCategory)}</div>
      <div><div class="lbl">Genre • Difficulté</div>${esc(p.sex)}${p.difficulty ? " • " + esc(p.difficulty) : ""}</div>
      <div><div class="lbl">Ajouté le</div>${fmtDate(p.createdAt)}</div>
      ${p.notes ? `<div class="card pad muted" style="font-style:italic;font-size:14px">« ${esc(p.notes)} »</div>` : ""}
      ${(p.fabricSuggestions || []).length ? `<div><div class="lbl">Tissus conseillés</div><div class="row wrap" style="gap:6px">${p.fabricSuggestions.map((f) => `<span class="tag plain">${esc(f)}</span>`).join("")}</div></div>` : ""}</div>`;
  const resIcon = { pdf: "file", image: "image", note: "note" };
  const res = (p.resources || []).map((r) => `<div class="card res"><div class="row between">
      <span style="color:${r.type === "note" ? "var(--amber)" : "var(--rose)"}">${ico(resIcon[r.type] || "file", "ico", 1.8)}</span>
      <div class="row" style="gap:0">${r.type === "note" ? `<button class="icon-btn" data-act="editnote" data-id="${r.id}">${ico("edit")}</button>` : ""}
      <button class="icon-btn danger" data-act="delres" data-id="${r.id}">${ico("x")}</button></div></div>
    ${S.editNote === r.id
      ? `<textarea rows="4" data-bind="noteDraft">${esc(S.noteDraft)}</textarea><div class="row"><button class="btn note" style="flex:1" data-act="savenote">Sauver</button><button class="btn" style="flex:1" data-act="cancelnote">Annuler</button></div>`
      : `<b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</b><span class="muted small">${fmtDate(r.createdAt)}</span>
        ${r.type === "note" ? `<div class="noteTxt">${esc(r.content)}</div>`
          : r.type === "image" ? `<div class="thumb" data-act="preview" data-id="${r.id}"><img loading="lazy" src="${esc(r.content)}" alt=""></div>`
          : `<button class="btn" data-act="preview" data-id="${r.id}">${ico("expand", "ico")} Ouvrir le PDF</button>`}
        ${r.type !== "note" ? `<a class="btn" href="${esc(r.content)}" download="${esc(r.name)}">${ico("dl", "ico")} Télécharger</a>` : ""}`}
    </div>`).join("");
  return `<div class="card detail">
    <div class="head"><div class="row"><button class="icon-btn" data-act="closedetail">${ico("back")}</button>
      ${S.editing ? "<h2>Édition du patron</h2>" : `<div><h1 style="font-size:20px">${esc(p.name)}</h1><div class="muted small">${esc(p.brand)}</div></div>`}</div>
      <div class="row">${S.editing ? `<button class="btn primary" data-act="saveedit">${ico("check", "ico")} Enregistrer</button>`
        : `<button class="btn" data-act="gradefrom" title="Ajuster à une taille">${ico("sliders", "ico")} Ajuster</button><button class="icon-btn" data-act="startedit">${ico("edit")}</button><button class="icon-btn danger" data-act="delpattern">${ico("trash")}</button>`}</div></div>
    <div class="body"><div class="side">${side}</div>
      <div style="flex:1"><div class="row between wrap pad" style="border-bottom:1px solid var(--s200);background:#fff"><h2 style="font-size:17px">Dossier du projet</h2>
        <div class="row"><button class="btn note" data-act="newnote">${ico("note", "ico")} Note</button>
        <button class="btn" data-act="addfile">${ico("plus", "ico")} Fichier</button>
        <input type="file" id="resfile" class="hidden" multiple accept="image/*,application/pdf" data-file="resfile"></div></div>
      <div class="pad">${sizeChartBox(p)}${S.addingNote ? `<div class="card pad stack" style="background:var(--amber-50);border-color:var(--amber-200);margin-bottom:16px">
        <textarea rows="4" data-bind="noteDraft" placeholder="Écrivez votre note...">${esc(S.noteDraft)}</textarea>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cancelnote">Annuler</button><button class="btn note" data-act="addnote">Ajouter</button></div></div>` : ""}
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${res || '<div class="empty">Aucun document. Ajoutez des notes, photos ou PDF.</div>'}</div></div></div></div></div>`;
}
function previewModal() {
  if (S.previewUrl) {
    return `<div class="modal"><button class="x" data-act="closepreview">${ico("x")}</button><img src="${esc(S.previewUrl)}" alt=""></div>`;
  }
  const r = (sel()?.resources || []).find((x) => x.id === S.preview);
  if (!r) return "";
  return `<div class="modal"><button class="x" data-act="closepreview">${ico("x")}</button>
    ${r.type === "image" ? `<img src="${esc(r.content)}" alt="">` : `<iframe src="${esc(r.content)}" title="${esc(r.name)}"></iframe>`}</div>`;
}

// ----- mesures -----
function measuresView() {
  const pr = S.prof, cur = S.profiles.find((x) => x.id === pr.id), f = pr.form;
  const defs = S.cfg.defaultMeasurements;
  const custom = f ? Object.keys(f.measurements).filter((k) => !defs.includes(k)) : [];
  const field = (k, removable) => `<div><label class="lbl" style="text-transform:none;font-size:13px;font-weight:400;display:flex;justify-content:space-between">${esc(k)} (cm)
      ${removable && pr.editing ? `<button data-act="rmmeasure" data-k="${esc(k)}">${ico("x", "ico", 2)}</button>` : ""}</label>
      <input type="number" inputmode="decimal" step="0.1" ${pr.editing ? "" : "disabled"} data-mkey="${esc(k)}" value="${f.measurements[k] ?? ""}"></div>`;
  return `<div class="profiles">
    <div class="card" style="overflow:hidden"><div class="row between pad" style="background:var(--s50);border-bottom:1px solid var(--s100)"><h2 style="font-size:17px">Profils</h2>
      <button class="icon-btn" data-act="newprofile">${ico("plus")}</button></div>
      <div style="padding:8px">${S.profiles.map((x) => `<div class="plist-item ${pr.id === x.id ? "on" : ""}" data-act="selprofile" data-id="${x.id}">
        <div class="avatar">${ico("user")}</div><div style="flex:1"><b>${esc(x.name)}</b><div class="muted small">${Object.keys(x.measurements || {}).length} mesures</div></div>${ico("chev", "ico")}</div>`).join("")
        || '<p class="muted pad" style="text-align:center">Créez votre premier profil de mesures.</p>'}</div></div>
    <div class="card">${f ? `<div class="row between pad" style="background:var(--s50);border-bottom:1px solid var(--s100);border-radius:14px 14px 0 0">
        <input class="title-input" data-bind="prof.form.name" ${pr.editing ? "" : "disabled"} value="${esc(f.name)}" style="flex:1">
        <div class="row">${pr.editing ? `<button class="btn primary" data-act="saveprofile">${ico("save", "ico")} Enregistrer</button>`
          : `<button class="icon-btn danger" data-act="delprofile">${ico("trash")}</button><button class="btn dark" data-act="editprofile">Modifier</button>`}</div></div>
      <div class="pad"><div class="grid2">${defs.map((k) => field(k)).join("")}${custom.map((k) => field(k, true)).join("")}</div>
        ${pr.editing ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--s100)"><b style="font-size:14px">Ajouter une mesure personnalisée</b>
          <div class="row" style="margin-top:10px"><input data-bind="prof.mName" placeholder="Nom (ex: Longueur dos)" value="${esc(pr.mName)}">
          <input type="number" inputmode="decimal" data-bind="prof.mVal" placeholder="cm" value="${esc(pr.mVal)}" style="width:96px">
          <button class="btn dark" data-act="addmeasure">${ico("plus", "ico")}</button></div></div>` : ""}</div>`
      : `<div class="center muted" style="min-height:300px">${ico("ruler", "ico", 1)}<p>Sélectionnez un profil pour voir les mesures.</p></div>`}</div></div>`;
}

// ----- ajout (analyse IA) -----
function addView() {
  const a = S.add, f = a.form;
  if (a.step === "upload") return `<div class="center stack"><div><h2 style="font-size:26px">Ajouter un patron</h2>
    <p class="muted">L'IA remplira automatiquement les détails à partir de la photo de la pochette.</p></div>
    <div class="grid2" style="width:100%;max-width:440px">
      <button class="bigdrop" data-act="pickcam">${ico("camera")}<span>Prendre une photo</span></button>
      <button class="bigdrop grey" data-act="pickimg">${ico("upload")}<span>Importer une image</span></button></div>
    <input type="file" id="camfile" accept="image/*" capture="environment" class="hidden" data-file="analyze">
    <input type="file" id="imgfile" accept="image/*" class="hidden" data-file="analyze">
    <button class="muted" data-act="cancelAdd">Annuler</button></div>`;
  if (a.step === "analyzing") return `<div class="center"><div class="spin"></div><h2 style="font-size:20px;color:var(--s600)">Analyse Gemini en cours...</h2></div>`;
  return `<div style="max-width:760px;margin:0 auto"><div class="row between" style="margin-bottom:16px"><h2>Vérifier les informations</h2><button class="icon-btn" data-act="cancelAdd">${ico("x")}</button></div>
    ${a.error ? `<div class="card pad" style="background:var(--amber-50);border-color:var(--amber-200);margin-bottom:14px;font-size:14px">⚠️ ${esc(a.error)} Remplissez les champs à la main.</div>` : ""}
    <div class="grid2"><div style="position:relative"><div class="card" style="aspect-ratio:3/4;overflow:hidden"><img src="${esc(a.imageUri)}" style="width:100%;height:100%;object-fit:cover" alt=""></div>
      <button class="cam-btn" style="top:auto;bottom:8px;background:rgba(0,0,0,.55);color:#fff" data-act="resetAdd">${ico("refresh", "ico")}</button></div>
    <div class="stack"><div><label class="lbl">Nom</label><input data-bind="add.form.name" value="${esc(f.name)}"></div>
      <div><label class="lbl">Marque</label><input data-bind="add.form.brand" value="${esc(f.brand)}"></div>
      <div class="grid2"><div><label class="lbl">Catégorie</label><select data-bind="add.form.category">${S.cfg.categories.map((c) => `<option ${c === f.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
        <div><label class="lbl">Genre</label><select data-bind="add.form.sex">${S.cfg.sexes.map((c) => `<option ${c === f.sex ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
      <div><label class="lbl">Sous-catégorie</label><input data-bind="add.form.subCategory" value="${esc(f.subCategory)}"></div>
      <div><label class="lbl">Tissus conseillés</label>${fabricsEditor(f.fabricSuggestions, "rmfabadd", "addfabadd", "add.fabricIn")}</div>
      <div><label class="lbl">Description</label><textarea rows="3" data-bind="add.form.notes">${esc(f.notes)}</textarea></div>
      <button class="btn primary block" data-act="savepattern">${ico("check", "ico")} Enregistrer</button></div></div></div>`;
}

// ----- assistant IA -----
function aiView() {
  const a = S.ai, modes = [["search", "Recherche web"], ["think", "Question complexe"], ["sketch", "Croquis"]];
  const ph = { search: "Ex : quel tissu choisir pour une jupe plissée ?", think: "Ex : comment adapter ce patron à ma morphologie ?", sketch: "Ex : robe portefeuille longue, manches ballon" };
  let out = "";
  if (a.busy) out = '<div class="center" style="min-height:160px"><div class="spin"></div></div>';
  else if (a.out) {
    if (a.out.image) out = `<img src="${a.out.image}" style="max-width:100%;border-radius:12px" alt="Croquis">`;
    else out = `<div class="chat">${esc(a.out.text)}</div>${(a.out.sources || []).length ? `<div style="margin-top:12px"><div class="lbl">Sources</div>${a.out.sources.map((s) => `<div><a href="${esc(s.uri)}" target="_blank" rel="noopener" style="color:var(--rose)">${esc(s.title || s.uri)}</a></div>`).join("")}</div>` : ""}`;
  }
  return `<div style="max-width:760px;margin:0 auto" class="stack"><h2 style="font-size:24px">Assistant couture</h2>
    <div class="tabs">${modes.map(([id, l]) => `<button class="chip ${a.mode === id ? "on" : ""}" data-act="aimode" data-id="${id}">${l}</button>`).join("")}</div>
    <textarea rows="3" data-bind="ai.q" placeholder="${ph[a.mode]}">${esc(a.q)}</textarea>
    <button class="btn primary block" data-act="askai" ${a.busy ? "disabled" : ""}>${ico("sparkles", "ico")} Envoyer</button>
    ${out ? `<div class="card pad">${out}</div>` : ""}</div>`;
}

// ----- réglages / sauvegarde / installation -----
function settingsView() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua), android = /android/i.test(ua);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const httpsUrl = S.cfg.httpsUrl;
  const lan = S.cfg.lanUrl;
  const shareUrl = httpsUrl || lan;
  const qrBox = shareUrl ? `<div class="card pad row between wrap" style="background:var(--rose-50);border-color:var(--rose-200)">
    <div style="flex:1;min-width:200px">
      <b style="color:#be123c">${httpsUrl ? "🔒 Lien sécurisé HTTPS (Installation en 1 clic sur Android & iPhone)" : "⏳ Création du lien HTTPS sécurisé en cours…"}</b>
      <p class="small" style="margin:6px 0">${httpsUrl ? "Scannez ce QR Code avec l'appareil photo du téléphone : un bouton rose <b>« Installer l'application »</b> s'affichera directement en haut de l'écran !" : "En attendant, vous pouvez utiliser l'adresse Wi-Fi locale :"}</p>
      <div style="font-size:15px;font-weight:700;font-family:monospace;background:#fff;padding:8px 12px;border-radius:8px;display:inline-block;border:1px solid var(--rose-200);word-break:break-all">${esc(shareUrl)}</div>
    </div>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(shareUrl)}" alt="QR Code" style="width:130px;height:130px;border-radius:10px;border:1px solid var(--rose-200);background:#fff;padding:4px">
  </div>` : "";
  const install = standalone ? '<div class="mverdict good">✅ <b>L\'application est installée</b> sur cet appareil.</div>'
    : S.installEvt ? `<button class="btn primary block" style="font-size:16px;padding:14px" data-act="install">📲 Installer l'application maintenant (1 clic)</button>`
    : (android || ios) && location.protocol === "http:" && httpsUrl
      ? `<a class="btn primary block" style="font-size:16px;padding:14px" href="${esc(httpsUrl)}">🔒 Ouvrir la version HTTPS pour débloquer le bouton « Installer »</a>`
    : ios ? `<div class="card pad" style="background:var(--s50)"><b style="display:block;margin-bottom:6px">🍎 Sur l'iPhone de votre mère (2 touches dans Safari) :</b><ol style="margin-left:18px;line-height:1.8"><li>Touchez l'icône <b>Partager</b> en bas de Safari (le carré avec une flèche vers le haut ⬆️)</li><li>Touchez <b>« Sur l'écran d'accueil »</b> puis <b>Ajouter</b></li></ol></div>`
    : `<p class="muted small">Sur Android : en ouvrant le QR Code HTTPS ci-dessus dans Chrome, le gros bouton rose <b>« Installer l'application »</b> apparaît automatiquement en haut de l'écran.</p>`;
  return `<div style="max-width:700px;margin:0 auto" class="stack"><h2 style="font-size:24px">Réglages</h2>
    ${typeof cloudSyncCard === "function" ? cloudSyncCard() : ""}
    <div class="card pad stack"><h3>📲 Installer l'application sur téléphone</h3>${qrBox}${install}</div>
    <div class="card pad stack"><h3>Clé API Gemini</h3>
      <p class="muted small">${S.cfg.hasApiKey ? "✅ Une clé est déjà enregistrée." : "Aucune clé enregistrée."} Obtenez-en une gratuitement sur aistudio.google.com.</p>
      <input type="password" id="gkey" placeholder="Coller la clé ici" autocomplete="off">
      <button class="btn dark" data-act="savekey">Enregistrer la clé</button></div>
    <div class="card pad stack"><h3>Sauvegarde</h3>
      <p class="muted small">${S.patterns.length} patrons • ${S.profiles.length} profils. Le fichier contient aussi toutes les images et PDF.</p>
      <div class="row wrap"><a class="btn primary" href="/api/backup" download>${ico("dl", "ico")} Télécharger la sauvegarde</a>
      <button class="btn" data-act="pickrestore">${ico("upload", "ico")} Restaurer</button></div>
      <input type="file" id="restorefile" accept=".zip" class="hidden" data-file="restore"></div></div>`;
}

// ---------- actions ----------
const A = {
  tab: (d) => { S.tab = d.id; if (d.id !== "patterns") S.sel = null; if (d.id === "add") S.add = { step: "upload", imageUri: null, form: null, fabricIn: "", error: "" }; if (d.id === "merceries") M_open(); render(); },
  login: guard(async () => { await api("/api/login", { json: { code: document.getElementById("code").value } }); S.needLogin = false; await loadAll(); render(); }),
  // liste
  open: (d) => { S.sel = d.id; S.editing = false; S.addingNote = false; S.editNote = null; S.g.scEditing = false; scrollTo(0, 0); render(); },
  cat: (d) => { S.f.cat = d.v; S.f.sex = null; S.f.sub = null; render(); },
  sex: (d) => { S.f.sex = d.v || null; S.f.sub = null; render(); },
  sub: (d) => { S.f.sub = d.v || null; render(); },
  home: () => { S.f = { q: "", cat: null, sex: null, sub: null }; render(); },
  catnew: () => { S.addingCat = true; render(); },
  catcancel: () => { S.addingCat = false; render(); },
  catcreate: guard(async () => { const n = S.catName.trim(); if (n) S.cfg.categories = await api("/api/categories", { json: { name: n } }); S.catName = ""; S.addingCat = false; render(); }),
  catimg: (d) => { A._cat = d.v; document.getElementById("catfile").click(); },
  // détail
  closedetail: () => { S.sel = null; render(); },
  startedit: () => { S.edit = JSON.parse(JSON.stringify(sel())); S.editing = true; render(); },
  saveedit: guard(async () => { const u = await api(`/api/patterns/${S.sel}`, { method: "PUT", json: S.edit }); S.patterns = S.patterns.map((p) => (p.id === u.id ? u : p)); S.editing = false; render(); }),
  delpattern: guard(async () => { if (!confirm("Supprimer ce patron et tout son dossier ?")) return; await api(`/api/patterns/${S.sel}`, { method: "DELETE" }); S.patterns = S.patterns.filter((p) => p.id !== S.sel); S.sel = null; render(); }),
  addfab: () => { const v = S.fabricIn.trim(); if (v && !(S.edit.fabricSuggestions ||= []).includes(v)) S.edit.fabricSuggestions.push(v); S.fabricIn = ""; render(); },
  rmfab: (d) => { S.edit.fabricSuggestions.splice(+d.i, 1); render(); },
  newnote: () => { S.addingNote = true; S.noteDraft = ""; render(); },
  cancelnote: () => { S.addingNote = false; S.editNote = null; render(); },
  addnote: guard(async () => { if (!S.noteDraft.trim()) return; await api(`/api/patterns/${S.sel}/resources`, { method: "POST", body: fd({ type: "note", name: "Note du " + new Date().toLocaleDateString("fr-FR"), content: S.noteDraft }) }); S.addingNote = false; await reloadPatterns(); render(); }),
  editnote: (d) => { S.editNote = d.id; S.noteDraft = sel().resources.find((r) => r.id === d.id).content; render(); },
  savenote: guard(async () => { await api(`/api/patterns/${S.sel}/resources/${S.editNote}`, { method: "PUT", json: { content: S.noteDraft } }); S.editNote = null; await reloadPatterns(); render(); }),
  delres: guard(async (d) => { if (!confirm("Supprimer ce document ?")) return; await api(`/api/patterns/${S.sel}/resources/${d.id}`, { method: "DELETE" }); await reloadPatterns(); render(); }),
  addfile: () => document.getElementById("resfile").click(),
  preview: (d) => { S.preview = d.id; render(); },
  closepreview: () => { S.preview = null; S.previewUrl = null; render(); },
  // mesures
  newprofile: () => { S.prof = { id: "new", editing: true, form: { name: "Nouveau profil", measurements: {} }, mName: "", mVal: "" }; render(); },
  selprofile: (d) => { const p = S.profiles.find((x) => x.id === d.id); S.prof = { id: p.id, editing: false, form: JSON.parse(JSON.stringify(p)), mName: "", mVal: "" }; render(); },
  editprofile: () => { S.prof.editing = true; render(); },
  saveprofile: guard(async () => {
    const f = S.prof.form, isNew = S.prof.id === "new";
    const u = isNew ? await api("/api/profiles", { json: f }) : await api(`/api/profiles/${f.id}`, { method: "PUT", json: f });
    S.profiles = await api("/api/profiles"); S.prof = { id: u.id, editing: false, form: u, mName: "", mVal: "" }; render();
  }),
  delprofile: guard(async () => { if (!confirm("Supprimer ce profil ?")) return; await api(`/api/profiles/${S.prof.id}`, { method: "DELETE" }); S.profiles = await api("/api/profiles"); S.prof = { id: null, editing: false, form: null, mName: "", mVal: "" }; render(); }),
  addmeasure: () => { const n = S.prof.mName.trim(), v = parseFloat(S.prof.mVal); if (n && !isNaN(v)) S.prof.form.measurements[n] = v; S.prof.mName = ""; S.prof.mVal = ""; render(); },
  rmmeasure: (d) => { delete S.prof.form.measurements[d.k]; render(); },
  // ajout
  pickcam: () => document.getElementById("camfile").click(),
  pickimg: () => document.getElementById("imgfile").click(),
  cancelAdd: () => { S.tab = "patterns"; render(); },
  resetAdd: () => { S.add.step = "upload"; render(); },
  addfabadd: () => { const v = S.add.fabricIn.trim(); const l = (S.add.form.fabricSuggestions ||= []); if (v && !l.includes(v)) l.push(v); S.add.fabricIn = ""; render(); },
  rmfabadd: (d) => { S.add.form.fabricSuggestions.splice(+d.i, 1); render(); },
  savepattern: guard(async () => {
    const body = { ...S.add.form, imageUri: S.add.imageUri };
    const p = await api("/api/patterns", { json: body });
    S.patterns.unshift(p); S.tab = "patterns"; toast("Patron enregistré ✓"); render();
  }),
  // IA
  aimode: (d) => { S.ai.mode = d.id; S.ai.out = null; render(); },
  askai: guard(async () => {
    const a = S.ai; if (!a.q.trim()) return;
    a.busy = true; a.out = null; render();
    try {
      if (a.mode === "search") a.out = await api("/api/ai/search", { json: { query: a.q } });
      else if (a.mode === "think") a.out = await api("/api/ai/think", { json: { query: a.q } });
      else { const r = await api("/api/ai/sketch", { json: { prompt: a.q } }); a.out = r.image ? r : { text: "Aucune image générée." }; }
    } finally { a.busy = false; render(); }
  }),
  // réglages
  install: async () => { if (!S.installEvt) return; S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; render(); },
  hidebanner: () => { S.hideInstallBanner = true; render(); },
  savekey: guard(async () => { const k = document.getElementById("gkey").value; await api("/api/settings", { method: "PUT", json: { geminiKey: k } }); S.cfg.hasApiKey = true; toast("Clé enregistrée ✓"); render(); }),
  pickrestore: () => document.getElementById("restorefile").click(),
};

const FILES = {
  catimg: guard(async (files) => {
    const f = await shrink(files[0], 1000);
    S.cfg.categoryImages = await api("/api/categories/image", { method: "POST", body: fd({ category: A._cat, file: f }) }); render();
  }),
  resfile: guard(async (files) => {
    for (const f of files) { const up = f.type.includes("pdf") ? f : await shrink(f); await api(`/api/patterns/${S.sel}/resources`, { method: "POST", body: fd({ type: "image", file: up }) }); }
    await reloadPatterns(); render(); toast("Fichier(s) ajouté(s) ✓");
  }),
  analyze: async (files) => {
    S.add.step = "analyzing"; render();
    const f = await shrink(files[0]);
    const blank = { name: "", brand: "", category: S.cfg.categories[0], subCategory: "", sex: "Femme", notes: "", fabricSuggestions: [], difficulty: "Intermédiaire" };
    try {
      const r = await api("/api/analyze", { method: "POST", body: fd({ file: f }) });
      const an = r.analysis || {};
      S.add.imageUri = r.imageUri; S.add.error = r.error || "";
      S.add.form = { ...blank, ...an,
        category: S.cfg.categories.find((c) => c.toLowerCase() === (an.category || "").toLowerCase()) || an.category || blank.category,
        sex: S.cfg.sexes.includes(an.sex) ? an.sex : "Autre", fabricSuggestions: an.fabricSuggestions || [] };
    } catch (e) { S.add.imageUri = null; S.add.form = blank; S.add.error = e.message; }
    S.add.step = "review"; render();
  },
  restore: guard(async (files) => { if (!confirm("Restaurer cette sauvegarde ? Les données existantes seront fusionnées.")) return; await api("/api/restore", { method: "POST", body: fd({ file: files[0] }) }); await loadAll(); toast("Sauvegarde restaurée ✓"); render(); }),
};

// ---------- événements ----------
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "A") return;
  const fn = A[el.dataset.act];
  if (fn) fn(el.dataset, e);
});
function setPath(path, v) {
  const k = path.split("."); let o = S;
  while (k.length > 1) o = o[k.shift()];
  o[k[0]] = v;
}
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.bind) { setPath(t.dataset.bind, t.value); if (t.dataset.rerender) { render(); const n = document.querySelector(`[data-bind="${t.dataset.bind}"]`); n?.focus(); n?.setSelectionRange(t.value.length, t.value.length); } }
  else if (t.dataset.mkey) { const v = parseFloat(t.value); if (isNaN(v)) delete S.prof.form.measurements[t.dataset.mkey]; else S.prof.form.measurements[t.dataset.mkey] = v; }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.bind && t.tagName === "SELECT") setPath(t.dataset.bind, t.value);
  if (t.dataset.file && t.files.length) { const fn = FILES[t.dataset.file]; const files = [...t.files]; t.value = ""; fn(files); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.dataset.enter) { e.preventDefault(); A[e.target.dataset.enter](); }
  else if (e.key === "Enter" && e.target.dataset.bind === "catName") A.catcreate();
});
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); S.installEvt = e; render(); });

// ---------- démarrage ----------
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
(async () => {
  render();
  try { await loadAll(); } catch (e) { if (!S.needLogin) toast(e.message, true); }
  render();
})();
