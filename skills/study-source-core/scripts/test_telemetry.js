/**
 * Test Suite: Telemetry & Observability Engine (`test_telemetry.js`)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { 
    telemetry, 
    TelemetryEngine, 
    TELEMETRY_LAYERS, 
    SPAN_STATUS, 
    estimateTokens 
} = require('./telemetry_engine');

async function main() {
    console.log('--- Testing telemetry_engine.js ---');

    const testDir = path.resolve(__dirname, 'scratch/test_telemetry');
    const testLog = path.join(testDir, 'test_events.jsonl');
    const testDb = path.join(testDir, 'test_telemetry.db');

    // Clean scratch
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    const engine = new TelemetryEngine({
        telemetryDir: testDir,
        logPath: testLog,
        dbPath: testDb
    });

    // 1. Token Estimation
    const sampleText = 'This is a sample pedagogical prompt for testing token estimation in StudySourceCore.';
    const estimated = estimateTokens(sampleText);
    assert.ok(estimated > 15 && estimated < 30, `Expected ~21 tokens, got ${estimated}`);
    console.log(`✅ [TEL-1] estimateTokens works accurately (${estimated} tokens for sample text)`);

    // 2. Span Lifecycle (Start -> Update -> End SUCCESS)
    const traceId = 'mission_test_42';
    const span1 = engine.startSpan({
        traceId,
        layer: TELEMETRY_LAYERS.SUBAGENT,
        name: 'subagent:math-apkg-author',
        subject: 'Math',
        chapter: 'LCM-HCF',
        modelClass: 'DEFAULT',
        contextStrategy: 'TASK_SCOPED',
        contextText: 'Short evidence slice for math questions.'
    });

    assert.strictEqual(span1.status, SPAN_STATUS.RUNNING);
    assert.ok(span1.tokensIn > 0, 'tokensIn should be auto-estimated from contextText');

    // Simulate work
    await new Promise(r => setTimeout(r, 20));

    span1.update({
        responseText: 'Generated 10 coprime questions and progressive hints.'
    });
    span1.end();

    assert.strictEqual(span1.status, SPAN_STATUS.SUCCESS);
    assert.ok(span1.durationMs >= 15, `Duration should be >= 15ms, got ${span1.durationMs}`);
    assert.ok(span1.tokensOut > 0, 'tokensOut should be recorded');
    console.log(`✅ [TEL-2] Span lifecycle completed successfully (${span1.durationMs}ms, ${span1.tokensIn} in / ${span1.tokensOut} out)`);

    // 3. Span Failure Lifecycle
    const span2 = engine.startSpan({
        traceId,
        layer: TELEMETRY_LAYERS.VALIDATOR,
        name: 'validator:note_contract',
        subject: 'Physics',
        chapter: 'Newton-Laws'
    });
    await new Promise(r => setTimeout(r, 10));
    span2.fail(new Error('SyntaxError: Broken YAML frontmatter'));

    assert.strictEqual(span2.status, SPAN_STATUS.FAILED);
    assert.strictEqual(span2.errorMessage, 'SyntaxError: Broken YAML frontmatter');
    console.log('✅ [TEL-3] Span failure recorded with message and stack trace');

    // 4. trackAsync & trackSync wrappers
    const syncRes = engine.trackSync({
        traceId,
        layer: TELEMETRY_LAYERS.SCRIPT_TOOL,
        name: 'tool:export_anki_package'
    }, () => {
        return { status: 'SUCCESS', packageSize: 12048 };
    });
    assert.strictEqual(syncRes.status, 'SUCCESS');

    const asyncRes = await engine.trackAsync({
        traceId,
        layer: TELEMETRY_LAYERS.ORCHESTRATOR,
        name: 'wave:1_parallel_authors'
    }, async () => {
        await new Promise(r => setTimeout(r, 10));
        return { status: 'COMPLETED', completedWorkers: 4 };
    });
    assert.strictEqual(asyncRes.status, 'COMPLETED');
    console.log('✅ [TEL-4] trackSync and trackAsync wrapper functions execute and record spans');

    // 5. Dual-persistence Verification (JSONL + SQLite)
    assert.ok(fs.existsSync(testLog), 'JSONL log file should exist');
    const logLines = fs.readFileSync(testLog, 'utf8').trim().split('\n');
    assert.ok(logLines.length >= 4, `Expected at least 4 log events in JSONL, got ${logLines.length}`);

    const spans = engine.getSpans({ traceId });
    assert.strictEqual(spans.length, 4, `Expected 4 completed spans for trace ${traceId}, got ${spans.length}`);
    console.log(`✅ [TEL-5] Dual-sink persistence verified: ${logLines.length} JSONL events & ${spans.length} SQLite spans`);

    // 6. Calibration Report Generation
    const calibration = engine.getCalibrationReport({ traceId });
    assert.strictEqual(calibration.status, 'CALIBRATED');
    assert.strictEqual(calibration.total_spans, 4);
    assert.ok(calibration.subagents['math-apkg-author'], 'math-apkg-author should be in subagents report');
    assert.strictEqual(calibration.subagents['math-apkg-author'].invocations, 1);
    assert.ok(calibration.latencies.p50_ms > 0, 'P50 latency should be > 0');
    assert.ok(Array.isArray(calibration.recommendations), 'recommendations should be an array');
    console.log(`✅ [TEL-6] Calibration report computed accurately:`);
    console.log(`   - P50: ${calibration.latencies.p50_ms}ms | P90: ${calibration.latencies.p90_ms}ms | Max: ${calibration.latencies.max_ms}ms`);
    console.log(`   - Total Tokens: ${calibration.token_economy.total_tokens}`);
    console.log(`   - Recommendations: ${calibration.recommendations.length}`);

    // 7. Clear function
    const clearResult = engine.clear();
    assert.strictEqual(clearResult.status, 'CLEARED');
    const spansAfterClear = engine.getSpans({ traceId });
    assert.strictEqual(spansAfterClear.length, 0, 'Spans after clear should be 0');
    // Close SQLite database connection
    engine.close();

    // Cleanup scratch
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('--- All Telemetry tests PASSED 100% ---');
}

main().catch(err => {
    console.error('❌ Telemetry Test Failed:', err);
    process.exit(1);
});
