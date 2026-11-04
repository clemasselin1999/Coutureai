"""Stockage SQLite : documents JSON (patrons, profils) + clé/valeur (réglages)."""
import json
import sqlite3
from contextlib import contextmanager

from .config import DB_PATH, DEFAULT_CATEGORIES


@contextmanager
def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init_db():
    with conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS patterns (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS enseignes (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            """
        )


# --- documents -------------------------------------------------------------
def list_docs(table: str) -> list[dict]:
    with conn() as c:
        rows = c.execute(f"SELECT data FROM {table}").fetchall()
    docs = [json.loads(r["data"]) for r in rows]
    docs.sort(key=lambda d: d.get("createdAt", 0), reverse=True)
    return docs


def get_doc(table: str, id_: str) -> dict | None:
    with conn() as c:
        r = c.execute(f"SELECT data FROM {table} WHERE id=?", (id_,)).fetchone()
    return json.loads(r["data"]) if r else None


def save_doc(table: str, doc: dict) -> dict:
    with conn() as c:
        c.execute(
            f"INSERT INTO {table}(id,data) VALUES(?,?) "
            "ON CONFLICT(id) DO UPDATE SET data=excluded.data",
            (doc["id"], json.dumps(doc, ensure_ascii=False)),
        )
    return doc


def delete_doc(table: str, id_: str):
    with conn() as c:
        c.execute(f"DELETE FROM {table} WHERE id=?", (id_,))


def replace_table(table: str, docs: list[dict]):
    with conn() as c:
        c.execute(f"DELETE FROM {table}")
        for doc in docs:
            if doc and doc.get("id"):
                c.execute(
                    f"INSERT INTO {table}(id,data) VALUES(?,?)",
                    (doc["id"], json.dumps(doc, ensure_ascii=False)),
                )


# --- clé/valeur ------------------------------------------------------------
def kv_get(key: str, default=None):
    with conn() as c:
        r = c.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
    return json.loads(r["value"]) if r else default


def kv_set(key: str, value):
    with conn() as c:
        c.execute(
            "INSERT INTO kv(key,value) VALUES(?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )


def get_categories() -> list[str]:
    return kv_get("categories", list(DEFAULT_CATEGORIES))
