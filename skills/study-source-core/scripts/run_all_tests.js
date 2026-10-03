#!/usr/bin/env node
/**
 * Master Test Runner Harness (`run_all_tests.js`)
 * 
 * Authoritative, truthful test runner for StudySourceCore.
 * Executes all 47 standalone CommonJS test suites sequentially in child processes,
 * tracks execution times, captures true exit codes, and eliminates false Vitest passes.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS_DIR = __dirname;
const args = process.argv.slice(2);

let filterPattern = null;
let bailOnFailure = false;

args.forEach(arg => {
    if (arg.startsWith('--filter=')) {
        filterPattern = arg.split('=')[1];
    } else if (arg === '--bail' || arg === '-b') {
        bailOnFailure = true;
    }
});

// Discover all test scripts
const testFiles = fs.readdirSync(SCRIPTS_DIR)
    .filter(file => file.startsWith('test_') && file.endsWith('.js'))
    .filter(file => {
        if (!filterPattern) return true;
        return file.toLowerCase().includes(filterPattern.toLowerCase());
    })
    .sort();

if (testFiles.length === 0) {
    console.log(`[Test Runner] No test suites found matching filter '${filterPattern || ''}'`);
    process.exit(0);
}

console.log('================================================================================');
console.log('STUDYSOURCECORE — MASTER TEST SUITE RUNNER');
console.log(`Total Discovered Suites: ${testFiles.length} | Mode: SEQUENTIAL | Fail-Closed: ACTIVE`);
if (filterPattern) console.log(`Active Filter: ${filterPattern}`);
console.log('================================================================================\n');

const suiteResults = [];
let passedSuites = 0;
let failedSuites = 0;
const overallStartTime = Date.now();

for (let i = 0; i < testFiles.length; i++) {
    const file = testFiles[i];
    const fullPath = path.join(SCRIPTS_DIR, file);
    const counter = `[${String(i + 1).padStart(2, ' ')}/${testFiles.length}]`;

    process.stdout.write(`  ${counter} ${file.padEnd(46, ' ')} ... `);
    const suiteStart = Date.now();

    const result = spawnSync(process.execPath, [fullPath], {
        cwd: path.resolve(SCRIPTS_DIR, '../../..'),
        env: { ...process.env, NODE_ENV: 'test' },
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
    });

    const elapsedSec = ((Date.now() - suiteStart) / 1000).toFixed(2);
    const isSuccess = result.status === 0;

    if (isSuccess) {
        console.log(`\x1b[32mPASS\x1b[0m (${elapsedSec}s)`);
        passedSuites++;
        suiteResults.push({ file, status: 'PASS', elapsedSec });
    } else {
        console.log(`\x1b[31mFAIL\x1b[0m (Exit: ${result.status}, ${elapsedSec}s)`);
        failedSuites++;
        suiteResults.push({
            file,
            status: 'FAIL',
            elapsedSec,
            exitCode: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error
        });

        if (bailOnFailure) {
            console.log(`\n\x1b[31m[BAIL] Halting execution immediately due to --bail flag.\x1b[0m`);
            break;
        }
    }
}

const totalTimeSec = ((Date.now() - overallStartTime) / 1000).toFixed(2);

console.log('\n================================================================================');
console.log('MASTER TEST SUITE SUMMARY SCORECARD');
console.log('================================================================================');
console.log(`Suites Run: ${suiteResults.length}/${testFiles.length} | Passed: \x1b[32m${passedSuites}\x1b[0m | Failed: ${failedSuites > 0 ? `\x1b[31m${failedSuites}\x1b[0m` : '0'} | Total Time: ${totalTimeSec}s`);
console.log('--------------------------------------------------------------------------------');

if (failedSuites > 0) {
    console.log('\n❌ FAILED SUITES DETAILS:\n');
    suiteResults.filter(s => s.status === 'FAIL').forEach(f => {
        console.log(`--------------------------------------------------------------------------------`);
        console.log(`FAILED: ${f.file} (Exit code: ${f.exitCode}, Duration: ${f.elapsedSec}s)`);
        console.log(`--------------------------------------------------------------------------------`);
        if (f.error) {
            console.log('Process Error:', f.error.message);
        }
        if (f.stderr && f.stderr.trim()) {
            console.log('STDERR:\n' + f.stderr.trim());
        }
        if (f.stdout && f.stdout.trim()) {
            const lines = f.stdout.trim().split('\n');
            const tail = lines.slice(-25).join('\n');
            console.log('STDOUT (Last 25 lines):\n' + tail);
        }
        console.log('\n');
    });

    console.log(`================================================================================`);
    console.log(`OVERALL VERDICT: \x1b[31mFAILED\x1b[0m (${failedSuites} suite(s) broke invariants)`);
    console.log(`================================================================================`);
    process.exit(1);
} else {
    console.log(`================================================================================`);
    console.log(`OVERALL VERDICT: \x1b[32m100% GREEN PASS\x1b[0m (All ${passedSuites} suites passed without errors)`);
    console.log(`================================================================================`);
    process.exit(0);
}
