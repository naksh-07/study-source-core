/**
 * StudySourceCore CLI Verification Suite (`test_studycore_cli.js`)
 */

const assert = require('assert');
const { parseFlags, collectVaultStatus, runCli } = require('./studycore_cli');
const { getVaultRoot } = require('./path_resolver');

async function main() {
    console.log('--- Testing studycore_cli.js ---');

    // 1. Flag parser
    const parsed = parseFlags(['source.pdf', '--subject', 'Math', '--chapter', 'LCM-HCF', '--studylab', '--lang', 'en']);
    assert.deepStrictEqual(parsed.positional, ['source.pdf']);
    assert.strictEqual(parsed.flags.subject, 'Math');
    assert.strictEqual(parsed.flags.chapter, 'LCM-HCF');
    assert.strictEqual(parsed.flags.studylab, true);
    assert.strictEqual(parsed.flags.lang, 'en');
    console.log('✅ [CLI-1] parseFlags parses positional and flag arguments accurately');

    // 2. Vault status collection
    const status = collectVaultStatus(getVaultRoot());
    assert.ok(Array.isArray(status.chapters), 'status.chapters should be an array');
    assert.ok(status.chapters.length >= 2, `Expected at least 2 chapters in vault, got ${status.chapters.length}`);
    const mathCh = status.chapters.find(c => c.subject === 'Math' && c.chapter === 'LCM-HCF');
    const mapCh = status.chapters.find(c => c.subject === 'Map' && c.chapter === 'Europe');
    assert.ok(mathCh && mathCh.artifacts.declarativeApkg, 'Math/LCM-HCF declarativeApkg should be detected');
    assert.ok(mapCh && mapCh.artifacts.imageOcclusion, 'Map/Europe imageOcclusion should be detected');
    console.log('✅ [CLI-2] collectVaultStatus detects Math/LCM-HCF and Map/Europe slices');

    // 3. Per-chapter verification
    const verifyRes = await runCli(['verify', 'Map', 'Europe', '--json']);
    assert.strictEqual(verifyRes.status, 'SUCCESS', 'verify Map Europe should succeed');
    assert.ok(verifyRes.results.length >= 5, 'verify Map Europe should run at least 5 validators');
    console.log('✅ [CLI-3] studycore verify Map Europe passes all artifact validators');

    // 4. Telemetry and Calibration command
    const telRes = await runCli(['telemetry', '--json']);
    assert.ok(telRes && telRes.status, 'telemetry report should return a valid status');
    assert.ok(Array.isArray(telRes.recommendations), 'telemetry recommendations should be an array');
    const spansRes = await runCli(['telemetry', '--spans', '--json']);
    assert.ok(Array.isArray(spansRes), 'telemetry spans should return an array');
    console.log('✅ [CLI-4] studycore telemetry returns structured calibration scorecard and spans');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
