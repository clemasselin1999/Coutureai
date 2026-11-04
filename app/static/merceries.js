/* CoutureIA – page Merceries : tickets, résumé de la base de prix, liste de courses & comparateur */
"use strict";

S.m = { sub: "resume", data: null, busy: false, draft: null, scanning: false,
        list: [], cmp: null, dep: "0", pick: "", qty: "1", cat: "", newProd: "" };

const eur = (v) => (v == null || isNaN(v) ? "–" : Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }));
const stName = (id) => S.m.data?.stores.find((s) => s.id === id)?.nom || S.m.cmp?.stores?.[id]?.nom || id;

async function M_load() {
  const [data, list] = await Promise.all([api("/api/merceries/summary"), api("/api/merceries/list")]);
  S.m.data = data; S.m.list = list;
  await M_compare();
}
function M_open() { if (!S.m.data) M_load().then(render).catch((e) => toast(e.message, true)); }
async function M_compare() {
  S.m.cmp = S.m.list.length ? await api("/api/merceries/compare", { json: { items: S.m.list, deplacement: parseFloat(S.m.dep) || 0 } }) : null;
}
async function M_saveList() { await api("/api/merceries/list", { method: "PUT", json: S.m.list }); await M_compare(); }

// ---------------------------------------------------------------- vues
function merceriesView() {
  const m = S.m;
  if (!m.data) return '<div class="center"><div class="spin"></div></div>';
  const tabs = [["resume", "Résumé", "chart"], ["ticket", "Ajouter un ticket", "receipt"], ["courses", "Liste de courses", "cart"]];
  const body = m.sub === "ticket" ? mTicketView() : m.sub === "courses" ? mCoursesView() : mResumeView();
  return `<div class="stack" style="max-width:1000px;margin:0 auto">
    <h2 style="font-size:24px">Merceries</h2>
    <div class="tabs">${tabs.map(([id, l, i]) => `<button class="chip ${m.sub === id ? "on" : ""}" data-act="msub" data-id="${id}">${ico(i, "ico")} ${l}</button>`).join("")}</div>
    ${body}</div>`;
}

// ----- résumé de la base -----
function mResumeView() {
  const d = S.m.data, st = d.stats;
  const stat = (v, l) => `<div class="card pad mstat"><b>${v}</b><span class="muted small">${l}</span></div>`;
  const stores = d.stores.map((s, i) => `<tr>
      <td><b>${esc(s.nom)}</b><div class="muted small">${s.sites.map((x) => esc(x.secteur)).filter(Boolean).join(", ")}</div></td>
      <td>${s.indice_prix == null ? '<span class="muted">–</span>' : `<span class="mbadge ${i === 0 ? "good" : s.indice_prix > 130 ? "bad" : ""}">${s.indice_prix}</span>`}</td>
      <td>${s.nb_produits}</td><td>${s.nb_tickets}</td><td>${s.depense ? eur(s.depense) : "–"}</td></tr>`).join("");
  const cats = [...new Set(d.products.map((p) => p.categorie))];
  const cat = S.m.cat || "";
  const prods = d.products.filter((p) => !cat || p.categorie === cat).map((p) => {
    const cells = Object.entries(p.prix).sort((a, b) => a[1].prix - b[1].prix).map(([sid, ep]) =>
      `<span class="mprice ${p.meilleur?.store_id === sid ? "best" : ""}" title="${ep.source === "ticket" ? "Relevé sur ticket le " + esc(ep.date) : "Estimation (fourchette " + eur(ep.min) + " – " + eur(ep.max) + ")"}">
        ${esc(stName(sid))} <b>${eur(ep.prix)}</b>${ep.source === "ticket" ? " 🧾" : ""}</span>`).join("");
    return `<div class="mprod"><div><b>${esc(p.nom)}</b> <span class="muted small">/ ${esc(p.unite)}</span></div>
      <div class="row wrap" style="gap:6px;margin-top:6px">${cells || '<span class="muted small">Aucun prix</span>'}</div></div>`;
  }).join("");
  const receipts = d.receipts.map((r) => `<div class="row between mrow">
      <div><b>${esc(r.magasin)}</b> <span class="muted small">${esc(r.date)} • ${r.nb_lignes} article(s)</span></div>
      <div class="row">${r.imageUri ? `<a class="icon-btn" href="${esc(r.imageUri)}" target="_blank" title="Voir la photo">${ico("image")}</a>` : ""}
        <b>${eur(r.total)}</b><button class="icon-btn danger" data-act="mdelreceipt" data-id="${r.id}">${ico("trash")}</button></div></div>`).join("");
  return `<div class="grid mstats">${stat(st.nb_enseignes, "merceries")}${stat(st.nb_produits, "articles suivis")}${stat(st.nb_tickets, "tickets")}${stat(st.nb_prix_tickets, "prix relevés")}${stat(eur(st.depense_totale), "dépensés")}</div>
    <div class="card pad stack"><h3>Classement des merceries</h3>
      <p class="muted small">Indice de prix : 100 = toujours la moins chère ; 120 = en moyenne 20 % plus chère que la moins chère.</p>
      <div style="overflow-x:auto"><table class="mtable"><thead><tr><th>Mercerie</th><th>Indice</th><th>Articles</th><th>Tickets</th><th>Dépensé</th></tr></thead><tbody>${stores}</tbody></table></div></div>
    <div class="card pad stack"><div class="row between wrap"><h3>Prix par article</h3>
      <div class="seg"><button data-act="mcat" data-v="" class="${!cat ? "on" : ""}">Tous</button>${cats.map((c) => `<button data-act="mcat" data-v="${esc(c)}" class="${cat === c ? "on" : ""}">${esc(c)}</button>`).join("")}</div></div>
      <p class="muted small">🧾 = prix relevé sur un ticket (prioritaire). Sinon, moyenne de la fourchette de la base. En vert : le moins cher.</p>
      ${prods}</div>
    <div class="card pad stack"><h3>Derniers tickets</h3>${receipts || '<p class="muted">Aucun ticket pour l\'instant. Ajoutez-en depuis l\'onglet « Ajouter un ticket ».</p>'}</div>`;
}

// ----- ajout d'un ticket -----
function mTicketView() {
  const m = S.m, d = m.draft;
  if (m.scanning) return '<div class="center"><div class="spin"></div><h2 style="font-size:20px;color:var(--s600)">Lecture du ticket par Gemini...</h2></div>';
  if (!d) return `<div class="center stack"><div><h3 style="font-size:20px">Photo d'un ticket ou d'une facture</h3>
      <p class="muted">L'IA lit le magasin, la date et chaque article, puis vous vérifiez avant d'enregistrer. Les prix enrichissent la base.</p></div>
    <div class="grid2" style="width:100%;max-width:440px">
      <button class="bigdrop" data-act="mpickcam">${ico("camera")}<span>Prendre une photo</span></button>
      <button class="bigdrop grey" data-act="mpickimg">${ico("upload")}<span>Importer une image</span></button></div>
    <input type="file" id="mcamfile" accept="image/*" capture="environment" class="hidden" data-file="mscan">
    <input type="file" id="mimgfile" accept="image/*,application/pdf" class="hidden" data-file="mscan">
    <button class="muted" data-act="mmanual">ou saisir un ticket à la main</button></div>`;
  const stores = m.data.stores.map((s) => `<option value="${esc(s.nom)}">`).join("");
  const prods = m.data.products.map((p) => `<option value="${esc(p.nom)}">`).join("");
  const known = new Set(m.data.products.map((p) => p.nom.toLowerCase()));
  const lines = d.lignes.map((l, i) => `<div class="mline">
      <div style="grid-area:n"><input list="mprods" data-bind="m.draft.lignes.${i}.nom" value="${esc(l.nom)}" placeholder="Article">
        ${l.libelle ? `<div class="muted small">Ticket : « ${esc(l.libelle)} »</div>` : ""}
        ${l.nom && !known.has(l.nom.toLowerCase()) ? '<div class="small" style="color:var(--amber)">Nouvel article (sera créé) — choisissez un article existant si c\'est le même</div>' : ""}</div>
      <input style="grid-area:q" type="number" inputmode="decimal" step="0.1" data-bind="m.draft.lignes.${i}.quantite" value="${esc(l.quantite)}" title="Quantité">
      <input style="grid-area:u" data-bind="m.draft.lignes.${i}.unite" value="${esc(l.unite)}" title="Unité">
      <input style="grid-area:p" type="number" inputmode="decimal" step="0.01" data-bind="m.draft.lignes.${i}.prix_unitaire" value="${esc(l.prix_unitaire)}" placeholder="Prix €" title="Prix unitaire €">
      <button style="grid-area:x" class="icon-btn danger" data-act="mrmline" data-i="${i}">${ico("x")}</button></div>`).join("");
  return `<div class="stack">
    ${d.error ? `<div class="card pad" style="background:var(--amber-50);border-color:var(--amber-200);font-size:14px">⚠️ ${esc(d.error)} Complétez à la main.</div>` : ""}
    <div class="mticket">${d.imageUri ? `<div class="card" style="overflow:hidden;align-self:start"><img src="${esc(d.imageUri)}" style="width:100%" alt="Ticket"></div>` : ""}
    <div class="card pad stack">
      <div class="grid2"><div><label class="lbl">Magasin</label><input list="mstores" data-bind="m.draft.magasin" value="${esc(d.magasin)}"></div>
        <div><label class="lbl">Date</label><input type="date" data-bind="m.draft.date" value="${esc(d.date)}"></div></div>
      <div><label class="lbl">Total du ticket (€)</label><input type="number" step="0.01" data-bind="m.draft.total" value="${esc(d.total)}"></div>
      <div class="mline head muted small"><span style="grid-area:n">Article</span><span style="grid-area:q">Qté</span><span style="grid-area:u">Unité</span><span style="grid-area:p">Prix unit.</span></div>
      ${lines || '<p class="muted">Aucun article.</p>'}
      <button class="btn" data-act="maddline">${ico("plus", "ico")} Ajouter une ligne</button>
      <div class="row"><button class="btn" style="flex:1" data-act="mcancelticket">Annuler</button>
        <button class="btn primary" style="flex:2" data-act="msaveticket">${ico("check", "ico")} Enregistrer dans la base</button></div></div></div>
    <datalist id="mstores">${stores}</datalist><datalist id="mprods">${prods}</datalist></div>`;
}

// ----- liste de courses + comparateur -----
function mCoursesView() {
  const m = S.m, d = m.data, c = m.cmp;
  const byCat = {};
  d.products.forEach((p) => (byCat[p.categorie] ||= []).push(p));
  const opts = Object.entries(byCat).map(([k, ps]) => `<optgroup label="${esc(k)}">${ps.map((p) => `<option value="${p.id}" ${m.pick === p.id ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}</optgroup>`).join("");
  const pname = (id) => d.products.find((p) => p.id === id);
  const items = m.list.map((it, i) => { const p = pname(it.produit_id); return `<div class="row between mrow">
      <div style="flex:1"><b>${esc(p?.nom || it.produit_id)}</b></div>
      <input type="number" inputmode="decimal" step="0.1" min="0.1" data-mq="${i}" value="${it.quantite}" style="width:80px">
      <span class="muted small" style="width:50px">${esc(p?.unite || "")}</span>
      <button class="icon-btn danger" data-act="mrmitem" data-i="${i}">${ico("x")}</button></div>`; }).join("");

  let result = "";
  if (c && c.lines.length) {
    const v = c.verdict, mixed = c.mixed, best = c.singles[0];
    const verdict = v.choix === "unique"
      ? `<div class="mverdict good">🏆 <b>Allez uniquement chez ${esc(stName(v.unique_store))}</b> : ${eur(v.unique_total)}.<br>
          ${mixed.nb_magasins > 1 ? `Faire ${mixed.nb_magasins} magasins ne ferait économiser que ${eur(v.unique_total - mixed.total)}${c.deplacement ? ` (moins ${eur(c.deplacement * (mixed.nb_magasins - 1))} de déplacement)` : ""} : ça ne vaut pas le coup.` : "C'est aussi le moins cher pour chaque article."}</div>`
      : v.difference != null
        ? `<div class="mverdict">💡 <b>Mieux vaut répartir sur ${mixed.nb_magasins} merceries</b> : ${eur(mixed.total)} au lieu de ${eur(v.unique_total)} chez ${esc(stName(v.unique_store))}.<br>
            Économie : <b>${eur(v.difference)}</b>${c.deplacement ? " (déplacements déduits)" : ""}.</div>`
        : `<div class="mverdict">💡 Aucune mercerie ne propose tous les articles : répartissez sur ${mixed.nb_magasins} magasin(s) pour ${eur(mixed.total)}.</div>`;
    const perItem = c.lines.map((l) => `<tr><td><b>${esc(l.nom)}</b><div class="muted small">${l.quantite} ${esc(l.unite)}</div></td>
        <td><span class="mbadge good">${esc(stName(l.choix.store_id))}</span><div class="small">${eur(l.choix.total)}${l.choix.source === "estimation" ? ' <span class="muted">(estim.)</span>' : " 🧾"}</div></td>
        <td class="small">${l.alternatives.slice(1).map((a) => `${esc(stName(a.store_id))} ${eur(a.total)}`).join("<br>") || '<span class="muted">seul vendeur connu</span>'}</td></tr>`).join("");
    const mixedHtml = mixed.stores.map((b) => `<div class="card pad"><div class="row between"><b>${ico("pin", "ico")} ${esc(stName(b.store_id))}</b><b>${eur(b.total)}</b></div>
        <ul class="small" style="margin:6px 0 0 18px">${b.items.map((x) => `<li>${esc(x.nom)} × ${x.quantite} — ${eur(x.total)}</li>`).join("")}</ul></div>`).join("");
    const singles = c.singles.map((s, i) => `<tr class="${i === 0 && s.complet ? "mwin" : ""}"><td><b>${esc(stName(s.store_id))}</b></td>
        <td>${s.complet ? `<b>${eur(s.total)}</b>` : `${eur(s.total)} <span class="muted small">(partiel)</span>`}</td>
        <td class="small">${s.complet ? "✅ tout" : `${s.couvre}/${s.sur} — manque : ${s.manquants.map(esc).join(", ")}`}</td></tr>`).join("");
    result = `${verdict}
      <div class="card pad stack"><h3>1. Où acheter chaque article au meilleur prix</h3>
        <div style="overflow-x:auto"><table class="mtable"><thead><tr><th>Article</th><th>Le moins cher</th><th>Autres</th></tr></thead><tbody>${perItem}</tbody></table></div></div>
      <div class="card pad stack"><div class="row between"><h3>2. Panier réparti (le moins cher)</h3><b style="color:var(--rose)">${eur(mixed.total)}</b></div>
        <p class="muted small">${mixed.nb_magasins} mercerie(s) à visiter.</p><div class="grid2">${mixedHtml}</div></div>
      <div class="card pad stack"><h3>3. Tout dans une seule mercerie</h3>
        <div style="overflow-x:auto"><table class="mtable"><thead><tr><th>Mercerie</th><th>Total</th><th>Couverture</th></tr></thead><tbody>${singles}</tbody></table></div></div>
      ${c.unpriced.length ? `<p class="muted small">Sans prix connu : ${c.unpriced.map((u) => esc(u.nom)).join(", ")}.</p>` : ""}`;
  }
  return `<div class="card pad stack"><h3>Ma liste de courses</h3>
      <div class="row wrap"><select data-bind="m.pick" style="flex:3;min-width:200px"><option value="">— Choisir un article —</option>${opts}</select>
        <input type="number" inputmode="decimal" step="0.1" data-bind="m.qty" value="${esc(m.qty)}" style="width:80px" title="Quantité">
        <button class="btn primary" data-act="madditem">${ico("plus", "ico")} Ajouter</button></div>
      <div class="row wrap"><input data-bind="m.newProd" value="${esc(m.newProd)}" placeholder="Article absent de la base ? Créez-le (ex : Fermeture éclair 20 cm)" style="flex:1" data-enter="mnewprod">
        <button class="btn" data-act="mnewprod">Créer</button></div>
      ${items || '<p class="muted">La liste est vide.</p>'}
      ${m.list.length ? `<div class="row wrap between" style="border-top:1px solid var(--s100);padding-top:10px">
        <label class="small row">Coût d'un magasin en plus (essence, temps) :
          <input type="number" step="0.5" min="0" data-mdep="1" value="${esc(m.dep)}" style="width:80px"> €</label>
        <button class="btn" data-act="mclearlist">${ico("trash", "ico")} Vider</button></div>` : ""}</div>
    ${result}`;
}

// ---------------------------------------------------------------- actions
const M_blankLine = () => ({ libelle: "", nom: "", quantite: 1, unite: "unité", prix_unitaire: "", prix_total: "" });
Object.assign(A, {
  msub: guard(async (d) => { S.m.sub = d.id; if (d.id === "resume" || d.id === "courses") await M_load(); render(); }),
  mcat: (d) => { S.m.cat = d.v; render(); },
  mpickcam: () => document.getElementById("mcamfile").click(),
  mpickimg: () => document.getElementById("mimgfile").click(),
  mmanual: () => { S.m.draft = { imageUri: null, magasin: "", date: new Date().toISOString().slice(0, 10), total: "", lignes: [M_blankLine()], error: "" }; render(); },
  maddline: () => { S.m.draft.lignes.push(M_blankLine()); render(); },
  mrmline: (d) => { S.m.draft.lignes.splice(+d.i, 1); render(); },
  mcancelticket: () => { S.m.draft = null; render(); },
  msaveticket: guard(async () => {
    const d = S.m.draft;
    d.lignes.forEach((l) => { l.prix_total = ""; });   // recalculé côté serveur (pu × qté)
    const r = await api("/api/merceries/receipt", { json: d });
    S.m.draft = null; await M_load(); S.m.sub = "resume";
    toast(`Ticket enregistré ✓ (${r.lignes} prix ajoutés)`); render();
  }),
  mdelreceipt: guard(async (d) => {
    if (!confirm("Supprimer ce ticket et les prix qu'il a ajoutés ?")) return;
    await api(`/api/merceries/receipt/${d.id}`, { method: "DELETE" }); await M_load(); render();
  }),
  madditem: guard(async () => {
    const m = S.m; if (!m.pick) return toast("Choisissez un article", true);
    const q = parseFloat(m.qty) || 1, ex = m.list.find((i) => i.produit_id === m.pick);
    if (ex) ex.quantite = +(ex.quantite + q).toFixed(2); else m.list.push({ produit_id: m.pick, quantite: q });
    m.pick = ""; m.qty = "1"; await M_saveList(); render();
  }),
  mnewprod: guard(async () => {
    const n = S.m.newProd.trim(); if (!n) return;
    const p = await api("/api/merceries/products", { json: { nom: n } });
    S.m.newProd = ""; S.m.data = await api("/api/merceries/summary"); S.m.pick = p.id;
    toast("Article créé — ajoutez-le à la liste. Ses prix viendront des tickets."); render();
  }),
  mrmitem: guard(async (d) => { S.m.list.splice(+d.i, 1); await M_saveList(); render(); }),
  mclearlist: guard(async () => { if (!confirm("Vider la liste ?")) return; S.m.list = []; await M_saveList(); render(); }),
});

FILES.mscan = async (files) => {
  S.m.scanning = true; render();
  try {
    const f = files[0].type.includes("pdf") ? files[0] : await shrink(files[0], 2000);
    S.m.draft = await api("/api/merceries/receipt/scan", { method: "POST", body: fd({ file: f }) });
    if (!S.m.draft.lignes.length) S.m.draft.lignes.push(M_blankLine());
  } catch (e) { toast(e.message, true); }
  S.m.scanning = false; render();
};

// quantités de la liste et coût de déplacement : recalcul à la validation du champ
document.addEventListener("change", guard(async (e) => {
  const t = e.target;
  if (t.dataset.mq != null) { S.m.list[+t.dataset.mq].quantite = parseFloat(t.value) || 1; await M_saveList(); render(); }
  else if (t.dataset.mdep) { S.m.dep = t.value; await M_compare(); render(); }
}));

