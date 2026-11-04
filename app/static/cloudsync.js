/* CoutureIA – CoutureSync Cloud via Firebase Realtime Database (même principe que ZenBudget) */
"use strict";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCJl4kwy-mGM_5VxKwerfgI8lavfiTqXoo",
  authDomain: "zenbudget-7fcfb.firebaseapp.com",
  databaseURL: "https://zenbudget-7fcfb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "zenbudget-7fcfb",
  storageBucket: "zenbudget-7fcfb.firebasestorage.app",
  messagingSenderId: "812015728720",
  appId: "1:812015728720:web:aea2ad97dece0512aaf955",
};

S.sync = {
  profile: localStorage.getItem("couture_profile_name") || "",
  auto: localStorage.getItem("couture_auto_sync") === "true",
  busy: false,
  lastSync: localStorage.getItem("couture_last_sync") || "",
  status: "", // "ok" | "err" | ""
  msg: "",
  _db: null,
  _listener: null,
  _listenerKey: "",
  _updatingFromCloud: false,
  _initialized: false,
  _lastTimestamp: 0,
  _lastHash: "",
  _pushTimer: null,
};

function syncSafeKey(name) {
  const s = String(name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
  return s.length >= 3 ? "coutureia_" + s : "";
}

function syncDb() {
  if (S.sync._db) return S.sync._db;
  if (typeof firebase === "undefined") return null;
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  S.sync._db = firebase.database();
  return S.sync._db;
}

function syncHash(payload) {
  if (!payload) return "";
  const clean = {
    patterns: (payload.patterns || []).map((p) => p.id + ":" + (p.name || "") + ":" + ((p.resources || []).length) + ":" + ((p.sizeChart?.sizes || []).length)).sort(),
    profiles: (payload.profiles || []).map((p) => p.id + ":" + JSON.stringify(p.measurements || {})).sort(),
    receipts: (payload.receipts || []).map((r) => r.id).sort(),
    products: (payload.products || []).map((p) => p.id + ":" + JSON.stringify(p.prices || {})).sort(),
    shoppingList: payload.shoppingList || [],
    categories: payload.categories || [],
  };
  return JSON.stringify(clean);
}

async function syncPushNow(silent = false) {
  const sy = S.sync, key = syncSafeKey(sy.profile);
  if (!key || key.length < 3) {
    if (!silent) { sy.status = "err"; sy.msg = "Veuillez entrer un pseudo (min. 3 caractères)."; render(); }
    return;
  }
  const db = syncDb();
  if (!db) {
    if (!silent) { sy.status = "err"; sy.msg = "SDK Firebase non chargé (vérifiez votre connexion Internet)."; render(); }
    return;
  }
  if (!silent) { sy.busy = true; sy.msg = ""; render(); }
  try {
    const payload = await api("/api/sync/export");
    const isEmptyLocal = !(payload.patterns?.length) && !(payload.profiles?.length) && !(payload.receipts?.length);
    if (silent && isEmptyLocal) {
      // Sécurité anti-écrasement : si le serveur vient de redémarrer à vide (ex: mise à jour Render), on récupère Firebase au lieu d'écraser
      const snap = await db.ref(`budgets/${key}`).once("value");
      const existing = snap.val();
      if (existing && ((existing.patterns?.length) || (existing.profiles?.length) || (existing.receipts?.length))) {
        await syncApplyIncoming(existing, true);
        return;
      }
    }
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    const ts = Date.now();
    sy._lastTimestamp = ts;
    sy._lastHash = syncHash(cleanPayload);
    await db.ref(`budgets/${key}`).set({
      ...cleanPayload,
      _profile: sy.profile,
      _updatedAt: firebase.database.ServerValue.TIMESTAMP,
    });
    sy.lastSync = new Date().toLocaleTimeString("fr-FR");
    localStorage.setItem("couture_last_sync", sy.lastSync);
    sy.status = "ok";
    if (!silent) { sy.msg = "✅ Données sauvegardées sur le Cloud Firebase !"; toast("Synchronisé sur le Cloud ✓"); }
  } catch (e) {
    console.error("Firebase Push Error:", e);
    sy.status = "err";
    if (!silent) sy.msg = "❌ Erreur d'envoi : " + (e.message || e);
  } finally {
    sy.busy = false;
    if (!silent || S.tab === "settings") render();
  }
}

async function syncApplyIncoming(cloudData, silent = false) {
  const sy = S.sync;
  const copy = { ...cloudData };
  const ts = copy._updatedAt || Date.now();
  delete copy._profile;
  delete copy._updatedAt;
  const h = syncHash(copy);
  if (h && h === sy._lastHash && silent) return;
  sy._updatingFromCloud = true;
  try {
    await api("/api/sync/import", { json: copy });
    sy._lastHash = h;
    sy._lastTimestamp = ts;
    await loadAll();
    if (S.m?.data) await M_load();
    sy.lastSync = new Date().toLocaleTimeString("fr-FR");
    localStorage.setItem("couture_last_sync", sy.lastSync);
    sy.status = "ok";
    if (!silent) sy.msg = "✅ Données récupérées depuis le Cloud !";
    toast("🔄 Données mises à jour depuis le Cloud");
    render();
  } finally {
    setTimeout(() => { sy._updatingFromCloud = false; }, 600);
  }
}

async function syncPullNow(silent = false) {
  const sy = S.sync, key = syncSafeKey(sy.profile);
  if (!key || key.length < 3) {
    if (!silent) { sy.status = "err"; sy.msg = "Veuillez entrer un pseudo (min. 3 caractères)."; render(); }
    return;
  }
  const db = syncDb();
  if (!db) {
    if (!silent) { sy.status = "err"; sy.msg = "SDK Firebase non chargé (vérifiez votre connexion Internet)."; render(); }
    return;
  }
  if (!silent) { sy.busy = true; sy.msg = ""; render(); }
  try {
    const snap = await db.ref(`budgets/${key}`).once("value");
    const cloudData = snap.val();
    if (!cloudData) {
      sy._initialized = true;
      if (!silent) { sy.status = "err"; sy.msg = "❌ Aucune donnée trouvée pour ce pseudo. Cliquez d'abord sur « Envoyer maintenant » depuis votre premier appareil."; }
      else await syncPushNow(true); // Premier appareil avec ce pseudo : initialise le Cloud
      return;
    }
    if (silent && !(cloudData.patterns?.length) && S.patterns?.length > 0) {
      // La base locale contient des patrons (ex: backup tout juste importé) alors que le Cloud est vide : on pousse vers le Cloud
      sy._initialized = true;
      await syncPushNow(true);
      return;
    }
    await syncApplyIncoming(cloudData, silent);
    sy._initialized = true;
  } catch (e) {
    sy._initialized = true;
    console.error("Firebase Pull Error:", e);
    sy.status = "err";
    if (!silent) sy.msg = "❌ Erreur de récupération : " + (e.message || e);
  } finally {
    sy.busy = false;
    if (!silent || S.tab === "settings") render();
  }
}

function syncScheduleAutoPush() {
  const sy = S.sync, key = syncSafeKey(sy.profile);
  if (!sy.auto || !sy._initialized || !key || key.length < 3 || sy._updatingFromCloud) return;
  clearTimeout(sy._pushTimer);
  sy._pushTimer = setTimeout(() => syncPushNow(true), 800);
}

function syncSetupListener() {
  const sy = S.sync, db = syncDb();
  if (!db) return;
  if (sy._listener && sy._listenerKey) {
    db.ref(`budgets/${sy._listenerKey}`).off("value", sy._listener);
    sy._listener = null;
    sy._listenerKey = "";
  }
  const key = syncSafeKey(sy.profile);
  if (!sy.auto || !key || key.length < 3) return;
  const ref = db.ref(`budgets/${key}`);
  const fn = (snap) => {
    if (sy._updatingFromCloud) return;
    const cloudData = snap.val();
    if (!cloudData) return;
    const ts = cloudData._updatedAt;
    if (ts && sy._lastTimestamp && ts <= sy._lastTimestamp) return;
    syncApplyIncoming(cloudData, true);
  };
  ref.on("value", fn);
  sy._listener = fn;
  sy._listenerKey = key;
}

// Bloc UI affiché dans l'onglet Réglages
function cloudSyncCard() {
  const sy = S.sync;
  return `<div class="card pad stack" style="border-color:var(--rose-200)">
    <div class="row between wrap">
      <div>
        <h3>☁️ CoutureSync Cloud (Ordinateur ↔ Téléphone)</h3>
        <p class="muted small">${sy.auto ? "🟢 Synchronisation automatique active en temps réel" : "Synchronisation manuelle"}${sy.lastSync ? ` • Dernière synchro : <b>${esc(sy.lastSync)}</b>` : ""}</p>
      </div>
      <span class="mbadge ${sy.auto ? "good" : ""}">${sy.auto ? "Auto ON" : "Auto OFF"}</span>
    </div>
    <div>
      <label class="lbl">Votre pseudo de partage (min. 3 caractères)</label>
      <input data-bind="sync.profile" data-syncprof="1" value="${esc(sy.profile)}" placeholder="Ex : CoutureMaman">
      <p class="muted small" style="margin-top:4px">Entrez exactement le même pseudo sur l'ordinateur et sur le téléphone pour lier les deux appareils.</p>
    </div>
    <div class="card pad row between" style="background:var(--rose-50);border-color:var(--rose-200);cursor:pointer" data-act="synctoggle">
      <div>
        <b>🔄 Synchronisation automatique</b>
        <div class="muted small">${sy.auto ? "Chaque modification est envoyée et reçue automatiquement" : "Cliquez pour activer la synchronisation automatique"}</div>
      </div>
      <button class="btn ${sy.auto ? "primary" : ""}">${sy.auto ? "Activée ✓" : "Activer"}</button>
    </div>
    <div class="grid2">
      <button class="btn primary" data-act="syncpush" ${sy.busy ? "disabled" : ""}>${ico("upload", "ico")} Envoyer maintenant</button>
      <button class="btn dark" data-act="syncpull" ${sy.busy ? "disabled" : ""}>${ico("dl", "ico")} Récupérer maintenant</button>
    </div>
    ${sy.msg ? `<div class="mverdict ${sy.status === "ok" ? "good" : ""}">${esc(sy.msg)}</div>` : ""}
  </div>`;
}

Object.assign(A, {
  synctoggle: () => {
    S.sync.auto = !S.sync.auto;
    localStorage.setItem("couture_auto_sync", String(S.sync.auto));
    localStorage.setItem("couture_profile_name", S.sync.profile);
    S.sync.status = "ok";
    S.sync.msg = S.sync.auto ? "🔄 Synchronisation automatique activée" : "⏸️ Synchronisation automatique désactivée";
    syncSetupListener();
    if (S.sync.auto && syncSafeKey(S.sync.profile).length >= 3) syncPullNow(true);
    render();
  },
  syncpush: () => { localStorage.setItem("couture_profile_name", S.sync.profile); syncPushNow(false); },
  syncpull: () => { localStorage.setItem("couture_profile_name", S.sync.profile); syncPullNow(false); },
});

document.addEventListener("input", (e) => {
  if (e.target.dataset.syncprof) {
    localStorage.setItem("couture_profile_name", e.target.value);
    syncSetupListener();
  }
});

// Démarrage : initialise le listener temps réel si AutoSync est activé
window.addEventListener("load", () => {
  setTimeout(() => {
    if (S.sync.auto && syncSafeKey(S.sync.profile).length >= 3) {
      syncSetupListener();
      syncPullNow(true);
    }
  }, 1000);
});
