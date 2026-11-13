"""Merceries : base de prix, tickets de caisse, liste de courses et comparateur."""
import json
import re
import time
import unicodedata
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from . import db, gemini
from .config import UPLOAD_DIR

router = APIRouter(prefix="/api/merceries")
_USER_SEED = Path(__file__).parent.parent / "base de donnees merceries.json"
SEED = _USER_SEED if _USER_SEED.exists() else Path(__file__).parent / "seed" / "merceries.json"


# ---------------------------------------------------------------- utilitaires
def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def short(name: str) -> str:
    """Nom sans la partie entre parenthèses : 'MLC (Mercerie...)' -> 'MLC'."""
    return re.sub(r"\(.*?\)", "", name or "").strip()


def slug(s: str) -> str:
    return norm(short(s)).replace(" ", "_") or uuid.uuid4().hex[:8]


def now_ms() -> int:
    return int(time.time() * 1000)


def num(v, default=0.0) -> float:
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return default


def find_store(name: str, stores: list[dict]) -> dict | None:
    n = norm(short(name))
    if not n:
        return None
    for s in stores:                              # égalité
        if norm(short(s["nom"])) == n:
            return s
    for s in stores:                              # inclusion ("MLC Annecy" ~ "MLC")
        sn = norm(short(s["nom"]))
        if sn and (n.startswith(sn) or sn.startswith(n) or sn in n or n in sn):
            return s
    return None


def find_product(name: str, products: list[dict]) -> dict | None:
    n = norm(name)
    if not n:
        return None
    for p in products:
        if norm(p["nom"]) == n:
            return p
    return None


# ---------------------------------------------------------------- initialisation
def _extract_min_max(p) -> tuple[float | None, float | None]:
    if isinstance(p, (int, float)):
        return float(p), float(p)
    if isinstance(p, dict):
        if "min" in p and "max" in p:
            return float(p["min"]), float(p["max"])
        nums = [float(v) for v in p.values() if isinstance(v, (int, float))]
        if nums:
            return min(nums), max(nums)
    return None, None


def seed_if_needed():
    if not SEED.exists():
        return
    raw = SEED.read_text(encoding="utf-8")
    sig = f"{len(raw)}:{hash(raw)}"
    if db.kv_get("merceries_seeded") == sig:
        return
    data = json.loads(raw)
    stores: dict[str, dict] = {s["id"]: s for s in db.list_docs("enseignes")}
    for m in data.get("merceries", []):
        sid = slug(m["nom"])
        s = stores.setdefault(sid, {
            "id": sid, "nom": short(m["nom"]), "sites": [],
            "site_web": m.get("site_web", ""), "specificite": m.get("specificite", ""),
            "createdAt": now_ms()})
        site = {"secteur": m.get("secteur", ""), "adresse": m.get("adresse", "")}
        sites = s.setdefault("sites", [])
        if site not in sites:
            sites.append(site)
    store_list = list(stores.values())
    existing_prods = {p["id"]: p for p in db.list_docs("products")}

    def load(items, cat):
        for it in items:
            pid = slug(it["produit"])
            old_p = existing_prods.get(pid, {})
            prices = dict(old_p.get("prices") or {})
            for key, p in it["prix_par_enseigne"].items():
                st = find_store(key, store_list)
                if not st:   # enseigne inconnue : on la crée
                    st = {"id": slug(key), "nom": short(key), "sites": [], "site_web": "",
                          "specificite": "", "createdAt": now_ms()}
                    store_list.append(st)
                lo, hi = _extract_min_max(p)
                prev_obs = (prices.get(st["id"]) or {}).get("obs", [])
                prices[st["id"]] = {"min": lo, "max": hi, "obs": prev_obs}
            db.save_doc("products", {
                "id": pid, "nom": it["produit"], "categorie": cat,
                "unite": it["unite"], "prices": prices,
                "createdAt": old_p.get("createdAt") or now_ms()})

    load(data.get("categories_mercerie", []), "Mercerie")
    load(data.get("categories_tissus", []), "Tissus")
    for s in store_list:
        db.save_doc("enseignes", s)
    db.kv_set("merceries_seeded", sig)


# ---------------------------------------------------------------- prix
def effective_price(p: dict, store_id: str) -> dict | None:
    """Prix retenu : dernier prix relevé sur ticket, sinon moyenne min/max de la base."""
    e = (p.get("prices") or {}).get(store_id)
    if not e or not isinstance(e, dict):
        return None
    obs = sorted([o for o in (e.get("obs") or []) if isinstance(o, dict)], key=lambda o: o.get("date", ""), reverse=True)
    if obs:
        return {"prix": round(num(obs[0].get("prix")), 2), "source": "ticket", "date": obs[0].get("date"),
                "min": e.get("min"), "max": e.get("max")}
    lo, hi = e.get("min"), e.get("max")
    if lo is None and hi is None:
        return None
    lo = hi if lo is None else lo
    hi = lo if hi is None else hi
    return {"prix": round((num(lo) + num(hi)) / 2, 2), "source": "estimation", "date": None,
            "min": num(lo), "max": num(hi)}


def price_map(p: dict) -> dict:
    return {sid: ep for sid in (p.get("prices") or {}) if (ep := effective_price(p, sid))}


def ensure_receipt_observations(products: list[dict], receipts: list[dict], stores: list[dict]) -> list[dict]:
    """Garantit que chaque ligne de chaque ticket enregistré figure bien dans les prix relevés (obs) des produits."""
    if not receipts:
        return products
    by_id = {p["id"]: p for p in products if p.get("id")}
    by_norm = {norm(p.get("nom", "")): p for p in products if p.get("nom")}
    store_ids = {s["id"] for s in stores if s.get("id")}
    changed_prods: dict[str, dict] = {}
    for r in receipts:
        if not isinstance(r, dict):
            continue
        rid = r.get("id") or ""
        sid = r.get("store_id") or slug(r.get("magasin") or "mercerie")
        date = r.get("date") or time.strftime("%Y-%m-%d")
        if sid and sid not in store_ids and r.get("magasin"):
            st = {"id": sid, "nom": short(r["magasin"]) or r["magasin"], "sites": [], "site_web": "",
                  "specificite": "Ajouté depuis un ticket", "createdAt": r.get("createdAt") or now_ms()}
            db.save_doc("enseignes", st)
            stores.append(st)
            store_ids.add(sid)
        for l in r.get("lignes") or []:
            if not isinstance(l, dict):
                continue
            nom = (l.get("nom") or l.get("libelle") or "").strip()
            pu = num(l.get("prix_unitaire"))
            if not nom or pu <= 0:
                continue
            pid = l.get("produit_id") or slug(nom)
            prod = by_id.get(pid) or by_norm.get(norm(nom))
            if not prod:
                prod = {"id": pid, "nom": nom, "categorie": "Mercerie",
                        "unite": l.get("unite") or "unité", "prices": {}, "createdAt": now_ms()}
                products.append(prod)
                by_id[prod["id"]] = prod
                by_norm[norm(nom)] = prod
                changed_prods[prod["id"]] = prod
            prices = prod.get("prices")
            if not isinstance(prices, dict):
                prices = prod["prices"] = {}
                changed_prods[prod["id"]] = prod
            e = prices.get(sid)
            if not isinstance(e, dict):
                e = prices[sid] = {"min": None, "max": None, "obs": []}
                changed_prods[prod["id"]] = prod
            obs = e.get("obs")
            if not isinstance(obs, list):
                obs = e["obs"] = []
                changed_prods[prod["id"]] = prod
            # Vérifie si ce relevé (ticket + prix) est déjà présent
            if not any(isinstance(o, dict) and o.get("receiptId") == rid and abs(num(o.get("prix")) - pu) < 0.005 for o in obs):
                obs.append({"prix": pu, "date": date, "receiptId": rid})
                changed_prods[prod["id"]] = prod
    for p in changed_prods.values():
        db.save_doc("products", p)
    return products


# ---------------------------------------------------------------- résumé
@router.get("/summary")
def summary():
    stores = db.list_docs("enseignes")
    receipts = db.list_docs("receipts")
    products = ensure_receipt_observations(db.list_docs("products"), receipts, stores)

    ratios: dict[str, list[float]] = {s["id"]: [] for s in stores}
    out_products = []
    for p in sorted(products, key=lambda x: (x.get("categorie", ""), x.get("nom", ""))):
        pm = price_map(p)
        best = min(pm.items(), key=lambda kv: kv[1]["prix"]) if pm else None
        if len(pm) >= 2:
            lo = best[1]["prix"] or 0.01
            for sid, ep in pm.items():
                ratios.setdefault(sid, []).append(ep["prix"] / lo)
        out_products.append({
            "id": p["id"], "nom": p.get("nom", ""), "categorie": p.get("categorie", ""), "unite": p.get("unite") or "unité",
            "prix": pm, "meilleur": {"store_id": best[0], "prix": best[1]["prix"]} if best else None})

    spent: dict[str, float] = {}
    for r in receipts:
        spent[r.get("store_id", "")] = spent.get(r.get("store_id", ""), 0) + num(r.get("total"))
    out_stores = []
    for s in stores:
        rs = ratios.get(s["id"], [])
        out_stores.append({
            **s,
            "sites": s.get("sites") or [],
            "nb_produits": sum(1 for p in products if s["id"] in (p.get("prices") or {})),
            "indice_prix": round(sum(rs) / len(rs) * 100) if rs else None,
            "nb_comparaisons": len(rs),
            "nb_tickets": sum(1 for r in receipts if r.get("store_id") == s["id"]),
            "depense": round(spent.get(s["id"], 0), 2)})
    out_stores.sort(key=lambda s: (s["indice_prix"] is None, s["indice_prix"] or 0))

    return {
        "stats": {
            "nb_enseignes": len(stores), "nb_produits": len(products), "nb_tickets": len(receipts),
            "nb_prix_tickets": sum(len((e if isinstance(e, dict) else {}).get("obs") or []) for p in products
                                   for e in (p.get("prices") or {}).values()),
            "depense_totale": round(sum(num(r.get("total")) for r in receipts), 2)},
        "stores": out_stores,
        "products": out_products,
        "receipts": [{k: r.get(k) for k in ("id", "date", "store_id", "magasin", "total", "imageUri")}
                     | {"nb_lignes": len(r.get("lignes") or [])} for r in receipts[:30]],
    }


# ---------------------------------------------------------------- tickets
@router.post("/receipt/scan")
def scan_receipt(file: UploadFile = File(...)):
    data = file.file.read()
    ext = Path(file.filename or "").suffix.lower() or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    stores = db.list_docs("enseignes")
    products = db.list_docs("products")
    draft = {"imageUri": f"/uploads/{name}", "magasin": "", "date": time.strftime("%Y-%m-%d"),
             "total": 0, "lignes": [], "error": ""}
    try:
        res = gemini.extract_receipt(data, file.content_type or "image/jpeg",
                                     [s.get("nom", "") for s in stores], [p.get("nom", "") for p in products])
    except gemini.GeminiError as e:
        draft["error"] = str(e)
        return draft
    st = find_store(res.get("magasin", ""), stores)
    draft["magasin"] = st["nom"] if st else res.get("magasin", "")
    draft["date"] = res.get("date") or draft["date"]
    draft["total"] = num(res.get("total"))
    for l in res.get("lignes") or []:
        q = num(l.get("quantite"), 1) or 1
        pt = num(l.get("prix_total"))
        pu = num(l.get("prix_unitaire")) or (pt / q if q else 0)
        pt = pt or round(pu * q, 2)
        prod = find_product(l.get("produit") or "", products)
        draft["lignes"].append({
            "libelle": l.get("libelle", ""),
            "nom": prod["nom"] if prod else (l.get("produit") or l.get("libelle") or ""),
            "quantite": q, "unite": l.get("unite") or (prod.get("unite") if prod else None) or "unité",
            "prix_unitaire": round(pu, 2), "prix_total": round(pt, 2),
            "nouveau": prod is None})
    return draft


@router.post("/receipt")
def save_receipt(draft: dict):
    stores = db.list_docs("enseignes")
    products = db.list_docs("products")
    magasin = (draft.get("magasin") or "").strip() or "Mercerie"
    st = find_store(magasin, stores)
    if not st:
        st = {"id": slug(magasin), "nom": short(magasin) or magasin, "sites": [], "site_web": "",
              "specificite": "Ajouté depuis un ticket", "createdAt": now_ms()}
        db.save_doc("enseignes", st)
    rid = uuid.uuid4().hex
    date = draft.get("date") or time.strftime("%Y-%m-%d")
    lignes, touched = [], {}
    for l in draft.get("lignes") or []:
        if not isinstance(l, dict):
            continue
        nom = (l.get("nom") or l.get("libelle") or "").strip()
        pu = num(l.get("prix_unitaire"))
        if not nom or pu <= 0:
            continue
        prod = touched.get(norm(nom)) or find_product(nom, products)
        if not prod:
            prod = {"id": slug(nom), "nom": nom, "categorie": "Mercerie",
                    "unite": l.get("unite") or "unité", "prices": {}, "createdAt": now_ms()}
            products.append(prod)
        prod.setdefault("unite", l.get("unite") or "unité")
        touched[norm(nom)] = prod
        prices = prod.get("prices")
        if not isinstance(prices, dict):
            prices = prod["prices"] = {}
        e = prices.get(st["id"])
        if not isinstance(e, dict):
            e = prices[st["id"]] = {"min": None, "max": None, "obs": []}
        e.setdefault("min", None)
        e.setdefault("max", None)
        obs = e.get("obs")
        if not isinstance(obs, list):
            obs = e["obs"] = []
        obs.append({"prix": pu, "date": date, "receiptId": rid})
        q = num(l.get("quantite"), 1) or 1
        lignes.append({"produit_id": prod["id"], "nom": prod["nom"], "quantite": q,
                       "unite": prod["unite"], "prix_unitaire": pu,
                       "prix_total": num(l.get("prix_total")) or round(pu * q, 2)})
    for p in touched.values():
        db.save_doc("products", p)
    total = num(draft.get("total")) or round(sum(l["prix_total"] for l in lignes), 2)
    db.save_doc("receipts", {"id": rid, "createdAt": now_ms(), "date": date, "store_id": st["id"],
                             "magasin": st["nom"], "imageUri": draft.get("imageUri"),
                             "total": total, "lignes": lignes})
    return {"ok": True, "id": rid, "lignes": len(lignes)}


@router.delete("/receipt/{rid}")
def delete_receipt(rid: str):
    r = db.get_doc("receipts", rid)
    if not r:
        raise HTTPException(404)
    for p in db.list_docs("products"):          # retire les prix relevés par ce ticket
        changed = False
        for e in (p.get("prices") or {}).values():
            if not isinstance(e, dict):
                continue
            before = len(e.get("obs") or [])
            e["obs"] = [o for o in (e.get("obs") or []) if isinstance(o, dict) and o.get("receiptId") != rid]
            changed |= len(e["obs"]) != before
        if changed:
            db.save_doc("products", p)
    if (r.get("imageUri") or "").startswith("/uploads/"):
        f = UPLOAD_DIR / Path(r["imageUri"]).name
        if f.exists():
            f.unlink()
    db.delete_doc("receipts", rid)
    dels = set(db.kv_get("deleted_ids", []))
    dels.add(rid)
    db.kv_set("deleted_ids", list(dels))
    return {"ok": True}


@router.get("/receipt/{rid}")
def get_receipt(rid: str):
    r = db.get_doc("receipts", rid)
    if not r:
        raise HTTPException(404)
    return r


@router.post("/products")
def add_product(payload: dict):
    nom = (payload.get("nom") or "").strip()
    if not nom:
        raise HTTPException(400, "Nom requis")
    existing = find_product(nom, db.list_docs("products"))
    if existing:
        return existing
    return db.save_doc("products", {
        "id": slug(nom), "nom": nom, "categorie": payload.get("categorie") or "Mercerie",
        "unite": payload.get("unite") or "unité", "prices": {}, "createdAt": now_ms()})


# ---------------------------------------------------------------- liste de courses
@router.get("/list")
def get_list():
    return db.kv_get("shopping_list", [])


@router.put("/list")
def put_list(items: list[dict]):
    clean = [{"produit_id": i["produit_id"], "quantite": num(i.get("quantite"), 1) or 1}
             for i in items if i.get("produit_id")]
    db.kv_set("shopping_list", clean)
    return clean


@router.post("/compare")
def compare(payload: dict):
    """Meilleur magasin par article, panier mixte le moins cher, meilleur magasin unique."""
    items = payload.get("items", [])
    dep = max(0.0, num(payload.get("deplacement")))
    stores = {s["id"]: s for s in db.list_docs("enseignes")}
    prods = {p["id"]: p for p in db.list_docs("products")}

    lines, unpriced = [], []
    for it in items:
        p = prods.get(it.get("produit_id"))
        if not p:
            continue
        q = num(it.get("quantite"), 1) or 1
        pm = price_map(p)
        base = {"produit_id": p["id"], "nom": p["nom"], "quantite": q, "unite": p["unite"]}
        if not pm:
            unpriced.append(base)
            continue
        alts = sorted(({"store_id": sid, "prix_unitaire": ep["prix"], "total": round(ep["prix"] * q, 2),
                        "source": ep["source"]} for sid, ep in pm.items()), key=lambda a: a["total"])
        lines.append({**base, "choix": alts[0], "alternatives": alts,
                      "ecart_max": round(alts[-1]["total"] - alts[0]["total"], 2)})

    # panier mixte : chaque article chez le moins cher
    by_store: dict[str, dict] = {}
    for l in lines:
        c = l["choix"]
        b = by_store.setdefault(c["store_id"], {"store_id": c["store_id"], "items": [], "total": 0.0})
        b["items"].append({"nom": l["nom"], "quantite": l["quantite"], "unite": l["unite"],
                           "prix_unitaire": c["prix_unitaire"], "total": c["total"]})
        b["total"] = round(b["total"] + c["total"], 2)
    mixed_total = round(sum(b["total"] for b in by_store.values()), 2)
    n_mixed = len(by_store)

    # magasin unique
    singles = []
    for sid, st in stores.items():
        total, missing, covered = 0.0, [], 0
        for l in lines:
            a = next((x for x in l["alternatives"] if x["store_id"] == sid), None)
            if a:
                total += a["total"]
                covered += 1
            else:
                missing.append(l["nom"])
        if covered:
            singles.append({"store_id": sid, "total": round(total, 2), "couvre": covered,
                            "sur": len(lines), "complet": not missing, "manquants": missing})
    singles.sort(key=lambda s: (not s["complet"], -s["couvre"], s["total"]))

    best_single = singles[0] if singles else None
    verdict = None
    if lines:
        if best_single and best_single["complet"]:
            mixed_eff = round(mixed_total + dep * max(0, n_mixed - 1), 2)
            diff = round(best_single["total"] - mixed_eff, 2)
            verdict = {"choix": "unique" if diff <= 0 or n_mixed <= 1 else "mixte",
                       "difference": abs(diff), "mixte_effectif": mixed_eff,
                       "unique_total": best_single["total"], "unique_store": best_single["store_id"]}
        else:
            verdict = {"choix": "mixte", "difference": None, "mixte_effectif": mixed_total,
                       "unique_total": None, "unique_store": None}

    return {"lines": lines, "unpriced": unpriced,
            "mixed": {"total": mixed_total, "nb_magasins": n_mixed, "stores": list(by_store.values())},
            "singles": singles, "verdict": verdict, "deplacement": dep,
            "stores": {sid: {"nom": s["nom"], "sites": s.get("sites", [])} for sid, s in stores.items()}}
