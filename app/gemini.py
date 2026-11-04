"""Client Gemini (REST) : analyse de patron, recherche, questions complexes, croquis."""
import base64
import json

import httpx

from . import db
import os

from .config import GEMINI_API_KEY, GEMINI_MODEL

PRO_MODEL = os.environ.get("GEMINI_PRO_MODEL", GEMINI_MODEL)
IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")

API = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiError(Exception):
    pass


def _key() -> str:
    key = db.kv_get("gemini_key") or GEMINI_API_KEY
    if not key:
        raise GeminiError("Clé API Gemini manquante. Ajoutez-la dans Paramètres.")
    return key


def _call(model: str, payload: dict) -> dict:
    try:
        r = httpx.post(
            f"{API}/{model}:generateContent",
            params={"key": _key()},
            json=payload,
            timeout=120,
        )
    except httpx.HTTPError as e:
        raise GeminiError(f"Erreur réseau : {e}") from e
    if r.status_code != 200:
        raise GeminiError(f"Gemini a répondu {r.status_code} : {r.text[:300]}")
    return r.json()


def _text(resp: dict) -> str:
    parts = resp.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts)


ANALYZE_PROMPT = """Tu es un expert en couture et modélisme. Analyse cette image de pochette de patron.

Tâches prioritaires :
1. TRANSCRIPTION : Lis le texte pour trouver la Marque (ex: Burda, Vogue, marques indépendantes) et le Nom/Numéro du modèle.
2. ANALYSE VISUELLE : Identifie le type de vêtement précis (subCategory) et la catégorie principale.
3. EXPERTISE : Suggère des tissus adaptés au tombé du vêtement et estime la difficulté.

Remplis les champs JSON suivants :
- name: Le nom ou numéro exact du modèle.
- brand: La marque du patron.
- category: Une parmi : {categories}.
- subCategory: Type précis (ex: Blouse à col claudine, Jupe crayon).
- sex: Femme, Homme, Enfant, Unisexe, ou Autre.
- difficulty: Facile, Intermédiaire, ou Avancé.
- fabricSuggestions: Liste de 3-4 tissus recommandés.
- notes: Une description concise du modèle en français."""

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "name": {"type": "STRING"},
        "brand": {"type": "STRING"},
        "category": {"type": "STRING"},
        "subCategory": {"type": "STRING"},
        "sex": {"type": "STRING"},
        "difficulty": {"type": "STRING"},
        "fabricSuggestions": {"type": "ARRAY", "items": {"type": "STRING"}},
        "notes": {"type": "STRING"},
    },
}


def analyze_pattern_image(image: bytes, mime: str, categories: list[str]) -> dict:
    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": mime, "data": base64.b64encode(image).decode()}},
                {"text": ANALYZE_PROMPT.format(categories=", ".join(categories))},
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": SCHEMA,
        },
    }
    return json.loads(_text(_call(GEMINI_MODEL, payload)) or "{}")


def search_sewing_info(query: str) -> dict:
    payload = {"contents": [{"parts": [{"text": query}]}], "tools": [{"google_search": {}}]}
    resp = _call(GEMINI_MODEL, payload)
    chunks = (resp.get("candidates", [{}])[0].get("groundingMetadata", {})
              .get("groundingChunks", []))
    sources = [{"uri": c["web"]["uri"], "title": c["web"].get("title", "")}
               for c in chunks if "web" in c]
    return {"text": _text(resp), "sources": sources}


def ask_complex(query: str) -> str:
    payload = {"contents": [{"parts": [{"text": query}]}]}
    return _text(_call(PRO_MODEL, payload))


def generate_sketch(prompt: str) -> str | None:
    payload = {
        "contents": [{"parts": [{"text": f"Fashion sketch, detailed sewing illustration style: {prompt}"}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    resp = _call(IMAGE_MODEL, payload)
    for p in resp.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        d = p.get("inlineData") or p.get("inline_data")
        if d:
            return f"data:{d.get('mimeType', 'image/png')};base64,{d['data']}"
    return None


RECEIPT_PROMPT = """Tu lis un ticket de caisse ou une facture d'une mercerie / magasin de tissus (France).
Extrais :
- magasin : l'enseigne imprimée sur le ticket. Si elle ressemble à l'une de ces enseignes connues, utilise exactement son nom : {stores}.
- date : au format AAAA-MM-JJ.
- total : montant total TTC payé (nombre).
- lignes : une par article acheté, avec
  - libelle : texte exact du ticket,
  - produit : si l'article correspond à un de ces produits connus, recopie EXACTEMENT son nom, sinon donne un nom court et générique en français (ex: "Élastique standard / maille (5-20 mm)", "Bobine de fil poly 200m") : {products},
  - quantite : nombre (mètres pour un tissu ou ruban vendu au mètre, sinon nombre d'unités),
  - unite : "mètre" ou "unité",
  - prix_unitaire : prix pour 1 mètre ou 1 unité (nombre),
  - prix_total : prix de la ligne.
Ignore les lignes de remise globale, de TVA, de monnaie rendue et de sacs. Les nombres utilisent le point décimal."""

RECEIPT_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "magasin": {"type": "STRING"},
        "date": {"type": "STRING"},
        "total": {"type": "NUMBER"},
        "lignes": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "libelle": {"type": "STRING"}, "produit": {"type": "STRING"},
            "quantite": {"type": "NUMBER"}, "unite": {"type": "STRING"},
            "prix_unitaire": {"type": "NUMBER"}, "prix_total": {"type": "NUMBER"}}}},
    },
}


def extract_receipt(image: bytes, mime: str, stores: list[str], products: list[str]) -> dict:
    payload = {
        "contents": [{"parts": [
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(image).decode()}},
            {"text": RECEIPT_PROMPT.format(stores=", ".join(stores), products=" | ".join(products))},
        ]}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": RECEIPT_SCHEMA},
    }
    return json.loads(_text(_call(GEMINI_MODEL, payload)) or "{}")


SIZE_CHART_PROMPT = """Tu lis la photo du tableau des tailles et fournitures/métrages d'un patron de couture.
Recopie FIDÈLEMENT le tableau visible sur l'image :
1. `headers` : la liste des intitulés de lignes/mesures présents sur l'image, dans l'ordre exact de l'image.
   Pour chaque intitulé, indique :
   - `label` : le nom exact écrit sur l'image (ex: "Tour de Poitrine", "Tour de Taille", "Quantité tissu", "Taille fermeture").
   - `code` : le code standard correspondant parmi :
     * "HT" = Stature / Hauteur totale du corps (ex: "Stature", "Height", "Hauteur totale")
     * "P" = Tour de poitrine / buste (Chest / Bust)
     * "T" = Tour de taille (Waist)
     * "H" = Tour de hanches / bassin (Hips)
     * "E" = Largeur épaules / carrure (Shoulder)
     * "C" = Tour de cou / encolure (Neck)
     * "B" = Tour de bras / biceps
     * "CU" = Tour de cuisse (Thigh)
     * "LD" = Longueur taille dos / hauteur buste (Back waist length)
     * "LB" = Longueur de bras / manche (Sleeve length)
     * "LV" = Longueur du vêtement (Garment length)
     * "EJ" = Longueur d'entrejambe (Inseam)
     * "MESURE" = Autre mesure en cm du corps ou du vêtement (ex: Tour de tête, Tour de poignet, Hauteur fourche...)
     * "TISSU" = Quantité / métrage de tissu (ex: Tissu principal, Fabric, Manches longues/courtes en tissu, Empiècement, Doublure, Bord-côte...)
     * "AUTRE" = Autre fourniture (ex: Taille fermeture, boutons, élastique, aiguilles...)
2. `sizes` : une entrée par colonne/taille du tableau (ex: "S", "M / L", "XL" ou "36", "38", "40").
   - `taille` : le nom de la taille (sans le mot "Taille" devant si possible, ex: "S", "M / L", "XL", "38").
   - `values` : liste des valeurs pour chaque ligne de `headers` (dans le même ordre), recopiées EXACTEMENT comme sur l'image (ex: "86 / 90 cm", "90 cm", "1 m", "60 cm").
3. `type_mesures` : "vetement" s'il est écrit que ce sont les mesures du vêtement fini, sinon "corps"."""

SIZE_CHART_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "type_mesures": {"type": "STRING"},
        "headers": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "label": {"type": "STRING"},
                    "code": {"type": "STRING"},
                },
            },
        },
        "sizes": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "taille": {"type": "STRING"},
                    "values": {"type": "ARRAY", "items": {"type": "STRING"}},
                },
            },
        },
    },
}


def extract_size_chart(image: bytes, mime: str) -> dict:
    payload = {
        "contents": [{"parts": [
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(image).decode()}},
            {"text": SIZE_CHART_PROMPT},
        ]}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": SIZE_CHART_SCHEMA},
    }
    return json.loads(_text(_call(GEMINI_MODEL, payload)) or "{}")
