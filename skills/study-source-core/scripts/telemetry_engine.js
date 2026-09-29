/**
 * StudySourceCore Telemetry & Observability Engine (`telemetry_engine.js`)
 * 
 * Provides unified, high-resolution tracing, structured logging, token estimation,
 * latency profiling, and calibration diagnostics across all pipeline layers:
 * - ORCHESTRATOR (DAG scheduling, Wave 1-3 lifecycle, dependency barriers)
 * - SUBAGENT (LLM specialist execution, prompt/response tokens, model tiers, retries)
 * - SCRIPT_TOOL (Deterministic packaging, compilers, CLI verbs, file operations)
 * - VALIDATOR (AST validation, schema checks, hint leak detection)
 * - MCP (Model Context Protocol stdio tool requests)
 * 
 * Persistence Architecture:
 * 1. Append-Only JSONL Streaming: `scratch/telemetry/studycore_events.jsonl`
 * 2. SQLite WAL Telemetry Database: `scratch/telemetry/studycore_telemetry.db`
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const DEFAULT_TELEMETRY_DIR = path.resolve(__dirname, 'scratch/telemetry');
const DEFAULT_LOG_PATH = path.join(DEFAULT_TELEMETRY_DIR, 'studycore_events.jsonl');
const DEFAULT_DB_PATH = path.join(DEFAULT_TELEMETRY_DIR, 'studycore_telemetry.db');

let sqliteDbInstance = null;
let sqliteAvailable = false;

// Layer Enumeration
const TELEMETRY_LAYERS = {
    ORCHESTRATOR: 'ORCHESTRATOR',
    SUBAGENT: 'SUBAGENT',
    SCRIPT_TOOL: 'SCRIPT_TOOL',
    VALIDATOR: 'VALIDATOR',
    MCP: 'MCP',
    CLI: 'CLI'
};

// Span Status
const SPAN_STATUS = {
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    RETRY: 'RETRY',
    SKIPPED: 'SKIPPED'
};

/**
 * Ensures telemetry directory exists.
 */
function ensureTelemetryDir(dir = DEFAULT_TELEMETRY_DIR) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Initializes or retrieves SQLite database for structured telemetry queries.
 */
function getTelemetryDatabase(dbPath = DEFAULT_DB_PATH) {
    if (sqliteDbInstance) return sqliteDbInstance;

    try {
        ensureTelemetryDir(path.dirname(dbPath));
        const Database = require('better-sqlite3');
        const db = new Database(dbPath, { timeout: 5000 });
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');

        // Create telemetry schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS telemetry_spans (
                span_id TEXT PRIMARY KEY,
                trace_id TEXT NOT NULL,
                parent_span_id TEXT,
                layer TEXT NOT NULL,
                name TEXT NOT NULL,
                subject TEXT,
                chapter TEXT,
                status TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration_ms REAL,
                model_class TEXT,
                context_strategy TEXT,
                tokens_in INTEGER DEFAULT 0,
                tokens_out INTEGER DEFAULT 0,
                attempt INTEGER DEFAULT 1,
                error_message TEXT,
                metadata_json TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_spans_trace ON telemetry_spans(trace_id);
            CREATE INDEX IF NOT EXISTS idx_spans_layer ON telemetry_spans(layer);
            CREATE INDEX IF NOT EXISTS idx_spans_name ON telemetry_spans(name);
            CREATE INDEX IF NOT EXISTS idx_spans_status ON telemetry_spans(status);

            CREATE TABLE IF NOT EXISTS telemetry_traces (
                trace_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                subject TEXT,
                chapter TEXT,
                status TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                total_duration_ms REAL,
                total_spans INTEGER DEFAULT 0,
                total_llm_tokens INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );
        `);

        sqliteDbInstance = db;
        sqliteAvailable = true;
        return db;
    } catch (e) {
        // Fallback gracefully if native sqlite fails
        sqliteAvailable = false;
        return null;
    }
}

/**
 * Estimates token count from text using standard ~4 characters per token heuristic.
 */
function estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Creates and starts a new telemetry span.
 */
class TelemetrySpan {
    constructor(options = {}) {
        this.spanId = options.spanId || crypto.randomBytes(8).toString('hex');
        this.traceId = options.traceId || options.missionId || `trace_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        this.parentSpanId = options.parentSpanId || null;
        this.layer = options.layer || TELEMETRY_LAYERS.SCRIPT_TOOL;
        this.name = options.name || 'unnamed_span';
        this.subject = options.subject || null;
        this.chapter = options.chapter || null;
        this.status = SPAN_STATUS.RUNNING;
        
        this.startTime = new Date().toISOString();
        this._startHighRes = performance.now();
        this.endTime = null;
        this.durationMs = null;

        this.modelClass = options.modelClass || null;
        this.contextStrategy = options.contextStrategy || null;
        this.tokensIn = options.tokensIn || 0;
        this.tokensOut = options.tokensOut || 0;
        this.attempt = options.attempt || 1;
        this.errorMessage = null;
        this.metadata = options.metadata || {};

        this._logPath = options.logPath || DEFAULT_LOG_PATH;
        this._dbPath = options.dbPath || DEFAULT_DB_PATH;

        // Auto-estimate input tokens if contextText is provided
        if (options.contextText && !this.tokensIn) {
            this.tokensIn = estimateTokens(options.contextText);
        }

        // Stream initial span start to JSONL
        this._recordEvent('SPAN_START');
    }

    /**
     * Updates span metadata or token counts dynamically during execution.
     */
    update(data = {}) {
        if (data.tokensIn !== undefined) this.tokensIn = data.tokensIn;
        if (data.tokensOut !== undefined) this.tokensOut = data.tokensOut;
        if (data.modelClass !== undefined) this.modelClass = data.modelClass;
        if (data.contextStrategy !== undefined) this.contextStrategy = data.contextStrategy;
        if (data.attempt !== undefined) this.attempt = data.attempt;
        if (data.responseText && !this.tokensOut) {
            this.tokensOut = estimateTokens(data.responseText);
        }
        if (data.metadata) {
            this.metadata = { ...this.metadata, ...data.metadata };
        }
    }

    /**
     * Records an interim event or retry attempt on this span.
     */
    recordEvent(eventType, eventData = {}) {
        this._recordEvent(eventType, eventData);
    }

    /**
     * Completes the span with SUCCESS status.
     */
    end(resultData = {}) {
        this.update(resultData);
        this.status = SPAN_STATUS.SUCCESS;
        this.endTime = new Date().toISOString();
        this.durationMs = Math.round((performance.now() - this._startHighRes) * 100) / 100;

        this._recordEvent('SPAN_END');
        this._persistToDatabase();
        return this;
    }

    /**
     * Ends the span with FAILED status and records error details.
     */
    fail(error, resultData = {}) {
        this.update(resultData);
        this.status = SPAN_STATUS.FAILED;
        this.endTime = new Date().toISOString();
        this.durationMs = Math.round((performance.now() - this._startHighRes) * 100) / 100;
        this.errorMessage = error ? (error.message || String(error)) : 'Unknown error';

        if (error && error.stack) {
            this.metadata.stack = error.stack.split('\n').slice(0, 5).join('\n');
        }

        this._recordEvent('SPAN_FAIL');
        this._persistToDatabase();
        return this;
    }

    /**
     * Ends the span with SKIPPED status.
     */
    skip(reason = 'Condition not met') {
        this.status = SPAN_STATUS.SKIPPED;
        this.endTime = new Date().toISOString();
        this.durationMs = Math.round((performance.now() - this._startHighRes) * 100) / 100;
        this.metadata.skipReason = reason;

        this._recordEvent('SPAN_SKIP');
        this._persistToDatabase();
        return this;
    }

    /**
     * Internal event recording to JSONL streaming log.
     */
    _recordEvent(eventType, extra = {}) {
        try {
            ensureTelemetryDir(path.dirname(this._logPath));
            const record = {
                timestamp: new Date().toISOString(),
                event_type: eventType,
                span_id: this.spanId,
                trace_id: this.traceId,
                parent_span_id: this.parentSpanId,
                layer: this.layer,
                name: this.name,
                subject: this.subject,
                chapter: this.chapter,
                status: this.status,
                duration_ms: this.durationMs,
                model_class: this.modelClass,
                context_strategy: this.contextStrategy,
                tokens_in: this.tokensIn,
                tokens_out: this.tokensOut,
                attempt: this.attempt,
                error: this.errorMessage,
                metadata: this.metadata,
                ...extra
            };
            fs.appendFileSync(this._logPath, JSON.stringify(record) + '\n', 'utf8');
        } catch (e) {
            // Non-fatal telemetry logging
        }
    }

    /**
     * Persists terminal span record to SQLite WAL database.
     */
    _persistToDatabase() {
        const db = getTelemetryDatabase(this._dbPath);
        if (!db) return;

        try {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO telemetry_spans (
                    span_id, trace_id, parent_span_id, layer, name,
                    subject, chapter, status, start_time, end_time,
                    duration_ms, model_class, context_strategy,
                    tokens_in, tokens_out, attempt, error_message, metadata_json
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?, ?
                )
            `);

            stmt.run(
                this.spanId,
                this.traceId,
                this.parentSpanId,
                this.layer,
                this.name,
                this.subject,
                this.chapter,
                this.status,
                this.startTime,
                this.endTime,
                this.durationMs,
                this.modelClass,
                this.contextStrategy,
                this.tokensIn || 0,
                this.tokensOut || 0,
                this.attempt || 1,
                this.errorMessage,
                JSON.stringify(this.metadata || {})
            );
        } catch (e) {
            // Non-fatal database persistence error
        }
    }
}

/**
 * Top-level Telemetry Tracker & Calibration Service.
 */
class TelemetryEngine {
    constructor(options = {}) {
        this.dir = options.telemetryDir || DEFAULT_TELEMETRY_DIR;
        this.logPath = options.logPath || DEFAULT_LOG_PATH;
        this.dbPath = options.dbPath || DEFAULT_DB_PATH;
        ensureTelemetryDir(this.dir);
    }

    /**
     * Starts a new span.
     */
    startSpan(options = {}) {
        return new TelemetrySpan({
            ...options,
            logPath: options.logPath || this.logPath,
            dbPath: options.dbPath || this.dbPath
        });
    }

    /**
     * Wraps an async function in a tracked telemetry span.
     */
    async trackAsync(spanOptions, asyncFn) {
        const span = this.startSpan(spanOptions);
        try {
            const result = await asyncFn(span);
            span.end(typeof result === 'object' && result ? { metadata: { resultSummary: result.status || 'OK' } } : {});
            return result;
        } catch (err) {
            span.fail(err);
            throw err;
        }
    }

    /**
     * Wraps a synchronous function in a tracked telemetry span.
     */
    trackSync(spanOptions, syncFn) {
        const span = this.startSpan(spanOptions);
        try {
            const result = syncFn(span);
            span.end(typeof result === 'object' && result ? { metadata: { resultSummary: result.status || 'OK' } } : {});
            return result;
        } catch (err) {
            span.fail(err);
            throw err;
        }
    }

    /**
     * Retrieves all recorded spans from SQLite or JSONL.
     */
    getSpans(filter = {}) {
        const db = getTelemetryDatabase(this.dbPath);
        if (db) {
            let sql = `SELECT * FROM telemetry_spans WHERE 1=1`;
            const params = [];
            if (filter.traceId) {
                sql += ` AND trace_id = ?`;
                params.push(filter.traceId);
            }
            if (filter.layer) {
                sql += ` AND layer = ?`;
                params.push(filter.layer);
            }
            if (filter.subject) {
                sql += ` AND subject = ?`;
                params.push(filter.subject);
            }
            if (filter.chapter) {
                sql += ` AND chapter = ?`;
                params.push(filter.chapter);
            }
            if (filter.status) {
                sql += ` AND status = ?`;
                params.push(filter.status);
            }
            sql += ` ORDER BY start_time DESC LIMIT ?`;
            params.push(filter.limit || 100);

            try {
                return db.prepare(sql).all(...params).map(row => ({
                    ...row,
                    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
                }));
            } catch (e) {}
        }

        // Fallback: Parse JSONL log file
        return this._getSpansFromJsonl(filter);
    }

    _getSpansFromJsonl(filter = {}) {
        if (!fs.existsSync(this.logPath)) return [];
        try {
            const content = fs.readFileSync(this.logPath, 'utf8');
            const lines = content.trim().split('\n').filter(Boolean);
            const spansMap = new Map();

            for (const line of lines) {
                try {
                    const evt = JSON.parse(line);
                    if (evt.event_type === 'SPAN_END' || evt.event_type === 'SPAN_FAIL' || evt.event_type === 'SPAN_SKIP') {
                        spansMap.set(evt.span_id, evt);
                    }
                } catch (e) {}
            }

            let results = Array.from(spansMap.values());
            if (filter.traceId) results = results.filter(s => s.trace_id === filter.traceId);
            if (filter.layer) results = results.filter(s => s.layer === filter.layer);
            if (filter.subject) results = results.filter(s => s.subject === filter.subject);
            if (filter.chapter) results = results.filter(s => s.chapter === filter.chapter);
            if (filter.status) results = results.filter(s => s.status === filter.status);

            results.reverse();
            return results.slice(0, filter.limit || 100);
        } catch (e) {
            return [];
        }
    }

    /**
     * Computes deep calibration analytics and production-readiness scorecard.
     */
    getCalibrationReport(filter = {}) {
        const spans = this.getSpans({ ...filter, limit: 1000 });
        if (spans.length === 0) {
            return {
                status: 'NO_DATA',
                message: 'No telemetry spans recorded yet. Execute pipeline runs to collect metrics.',
                total_spans: 0,
                latencies: {
                    p50_ms: 0,
                    p90_ms: 0,
                    max_ms: 0,
                    all_durations: []
                },
                token_economy: {
                    total_tokens_in: 0,
                    total_tokens_out: 0,
                    total_tokens: 0,
                    avg_tokens_per_llm_call: 0
                },
                subagents: {},
                validators: {},
                tools: {},
                failure_analysis: {
                    success_count: 0,
                    failed_count: 0,
                    retry_count: 0,
                    skipped_count: 0,
                    error_types: {}
                },
                recommendations: ['Run `npm run smoke` or `studycore verify` to seed telemetry.']
            };
        }

        const report = {
            status: 'CALIBRATED',
            total_spans: spans.length,
            layers: {},
            subagents: {},
            validators: {},
            tools: {},
            token_economy: {
                total_tokens_in: 0,
                total_tokens_out: 0,
                total_tokens: 0,
                avg_tokens_per_llm_call: 0
            },
            latencies: {
                p50_ms: 0,
                p90_ms: 0,
                max_ms: 0,
                all_durations: []
            },
            failure_analysis: {
                success_count: 0,
                failed_count: 0,
                retry_count: 0,
                skipped_count: 0,
                error_types: {}
            },
            recommendations: []
        };

        const durations = [];
        let llmCallsCount = 0;

        for (const span of spans) {
            const dur = span.duration_ms || 0;
            durations.push(dur);

            // Layer aggregation
            report.layers[span.layer] = (report.layers[span.layer] || 0) + 1;

            // Status aggregation
            if (span.status === SPAN_STATUS.SUCCESS) report.failure_analysis.success_count++;
            else if (span.status === SPAN_STATUS.FAILED) {
                report.failure_analysis.failed_count++;
                const errKey = span.error_message ? span.error_message.slice(0, 50) : 'UnknownError';
                report.failure_analysis.error_types[errKey] = (report.failure_analysis.error_types[errKey] || 0) + 1;
            } else if (span.status === SPAN_STATUS.SKIPPED) report.failure_analysis.skipped_count++;

            // Token tracking
            const tIn = span.tokens_in || 0;
            const tOut = span.tokens_out || 0;
            report.token_economy.total_tokens_in += tIn;
            report.token_economy.total_tokens_out += tOut;
            report.token_economy.total_tokens += (tIn + tOut);

            // Subagent metrics
            if (span.layer === TELEMETRY_LAYERS.SUBAGENT) {
                llmCallsCount++;
                const agent = span.name.replace(/^subagent:/, '').split(':')[0];
                if (!report.subagents[agent]) {
                    report.subagents[agent] = {
                        invocations: 0,
                        failures: 0,
                        retries: 0,
                        durations: [],
                        tokens_in: 0,
                        tokens_out: 0,
                        model_classes: {}
                    };
                }
                const sa = report.subagents[agent];
                sa.invocations++;
                if (span.status === SPAN_STATUS.FAILED) sa.failures++;
                if (span.attempt > 1) sa.retries += (span.attempt - 1);
                sa.durations.push(dur);
                sa.tokens_in += tIn;
                sa.tokens_out += tOut;
                if (span.model_class) {
                    sa.model_classes[span.model_class] = (sa.model_classes[span.model_class] || 0) + 1;
                }
            }

            // Validator metrics
            if (span.layer === TELEMETRY_LAYERS.VALIDATOR) {
                const val = span.name.replace(/^validator:/, '').split(':')[0];
                if (!report.validators[val]) {
                    report.validators[val] = { count: 0, failures: 0, avg_ms: 0, total_ms: 0 };
                }
                report.validators[val].count++;
                if (span.status === SPAN_STATUS.FAILED) report.validators[val].failures++;
                report.validators[val].total_ms += dur;
                report.validators[val].avg_ms = Math.round((report.validators[val].total_ms / report.validators[val].count) * 10) / 10;
            }

            // Script/Tool metrics
            if (span.layer === TELEMETRY_LAYERS.SCRIPT_TOOL || span.layer === TELEMETRY_LAYERS.CLI) {
                const tool = span.name.replace(/^(tool|cli):/, '').split(':')[0];
                if (!report.tools[tool]) {
                    report.tools[tool] = { count: 0, failures: 0, total_ms: 0, avg_ms: 0 };
                }
                report.tools[tool].count++;
                if (span.status === SPAN_STATUS.FAILED) report.tools[tool].failures++;
                report.tools[tool].total_ms += dur;
                report.tools[tool].avg_ms = Math.round((report.tools[tool].total_ms / report.tools[tool].count) * 10) / 10;
            }
        }

        // Compute percentiles
        durations.sort((a, b) => a - b);
        report.latencies.all_durations = durations;
        if (durations.length > 0) {
            report.latencies.p50_ms = durations[Math.floor(durations.length * 0.5)];
            report.latencies.p90_ms = durations[Math.floor(durations.length * 0.9)];
            report.latencies.max_ms = durations[durations.length - 1];
        }

        if (llmCallsCount > 0) {
            report.token_economy.avg_tokens_per_llm_call = Math.round(report.token_economy.total_tokens / llmCallsCount);
        }

        // Subagent latency summary
        for (const [agent, data] of Object.entries(report.subagents)) {
            data.durations.sort((a, b) => a - b);
            data.p50_ms = data.durations[Math.floor(data.durations.length * 0.5)] || 0;
            data.max_ms = data.durations[data.durations.length - 1] || 0;
            delete data.durations; // prune raw array
        }

        // Generate Calibration Insights & Actionable Recommendations
        this._generateCalibrationRecommendations(report);

        return report;
    }

    _generateCalibrationRecommendations(report) {
        const recs = [];

        // Check 1: Retry rates
        let totalRetries = 0;
        let totalInvocations = 0;
        for (const [agent, data] of Object.entries(report.subagents)) {
            totalRetries += data.retries;
            totalInvocations += data.invocations;
            if (data.failures > 0) {
                recs.push(`[CALIBRATION_ALERT] Subagent '${agent}' encountered ${data.failures} failure(s). Check schema constraints or prompt hints.`);
            }
        }

        const retryRate = totalInvocations > 0 ? (totalRetries / totalInvocations) : 0;
        if (retryRate > 0.2) {
            recs.push(`[HIGH_RETRY_RATE] Mission retry rate is ${(retryRate * 100).toFixed(1)}% (> 20%). Consider elevating default model routing class to DEFAULT or STRONG.`);
        }

        // Check 2: Validator latencies
        for (const [val, data] of Object.entries(report.validators)) {
            if (data.avg_ms > 500) {
                recs.push(`[VALIDATOR_LATENCY] Validator '${val}' average latency is ${data.avg_ms}ms (> 500ms). Consider caching or indexing.`);
            }
        }

        // Check 3: Token economy
        if (report.token_economy.avg_tokens_per_llm_call > 6000) {
            recs.push(`[TOKEN_BUDGET] Average tokens per LLM call (${report.token_economy.avg_tokens_per_llm_call}) is high. Ensure task-scoped context slicing ('TASK_SCOPED') is active.`);
        } else if (report.token_economy.avg_tokens_per_llm_call > 0) {
            recs.push(`[OPTIMAL_TOKEN_BUDGET] Average token load per call (${report.token_economy.avg_tokens_per_llm_call}) is lean and well-calibrated.`);
        }

        // Check 4: Success rate
        const totalRuns = report.failure_analysis.success_count + report.failure_analysis.failed_count;
        const passRate = totalRuns > 0 ? (report.failure_analysis.success_count / totalRuns) : 1;
        if (passRate === 1.0 && report.failure_analysis.failed_count === 0) {
            recs.push(`[PRODUCTION_READY] 100% pass rate achieved across all recorded spans. System stability is calibrated for production release.`);
        }

        report.recommendations = recs;
    }

    /**
     * Clears all telemetry data (JSONL and SQLite tables).
     */
    clear() {
        try {
            if (fs.existsSync(this.logPath)) {
                fs.writeFileSync(this.logPath, '', 'utf8');
            }
            const db = getTelemetryDatabase(this.dbPath);
            if (db) {
                db.exec(`DELETE FROM telemetry_spans; DELETE FROM telemetry_traces;`);
            }
            return { status: 'CLEARED', message: 'Telemetry traces and database cleared successfully.' };
        } catch (e) {
            return { status: 'ERROR', message: e.message };
        }
    }

    /**
     * Closes any open SQLite database connection.
     */
    close() {
        if (sqliteDbInstance) {
            try {
                sqliteDbInstance.close();
            } catch (e) {}
            sqliteDbInstance = null;
            sqliteAvailable = false;
        }
    }
}

// Global Singleton Instance
const defaultTelemetryEngine = new TelemetryEngine();

module.exports = {
    TELEMETRY_LAYERS,
    SPAN_STATUS,
    TelemetrySpan,
    TelemetryEngine,
    telemetry: defaultTelemetryEngine,
    estimateTokens
};
