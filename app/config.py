"""Configuration et constantes (équivalent de constants.ts / types.ts)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("COUTUREIA_DATA", BASE_DIR / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "coutureia.db"
STATIC_DIR = BASE_DIR / "app" / "static"

# Code d'accès optionnel (recommandé si l'app est hébergée sur Internet)
ACCESS_CODE = os.environ.get("COUTUREIA_CODE", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")

SEXES = ["Femme", "Homme", "Enfant", "Unisexe", "Autre"]
DEFAULT_CATEGORIES = [
    "Haut", "Bas", "Robe", "Manteau/Veste", "Sous-vêtement", "Accessoire", "Autre",
]
DEFAULT_MEASUREMENTS = [
    "Tour de poitrine", "Tour de taille", "Tour de hanches", "Hauteur totale",
    "Longueur bras", "Tour de cou", "Largeur épaules", "Hauteur buste",
]

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
