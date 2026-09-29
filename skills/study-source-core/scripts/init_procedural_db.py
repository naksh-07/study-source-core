#!/usr/bin/env python3
"""
Procedural SQLite WAL Database Initializer & Importer (`init_procedural_db.py`)

Migrates the 54,744-line canonical contracts monolith (`studylab-canonical-contracts.json`)
into an indexed, high-performance embedded SQLite database (`resources/procedural.db`)
operating under Write-Ahead Logging (WAL) mode with 5000ms busy timeout.
"""

import sys
import os
import json
import sqlite3
from pathlib import Path


def init_procedural_database(contracts_json_path: Path, db_path: Path) -> int:
    """Initializes procedural.db and migrates contracts JSON into indexed relational tables."""
    if not contracts_json_path.exists():
        raise FileNotFoundError(f"Contracts JSON file not found: {contracts_json_path}")

    db_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[DB] Loading {contracts_json_path.name} ({contracts_json_path.stat().st_size} bytes)...")
    with open(contracts_json_path, 'r', encoding='utf-8') as f:
        contracts_data = json.load(f)

    total_keys = len(contracts_data)
    print(f"[DB] Read {total_keys} canonical contract families.")

    # Connect to SQLite
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Configure WAL mode & busy timeout to permanently eliminate Windows file lock contention
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA busy_timeout = 5000;")
    cursor.execute("PRAGMA synchronous = NORMAL;")

    # Schema creation
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS canonical_contracts (
        contract_key TEXT PRIMARY KEY,
        family_id TEXT,
        skill_id TEXT,
        domain TEXT,
        title TEXT,
        payload_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contracts_family ON canonical_contracts(family_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contracts_skill ON canonical_contracts(skill_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contracts_domain ON canonical_contracts(domain);")

    # Insert all contracts within a single transaction
    cursor.execute("BEGIN TRANSACTION;")
    inserted = 0

    for key, val in contracts_data.items():
        contract_obj = val.get('contract', {}) if isinstance(val, dict) else {}
        family_id = contract_obj.get('family_id') or key
        skill_id = contract_obj.get('skill_id')
        domain = contract_obj.get('domain')
        title = contract_obj.get('metadata', {}).get('title') or key

        payload_str = json.dumps(val, ensure_ascii=False)

        cursor.execute("""
        INSERT OR REPLACE INTO canonical_contracts 
        (contract_key, family_id, skill_id, domain, title, payload_json)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (key, family_id, skill_id, domain, title, payload_str))
        inserted += 1

    conn.commit()
    conn.close()

    print(f"[DB] Successfully migrated {inserted} contracts into {db_path.name} (WAL mode enabled).")
    return inserted


def main():
    script_dir = Path(__file__).parent
    default_contracts = script_dir.parent / "resources" / "schemas" / "studylab-canonical-contracts.json"
    default_db = script_dir.parent / "resources" / "procedural.db"

    contracts_p = Path(sys.argv[1]) if len(sys.argv) > 1 else default_contracts
    db_p = Path(sys.argv[2]) if len(sys.argv) > 2 else default_db

    try:
        init_procedural_database(contracts_p, db_p)
    except Exception as e:
        sys.stderr.write(f"[DB_ERROR] Migration failed: {str(e)}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
