/**
 * study-source-core Shared Anki Package Utilities (`shared_anki_utils.js`)
 * 
 * Centralized helpers for SQLite schema setup, GUID calculation, field checksums,
 * and ZIP package assembly shared between declarative and procedural Anki exporters.
 */

const crypto = require('crypto');
const JSZip = require('jszip');

/**
 * Generates a deterministic 10-character Base91-like GUID from input string.
 */
function generateDeterministicGuid(seed) {
    const hash = crypto.createHash('sha256').update(seed).digest('base64');
    return hash.replace(/[/+=]/g, 'a').substring(0, 10);
}

/**
 * Calculates 32-bit checksum for Anki sfld (first 8 hex chars of sha1 as integer).
 */
function calculateFieldChecksum(sfld) {
    const safeStr = typeof sfld === 'string' ? sfld : String(sfld || '');
    const sha1 = crypto.createHash('sha1').update(safeStr).digest('hex');
    return parseInt(sha1.substring(0, 8), 16);
}

/**
 * Initializes standard Anki SQLite schema tables (col, notes, cards, revlog, graves, indices).
 */
function initializeAnkiSchema(db) {
    db.run(`
        CREATE TABLE col (
            id              integer primary key,
            crt             integer not null,
            mod             integer not null,
            scm             integer not null,
            ver             integer not null,
            dty             integer not null,
            usn             integer not null,
            ls              integer not null,
            conf            text not null,
            models          text not null,
            decks           text not null,
            dconf           text not null,
            tags            text not null
        );
        CREATE TABLE notes (
            id              integer primary key,
            guid            text not null,
            mid             integer not null,
            mod             integer not null,
            usn             integer not null,
            tags            text not null,
            flds            text not null,
            sfld            text not null,
            csum            integer not null,
            flags           integer not null,
            data            text not null
        );
        CREATE TABLE cards (
            id              integer primary key,
            nid             integer not null,
            did             integer not null,
            ord             integer not null,
            mod             integer not null,
            usn             integer not null,
            type            integer not null,
            queue           integer not null,
            due             integer not null,
            ivl             integer not null,
            factor          integer not null,
            reps            integer not null,
            lapses          integer not null,
            left            integer not null,
            odue            integer not null,
            odid            integer not null,
            flags           integer not null,
            data            text not null
        );
        CREATE TABLE revlog (
            id              integer primary key,
            cid             integer not null,
            usn             integer not null,
            ease            integer not null,
            ivl             integer not null,
            lastIvl         integer not null,
            factor          integer not null,
            time            integer not null,
            type            integer not null
        );
        CREATE TABLE graves (
            usn             integer not null,
            oid             integer not null,
            type            integer not null
        );
        CREATE INDEX ix_notes_usn on notes (usn);
        CREATE INDEX ix_notes_csum on notes (csum);
        CREATE INDEX ix_cards_usn on cards (usn);
        CREATE INDEX ix_cards_nid on cards (nid);
        CREATE INDEX ix_cards_sched on cards (did, queue, due);
        CREATE INDEX ix_revlog_usn on revlog (usn);
        CREATE INDEX ix_revlog_cid on revlog (cid);
    `);
}

/**
 * Builds default decks and dconf configuration objects.
 */
function buildDeckConfigurations(deckId, deckName, description = '') {
    const nowSecs = 1700000000;
    const decksConfig = {
        "1": {
            "id": 1,
            "mod": nowSecs,
            "name": "Default",
            "usn": 0,
            "desc": "",
            "dyn": 0,
            "conf": 1,
            "extendNew": 0,
            "extendRev": 0,
            "collapsed": false,
            "browserCollapsed": false,
            "lrnToday": [0, 0],
            "revToday": [0, 0],
            "newToday": [0, 0],
            "timeToday": [0, 0]
        },
        [deckId.toString()]: {
            "id": deckId,
            "mod": nowSecs,
            "name": deckName,
            "usn": -1,
            "desc": description || deckName,
            "dyn": 0,
            "conf": 1,
            "extendNew": 0,
            "extendRev": 0,
            "collapsed": false,
            "browserCollapsed": false,
            "lrnToday": [0, 0],
            "revToday": [0, 0],
            "newToday": [0, 0],
            "timeToday": [0, 0]
        }
    };

    const dconfConfig = {
        "1": {
            "id": 1,
            "mod": nowSecs,
            "name": "Default",
            "usn": 0,
            "maxTaken": 60,
            "autoplay": true,
            "timer": 0,
            "replayq": true,
            "new": { "bury": false, "delays": [1, 10], "initialFactor": 2500, "ints": [1, 4, 0], "order": 1, "perDay": 20 },
            "rev": { "bury": false, "ease4": 1.3, "ivlFct": 1, "maxIvl": 36500, "perDay": 200, "hardFactor": 1.2 },
            "lapse": { "delays": [10], "leechAction": 0, "leechFails": 8, "minInt": 1, "mult": 0 }
        }
    };

    const globalConf = {
        "nextPos": 1,
        "estTimes": true,
        "activeDecks": [deckId],
        "sortType": "noteFld",
        "timeLim": 0,
        "sortBackwards": false,
        "addToCur": true,
        "curDeck": deckId,
        "curModel": null,
        "collapseTime": 1200
    };

    return { decksConfig, dconfConfig, globalConf, nowSecs, nowMs: 1700000000000 };
}

/**
 * Packages SQLite database and media files into an APKG ZIP buffer.
 */
async function assembleApkgZip(dbBuffer, mediaFilesMap = new Map()) {
    const zip = new JSZip();
    zip.file('collection.anki2', dbBuffer);

    const mediaMap = {};
    let mediaIndex = 0;

    if (mediaFilesMap && mediaFilesMap.size > 0) {
        const fs = require('fs');
        for (const [filename, absPath] of mediaFilesMap.entries()) {
            const indexStr = mediaIndex.toString();
            mediaMap[indexStr] = filename;
            const mediaBuffer = fs.readFileSync(absPath);
            zip.file(indexStr, mediaBuffer);
            mediaIndex++;
        }
    }

    zip.file('media', JSON.stringify(mediaMap));

    return await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
}

module.exports = {
    generateDeterministicGuid,
    calculateFieldChecksum,
    initializeAnkiSchema,
    buildDeckConfigurations,
    assembleApkgZip
};
