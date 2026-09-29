/**
 * Procedural Database Client (`procedural_db_client.js`)
 * 
 * High-performance access layer for procedural contracts and archetypes.
 * Interfaces with `resources/procedural.db` via native `better-sqlite3` with zero external daemons.
 * Provides fallback to `sql.js` or `studylab-canonical-contracts.json` if native driver or DB is not present.
 */

const fs = require('fs');
const path = require('path');

let betterDbInstance = null;
let sqlJsDbInstance = null;
let contractsCache = null;

const DB_PATH = path.resolve(__dirname, '../resources/procedural.db');
const JSON_PATH = path.resolve(__dirname, '../resources/schemas/studylab-canonical-contracts.json');

/**
 * Initializes and caches the native `better-sqlite3` Database connection.
 */
function getNativeDb() {
    if (betterDbInstance) return betterDbInstance;

    if (fs.existsSync(DB_PATH)) {
        try {
            const Database = require('better-sqlite3');
            betterDbInstance = new Database(DB_PATH, { readonly: true, timeout: 5000 });
            betterDbInstance.pragma('journal_mode = WAL');
            betterDbInstance.pragma('busy_timeout = 5000');
            return betterDbInstance;
        } catch (e) {
            // better-sqlite3 not available or failed to load
        }
    }

    return null;
}

/**
 * Initializes sql.js fallback database instance (if better-sqlite3 is unavailable).
 */
async function getSqlJsDb() {
    if (sqlJsDbInstance) return sqlJsDbInstance;

    if (fs.existsSync(DB_PATH)) {
        try {
            const initSqlJs = require('sql.js');
            const SQL = await initSqlJs();
            const fileBuffer = fs.readFileSync(DB_PATH);
            sqlJsDbInstance = new SQL.Database(fileBuffer);
            return sqlJsDbInstance;
        } catch (e) {
            console.warn(`[procedural_db_client] sql.js initialization failed: ${e.message}`);
        }
    }

    return null;
}

/**
 * Backward compatible getDb accessor (returns native db or sql.js db).
 */
async function getDb() {
    const nativeDb = getNativeDb();
    if (nativeDb) return nativeDb;
    return await getSqlJsDb();
}

/**
 * Synchronous sub-millisecond contract lookup by key, family_id, or skill_id.
 */
function getContractByKeySync(key) {
    if (!key) return null;

    const nativeDb = getNativeDb();
    if (nativeDb) {
        try {
            const stmt = nativeDb.prepare(`
                SELECT payload_json FROM canonical_contracts 
                WHERE contract_key = ? 
                   OR family_id = ? 
                   OR skill_id = ? 
                LIMIT 1
            `);
            const row = stmt.get(key, key, key);
            if (row && row.payload_json) {
                return JSON.parse(row.payload_json);
            }
            return null;
        } catch (e) {
            console.warn(`[procedural_db_client] Native SQLite query failed: ${e.message}`);
        }
    }

    // Fallback to cache
    const all = getAllContractsSync();
    return all[key] || null;
}

/**
 * Asynchronous retrieval of canonical contract (preserves async contract interface).
 */
async function getContractByKey(key) {
    return getContractByKeySync(key);
}

/**
 * Synchronous retrieval of all contracts.
 * Prioritizes querying procedural.db via better-sqlite3, completely bypassing the 54k-line JSON monolith.
 */
function getAllContractsSync() {
    if (contractsCache) return contractsCache;

    const nativeDb = getNativeDb();
    if (nativeDb) {
        try {
            const rows = nativeDb.prepare('SELECT contract_key, payload_json FROM canonical_contracts').all();
            contractsCache = {};
            for (const r of rows) {
                contractsCache[r.contract_key] = JSON.parse(r.payload_json);
            }
            return contractsCache;
        } catch (e) {
            console.warn(`[procedural_db_client] Native DB bulk read failed, falling back to JSON: ${e.message}`);
        }
    }

    // Fallback only if SQLite database is absent or unreadable
    if (fs.existsSync(JSON_PATH)) {
        try {
            contractsCache = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
        } catch (e) {
            console.warn(`[procedural_db_client] Could not load fallback JSON contracts: ${e.message}`);
            contractsCache = {};
        }
    } else {
        contractsCache = {};
    }

    return contractsCache;
}

module.exports = {
    getDb,
    getNativeDb,
    getContractByKey,
    getContractByKeySync,
    getAllContractsSync,
    DB_PATH,
    JSON_PATH
};
