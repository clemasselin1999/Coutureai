"""CoutureIA – serveur FastAPI (API + PWA installable sur iPhone/Mac)."""
import io
import json
import shutil
import time
import uuid
import zipfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from . import db, gemini, merceries
from .config import (ACCESS_CODE, DATA_DIR, DEFAULT_MEASUREMENTS, SEXES,
                     STATIC_DIR, UPLOAD_DIR)

app = FastAPI(title="CoutureIA")
db.init_db()
merceries.seed_if_needed()
app.include_router(merceries.router)


# --- protection optionnelle par code ---------------------------------------
@app.middleware("http")
async def check_code(request: Request, call_next):
    path = request.url.path
    protected = path.startswith("/api") or path.startswith("/uploads")
    if ACCESS_CODE and protected and path != "/api/login":
        if request.cookies.get("code") != ACCESS_CODE:
            return JSONResponse({"detail": "Code requis"}, status_code=401)
    return await call_next(request)


@app.post("/api/login")
async def login(payload: dict):
    if ACCESS_CODE and payload.get("code") != ACCESS_CODE:
        raise HTTPException(401, "Code incorrect")
    resp = JSONResponse({"ok": True})
    resp.set_cookie("code", ACCESS_CODE, max_age=60 * 60 * 24 * 365,
                    httponly=True, samesite="lax", secure=False)
    return resp


def _lan_ip() -> str:
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return ""


_TUNNEL = {"url": "", "proc": None, "started": False}


def _ensure_https_tunnel(port: int = 8000) -> str:
    import subprocess
    import threading
    if _TUNNEL["url"]:
        return _TUNNEL["url"]
    exe = DATA_DIR / "cloudflared.exe"
    if not exe.exists() or _TUNNEL["started"]:
        return _TUNNEL["url"]
    _TUNNEL["started"] = True

    def _run():
        try:
            p = subprocess.Popen(
                [str(exe), "tunnel", "--url", f"http://127.0.0.1:{port}", "--no-autoupdate"],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="ignore"
            )
            _TUNNEL["proc"] = p
            for line in p.stdout:
                m = _re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
                if m:
                    _TUNNEL["url"] = m.group(0)
                    print(f"\n>>> Lien HTTPS Mobile (PWA 1-clic) : {_TUNNEL['url']}\n", flush=True)
        except Exception:
            _TUNNEL["started"] = False

    threading.Thread(target=_run, daemon=True).start()
    return _TUNNEL["url"]


@app.get("/api/config")
def get_config(request: Request):
    ip = _lan_ip()
    port = request.url.port or 8000
    https_url = _ensure_https_tunnel(8000)
    return {
        "sexes": SEXES,
        "defaultMeasurements": DEFAULT_MEASUREMENTS,
        "categories": db.get_categories(),
        "categoryImages": db.kv_get("category_images", {}),
        "hasApiKey": bool(db.kv_get("gemini_key")) or bool(gemini.GEMINI_API_KEY),
        "needsCode": bool(ACCESS_CODE),
        "lanUrl": f"http://{ip}:{port}" if ip else "",
        "httpsUrl": https_url,
    }


# --- fichiers ---------------------------------------------------------------
def _save_upload(f: UploadFile, data: bytes | None = None) -> str:
    ext = Path(f.filename or "").suffix.lower() or ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data if data is not None else f.file.read())
    return f"/uploads/{name}"


def _remove_file(url: str | None):
    if url and url.startswith("/uploads/"):
        p = UPLOAD_DIR / Path(url).name
        if p.exists():
            p.unlink()


@app.get("/uploads/{name}")
def uploads(name: str):
    p = UPLOAD_DIR / Path(name).name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, headers={"Cache-Control": "private, max-age=31536000"})


@app.post("/api/upload")
def upload(file: UploadFile = File(...)):
    return {"url": _save_upload(file)}


# --- patrons ---------------------------------------------------------------
@app.get("/api/patterns")
def list_patterns():
    return db.list_docs("patterns")


@app.post("/api/patterns")
def create_pattern(pattern: dict):
    pattern["id"] = uuid.uuid4().hex
    pattern["createdAt"] = int(time.time() * 1000)
    pattern.setdefault("resources", [])
    return db.save_doc("patterns", pattern)


@app.put("/api/patterns/{pid}")
def update_pattern(pid: str, pattern: dict):
    old = db.get_doc("patterns", pid)
    if not old:
        raise HTTPException(404)
    # Les ressources et le tableau des tailles ne se modifient que via leurs propres routes
    pattern.update(id=pid, createdAt=old["createdAt"], resources=old.get("resources", []))
    if "sizeChart" not in pattern and "sizeChart" in old:
        pattern["sizeChart"] = old["sizeChart"]
    return db.save_doc("patterns", pattern)


@app.delete("/api/patterns/{pid}")
def delete_pattern(pid: str):
    old = db.get_doc("patterns", pid)
    if old:
        _remove_file(old.get("imageUri"))
        _remove_file((old.get("sizeChart") or {}).get("imageUri"))
        for r in old.get("resources", []):
            if r["type"] in ("image", "pdf"):
                _remove_file(r["content"])
    db.delete_doc("patterns", pid)
    return {"ok": True}


# --- tableau des tailles & métrage tissu au dos du patron -------------------
import re as _re

_MEASURE_CODES = ("HT", "P", "T", "H", "E", "C", "B", "CU", "LD", "LB", "LV", "EJ", "MESURE")


def _parse_numbers(txt: str) -> list[float]:
    return [float(x.replace(",", ".")) for x in _re.findall(r"\d+(?:[.,]\d+)?", str(txt or ""))]


def _infer_header_code(label: str, raw_code: str) -> str:
    l = (label or "").lower()
    c = (raw_code or "AUTRE").strip().upper()
    if any(w in l for w in ("tissu", "fabric", "laize", "métrage", "metrage", "doublure", "lining", "thermocol", "entoilage", "interfacing", "bord-côte", "bord cote", "ribbing", "empiècement", "empiecement", "yoke", "manches longues", "manches courtes", "long sleeves", "short sleeves")):
        return "TISSU"
    if any(w in l for w in ("bouton", "button", "fermeture", "zip", "élastique", "elastique", "elastic", "aiguille", "fil ", "press", "œillet", "oeillet", "biais", "ruban", "cordon")):
        return "AUTRE"
    if any(w in l for w in ("stature", "height", "hauteur totale", "taille corporelle")):
        return "HT"
    if any(w in l for w in ("poitrine", "buste", "chest", "bust")) and "hauteur" not in l:
        return "P"
    if any(w in l for w in ("tour de taille", "waist")) or (l.strip() in ("taille", "taille (cm)")):
        return "T"
    if any(w in l for w in ("hanche", "bassin", "hip")):
        return "H"
    if any(w in l for w in ("épaule", "epaule", "carrure", "shoulder")):
        return "E"
    if any(w in l for w in ("cou", "encolure", "neck")):
        return "C"
    if any(w in l for w in ("cuisse", "thigh")):
        return "CU"
    if any(w in l for w in ("entrejambe", "inseam")):
        return "EJ"
    if any(w in l for w in ("longueur dos", "taille dos", "hauteur buste", "back waist", "back length")):
        return "LD"
    if any(w in l for w in ("longueur bras", "longueur de bras", "longueur manche", "sleeve length")):
        return "LB"
    if any(w in l for w in ("longueur vêtement", "longueur du vêtement", "longueur finie", "longueur totale", "garment length")):
        return "LV"
    if any(w in l for w in ("tour de bras", "biceps", "upper arm")):
        return "B"
    if c in _MEASURE_CODES or c in ("TISSU", "AUTRE"):
        return c
    return "AUTRE"


def _normalize_chart(raw: dict, image_uri: str | None = None) -> dict:
    headers = []
    for h in raw.get("headers") or []:
        lbl = str(h.get("label") or "").strip()
        if lbl:
            code = _infer_header_code(lbl, h.get("code") or "")
            headers.append({"label": lbl, "code": code})
    if not headers:
        headers = [
            {"label": "Tour de Poitrine", "code": "P"},
            {"label": "Tour de Taille", "code": "T"},
            {"label": "Tour de Hanches", "code": "H"},
            {"label": "Quantité tissu", "code": "TISSU"},
        ]
    sizes = []
    for s in raw.get("sizes") or []:
        t = _re.sub(r"^(?:taille|size)\s+", "", str(s.get("taille") or "").strip(), flags=_re.I).strip()
        if not t:
            continue
        vals = [str(v or "").strip() for v in (s.get("values") or [])]
        while len(vals) < len(headers):
            vals.append("")
        row: dict = {"taille": t, "values": vals[:len(headers)]}
        tissu_parts, extra_parts = [], []
        for idx, (h, v) in enumerate(zip(headers, row["values"])):
            if not v:
                continue
            code = h["code"]
            nums = _parse_numbers(v)
            if code in _MEASURE_CODES and nums:
                key = f"M_{idx}" if code == "MESURE" else code
                # Détecte si le 2e nombre est une vraie fourchette (ex: 86 / 90 cm) ou une traduction en inches (ex: 86 cm / 34")
                if len(nums) > 1 and nums[0] <= nums[1] <= nums[0] * 1.35:
                    lo, hi = nums[0], nums[1]
                else:
                    lo = hi = nums[0]
                if "m" in v.lower() and "cm" not in v.lower() and "mm" not in v.lower() and hi < 5:
                    lo, hi = round(lo * 100, 1), round(hi * 100, 1)
                row[key] = round((lo + hi) / 2, 1)
                row[f"{key}_min"] = round(lo, 1)
                row[f"{key}_max"] = round(hi, 1)
                row[f"{key}_txt"] = v
            elif code == "TISSU":
                tissu_parts.append(f"{h['label']} : {v}")
                if nums and "tissu_m" not in row:
                    val_m = nums[0] / 100.0 if "cm" in v.lower() or nums[0] > 15 else nums[0]
                    row["tissu_m"] = round(val_m, 2)
            else:
                extra_parts.append(f"{h['label']} : {v}")
        if tissu_parts:
            row["tissu_txt"] = " • ".join(tissu_parts)
        if extra_parts:
            row["fournitures_txt"] = " • ".join(extra_parts)
        sizes.append(row)
    return {
        "imageUri": image_uri if image_uri is not None else raw.get("imageUri"),
        "type_mesures": "vetement" if raw.get("type_mesures") == "vetement" else "corps",
        "headers": headers,
        "sizes": sizes,
        "error": raw.get("error", ""),
    }


@app.post("/api/patterns/{pid}/size-chart/scan")
def scan_size_chart(pid: str, file: UploadFile = File(...)):
    p = db.get_doc("patterns", pid)
    if not p:
        raise HTTPException(404)
    data = file.file.read()
    old_img = (p.get("sizeChart") or {}).get("imageUri")
    _remove_file(old_img)
    url = _save_upload(file, data)
    try:
        res = gemini.extract_size_chart(data, file.content_type or "image/jpeg")
        chart = _normalize_chart(res, url)
    except gemini.GeminiError as e:
        chart = _normalize_chart({"error": str(e)}, url)
    p["sizeChart"] = chart
    db.save_doc("patterns", p)
    return chart


@app.put("/api/patterns/{pid}/size-chart")
def save_size_chart(pid: str, payload: dict):
    p = db.get_doc("patterns", pid)
    if not p:
        raise HTTPException(404)
    old_img = (p.get("sizeChart") or {}).get("imageUri")
    chart = _normalize_chart(payload, payload.get("imageUri", old_img))
    p["sizeChart"] = chart
    db.save_doc("patterns", p)
    return chart


# --- ressources du dossier projet ------------------------------------------
@app.post("/api/patterns/{pid}/resources")
def add_resource(pid: str, type: str = Form(...), name: str = Form(""),
                 content: str = Form(""), file: UploadFile | None = File(None)):
    p = db.get_doc("patterns", pid)
    if not p:
        raise HTTPException(404)
    if file is not None:
        content = _save_upload(file)
        name = name or file.filename or "fichier"
        type = "pdf" if (file.content_type or "").endswith("pdf") else "image"
    res = {"id": uuid.uuid4().hex, "type": type, "name": name,
           "content": content, "createdAt": int(time.time() * 1000)}
    p.setdefault("resources", []).insert(0, res)
    db.save_doc("patterns", p)
    return res


@app.put("/api/patterns/{pid}/resources/{rid}")
def edit_note(pid: str, rid: str, payload: dict):
    p = db.get_doc("patterns", pid)
    if not p:
        raise HTTPException(404)
    for r in p.get("resources", []):
        if r["id"] == rid and r["type"] == "note":
            r["content"] = payload.get("content", "")
    db.save_doc("patterns", p)
    return {"ok": True}


@app.delete("/api/patterns/{pid}/resources/{rid}")
def delete_resource(pid: str, rid: str):
    p = db.get_doc("patterns", pid)
    if not p:
        raise HTTPException(404)
    keep = []
    for r in p.get("resources", []):
        if r["id"] == rid:
            if r["type"] in ("image", "pdf"):
                _remove_file(r["content"])
        else:
            keep.append(r)
    p["resources"] = keep
    db.save_doc("patterns", p)
    return {"ok": True}


# --- profils de mesures -----------------------------------------------------
@app.get("/api/profiles")
def list_profiles():
    return db.list_docs("profiles")


@app.post("/api/profiles")
def create_profile(profile: dict):
    profile["id"] = uuid.uuid4().hex
    profile["createdAt"] = int(time.time() * 1000)
    return db.save_doc("profiles", profile)


@app.put("/api/profiles/{pid}")
def update_profile(pid: str, profile: dict):
    old = db.get_doc("profiles", pid)
    if not old:
        raise HTTPException(404)
    profile.update(id=pid, createdAt=old.get("createdAt", 0))
    return db.save_doc("profiles", profile)


@app.delete("/api/profiles/{pid}")
def delete_profile(pid: str):
    db.delete_doc("profiles", pid)
    return {"ok": True}


# --- catégories -------------------------------------------------------------
@app.post("/api/categories")
def add_category(payload: dict):
    name = (payload.get("name") or "").strip()
    cats = db.get_categories()
    if name and name not in cats:
        cats.append(name)
        db.kv_set("categories", cats)
    return cats


@app.post("/api/categories/image")
def category_image(category: str = Form(...), file: UploadFile = File(...)):
    imgs = db.kv_get("category_images", {})
    _remove_file(imgs.get(category))
    imgs[category] = _save_upload(file)
    db.kv_set("category_images", imgs)
    return imgs


# --- IA ---------------------------------------------------------------------
def _ai(fn, *a):
    try:
        return fn(*a)
    except gemini.GeminiError as e:
        raise HTTPException(400, str(e))


@app.post("/api/analyze")
def analyze(file: UploadFile = File(...)):
    data = file.file.read()
    url = _save_upload(file, data)
    try:
        info = gemini.analyze_pattern_image(data, file.content_type or "image/jpeg",
                                            db.get_categories())
        return {"imageUri": url, "analysis": info}
    except gemini.GeminiError as e:
        # La photo est conservée, l'utilisateur remplit à la main
        return {"imageUri": url, "analysis": {}, "error": str(e)}


@app.post("/api/ai/search")
def ai_search(payload: dict):
    return _ai(gemini.search_sewing_info, payload["query"])


@app.post("/api/ai/think")
def ai_think(payload: dict):
    return {"text": _ai(gemini.ask_complex, payload["query"])}


@app.post("/api/ai/sketch")
def ai_sketch(payload: dict):
    return {"image": _ai(gemini.generate_sketch, payload["prompt"])}


@app.put("/api/settings")
def settings(payload: dict):
    key = (payload.get("geminiKey") or "").strip()
    if key:
        db.kv_set("gemini_key", key)
    return {"ok": True}


# --- sauvegarde / restauration (zip) ---------------------------------------
@app.get("/api/backup")
def backup():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("data.json", json.dumps({
            "patterns": db.list_docs("patterns"),
            "profiles": db.list_docs("profiles"),
            "categories": db.get_categories(),
            "categoryImages": db.kv_get("category_images", {}),
            "enseignes": db.list_docs("enseignes"),
            "products": db.list_docs("products"),
            "receipts": db.list_docs("receipts"),
            "shoppingList": db.kv_get("shopping_list", []),
        }, ensure_ascii=False))
        for f in UPLOAD_DIR.iterdir():
            z.write(f, f"uploads/{f.name}")
    stamp = time.strftime("%Y-%m-%d")
    return Response(buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="coutureia-{stamp}.zip"'})


def _data_uri_to_upload(uri: str | None) -> str | None:
    if not uri or not isinstance(uri, str) or not uri.startswith("data:"):
        return uri
    try:
        header, b64 = uri.split(",", 1)
        ext = ".png" if "image/png" in header else ".pdf" if "application/pdf" in header else ".jpg"
        raw = _b64.b64decode(b64)
        import hashlib
        name = f"{hashlib.md5(raw).hexdigest()}{ext}"
        (UPLOAD_DIR / name).write_bytes(raw)
        return f"/uploads/{name}"
    except Exception:
        return uri


@app.post("/api/restore")
def restore(file: UploadFile = File(...)):
    raw_bytes = file.file.read()
    try:
        if raw_bytes[:2] == b"PK":
            z = zipfile.ZipFile(io.BytesIO(raw_bytes))
            data = json.loads(z.read("data.json"))
            for n in z.namelist():
                if n.startswith("uploads/") and not n.endswith("/"):
                    (UPLOAD_DIR / Path(n).name).write_bytes(z.read(n))
        else:
            data = json.loads(raw_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Fichier de sauvegarde invalide (.zip ou .json attendu)")
    for p in data.get("patterns", []):
        if p.get("imageUri"):
            p["imageUri"] = _data_uri_to_upload(p["imageUri"])
        for r in p.get("resources") or []:
            if r.get("type") in ("image", "pdf") and r.get("content"):
                r["content"] = _data_uri_to_upload(r["content"])
        db.save_doc("patterns", p)
    for p in data.get("profiles", []):
        p.setdefault("createdAt", int(time.time() * 1000))
        db.save_doc("profiles", p)
    for table in ("enseignes", "products", "receipts"):
        for d in data.get(table, []):
            db.save_doc(table, d)
    if "shoppingList" in data:
        db.kv_set("shopping_list", data["shoppingList"])
    if data.get("categories"):
        db.kv_set("categories", data["categories"])
    if data.get("categoryImages"):
        cat_imgs = {k: _data_uri_to_upload(v) for k, v in data["categoryImages"].items() if v}
        db.kv_set("category_images", cat_imgs)
    return {"ok": True}


# --- synchronisation Cloud Firebase (export / import JSON + images) ---------
import base64 as _b64


def _collect_upload_refs(payload: dict) -> set[str]:
    refs: set[str] = set()
    for p in payload.get("patterns") or []:
        if p.get("imageUri"):
            refs.add(p["imageUri"])
        sc_uri = (p.get("sizeChart") or {}).get("imageUri")
        if sc_uri:
            refs.add(sc_uri)
        for r in p.get("resources") or []:
            if r.get("type") in ("image", "pdf") and r.get("content"):
                refs.add(r["content"])
    for r in payload.get("receipts") or []:
        if r.get("imageUri"):
            refs.add(r["imageUri"])
    for u in (payload.get("categoryImages") or {}).values():
        if u:
            refs.add(u)
    return {Path(u).name for u in refs if str(u).startswith("/uploads/")}


@app.get("/api/sync/export")
def sync_export():
    payload = {
        "patterns": db.list_docs("patterns"),
        "profiles": db.list_docs("profiles"),
        "categories": db.get_categories(),
        "categoryImages": db.kv_get("category_images", {}),
        "enseignes": db.list_docs("enseignes"),
        "products": db.list_docs("products"),
        "receipts": db.list_docs("receipts"),
        "shoppingList": db.kv_get("shopping_list", []),
        "geminiKey": db.kv_get("gemini_key") or "",
    }
    files = {}
    for fname in _collect_upload_refs(payload):
        fpath = UPLOAD_DIR / fname
        # Embarque les images/PDF jusqu'à 4 Mo chacun pour Firebase Realtime DB
        if fpath.exists() and fpath.stat().st_size <= 4_000_000:
            files[fname.replace(".", "_DOT_")] = _b64.b64encode(fpath.read_bytes()).decode("ascii")
    payload["files"] = files
    return payload


@app.post("/api/sync/import")
def sync_import(data: dict):
    for safe_name, b64 in (data.get("files") or {}).items():
        fname = Path(safe_name.replace("_DOT_", ".")).name
        target = UPLOAD_DIR / fname
        if not target.exists() and b64:
            try:
                target.write_bytes(_b64.b64decode(b64))
            except Exception:
                pass
    for table in ("patterns", "profiles", "receipts"):
        if isinstance(data.get(table), list):
            db.replace_table(table, data[table])
    for table in ("enseignes", "products"):
        if isinstance(data.get(table), list) and len(data[table]) > 0:
            db.replace_table(table, data[table])
    if isinstance(data.get("shoppingList"), list):
        db.kv_set("shopping_list", data["shoppingList"])
    if isinstance(data.get("categories"), list) and data["categories"]:
        db.kv_set("categories", data["categories"])
    if isinstance(data.get("categoryImages"), dict):
        db.kv_set("category_images", data["categoryImages"])
    if data.get("geminiKey") and not db.kv_get("gemini_key"):
        db.kv_set("gemini_key", data["geminiKey"])
    return {"ok": True}


# --- PWA / fichiers statiques ----------------------------------------------
@app.get("/sw.js")
def sw():
    return FileResponse(STATIC_DIR / "sw.js", media_type="application/javascript",
                        headers={"Cache-Control": "no-cache"})


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-cache"})


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
