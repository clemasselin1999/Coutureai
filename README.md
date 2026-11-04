# CoutureIA (version Python)

Gestion de patrons de couture avec IA (Gemini) – réécriture Python de l'app React.
Backend **FastAPI + SQLite**, interface **PWA** installable sur iPhone, iPad et Mac.

## Lancer en local
```
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
(Windows : double-clic sur `run.bat`.) Puis http://localhost:8000.
La clé Gemini se saisit dans **Réglages**, ou via la variable `GEMINI_API_KEY`.

## Installer sur l'iPhone de maman
iOS exige **HTTPS** pour installer une PWA : il faut donc héberger l'app.
1. Héberger le dossier (le `Dockerfile` est prêt) sur Fly.io / Render / Railway,
   avec un **volume persistant monté sur `/data`** (base + images).
2. Variables d'environnement conseillées :
   - `COUTUREIA_CODE` = un code d'accès (l'app est sur Internet !)
   - `GEMINI_API_KEY` = la clé Gemini
3. Sur l'iPhone, ouvrir l'URL dans **Safari** → Partager → **Sur l'écran d'accueil**.
4. Sur Mac (Safari) : Fichier → **Ajouter au Dock**.

Les données sont sur le serveur : iPhone et Mac sont synchronisés.
Sauvegarde/restauration complète (zip) dans Réglages.

## Variables d'environnement
`COUTUREIA_DATA` (dossier de données), `COUTUREIA_CODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

## Migration depuis l'ancienne app
Les données de l'app React étaient dans le `localStorage` du navigateur (format différent) : à ressaisir ou à convertir si besoin.
