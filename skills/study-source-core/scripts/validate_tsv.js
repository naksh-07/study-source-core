/**
 * study-source-core TSV Validator (`validate_tsv.js`)
 * PHYSICAL EXECUTION GATEWAY
 * 
 * Contract:
 * - This script strictly enforces the physical separation and schema of Flashcard outputs.
 * - Basic Anki Schema: EXACTLY 3 columns ('Front', 'Back', 'Tags').
 * - Cloze Anki Schema: EXACTLY 3 columns ('Text', 'Extra', 'Tags'), must contain {{c1::...}}.
 * - 0-byte or whitespace-only files: INVALID (missing required header).
 * - Header-only TSV: VALID zero-card artifact.
 * - Any schema violation (wrong column count, missing fields, mixed syntax) MUST fail validation.
 */

const fs = require('fs');
const path = require('path');

function validateTsvContent(fileContent, filePath = 'in-memory') {
    const errors = [];
    const warnings = [];

    if (typeof fileContent !== 'string') {
        errors.push("TSV content must be a string.");
        return { isValid: false, errors, warnings };
    }

    // Check for empty or whitespace-only file
    if (fileContent.trim() === '') {
        errors.push("TSV file is completely empty or whitespace-only. Missing required header row ('Front\\tBack\\tTags' or 'Text\\tExtra\\tTags').");
        return { isValid: false, errors, warnings };
    }

    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length === 0) {
        errors.push("TSV file contains no valid lines.");
        return { isValid: false, errors, warnings };
    }

    // TSV Header check - strictly 3 columns
    const header = lines[0].split('\t');
    if (header.length !== 3) {
        errors.push(`Invalid TSV header column count: found ${header.length} columns, expected exactly 3. Header: "${lines[0]}"`);
        return { isValid: false, errors, warnings };
    }

    const h0 = header[0].trim().toLowerCase();
    const h1 = header[1].trim().toLowerCase();
    const h2 = header[2].trim().toLowerCase();

    const isBasic = h0 === 'front' && h1 === 'back' && h2 === 'tags';
    const isCloze = h0 === 'text' && h1 === 'extra' && h2 === 'tags';

    if (!isBasic && !isCloze) {
        errors.push(`Invalid TSV header names. Basic must be 'Front\\tBack\\tTags', Cloze must be 'Text\\tExtra\\tTags'. Received: '${lines[0]}'`);
        return { isValid: false, errors, warnings };
    }

    // Header-only TSV (0 data rows) is a valid 0-card artifact
    if (lines.length === 1) {
        warnings.push("TSV is header-only (0 cards). Valid zero-card artifact.");
        return { isValid: true, errors, warnings };
    }

    const expectedCols = 3;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const columns = line.split('\t');

        if (columns.length !== expectedCols) {
            errors.push(`Row ${i + 1} has ${columns.length} columns, expected exactly ${expectedCols}. Content: ${line.substring(0, 40)}...`);
            continue;
        }

        // Col 1 validation
        if (columns[0].trim() === '') {
            errors.push(`Row ${i + 1} is missing required first field (${isBasic ? 'Front' : 'Text'}).`);
        }

        if (isBasic) {
            // Col 2 validation for Basic
            if (columns[1].trim() === '') {
                errors.push(`Row ${i + 1} is missing required Back field.`);
            }
            // Basic must not contain Cloze syntax
            if (/\{\{c\d+::.*?\}\}/.test(columns[0])) {
                errors.push(`Row ${i + 1} is marked as Basic but contains Cloze syntax '{{c1::...}}' in Front.`);
            }
        }

        if (isCloze) {
            // Check for valid cloze syntax in Text
            const text = columns[0];
            const clozeRegex = /\{\{c\d+::.*?\}\}/;
            if (!clozeRegex.test(text)) {
                errors.push(`Row ${i + 1} is marked as Cloze but missing valid cloze syntax '{{c1::...}}' in Text.`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function validateTsv(filePath, shouldExit = true) {
    console.log(`Validating TSV at: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        if (shouldExit) process.exit(1);
        return { isValid: false, errors: [`File not found: ${filePath}`], warnings: [] };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = validateTsvContent(fileContent, filePath);

    if (!result.isValid) {
        console.log("\n[FAIL] TSV Validation Errors:");
        result.errors.forEach(err => console.log(`  ❌ ${err}`));
        console.log("\nValidation failed.");
        if (shouldExit) process.exit(1);
        return result;
    } else {
        if (result.warnings.length > 0) {
            result.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
        }
        console.log("\n[PASS] TSV Validation successful.");
        if (shouldExit) process.exit(0);
        return result;
    }
}

if (require.main === module) {
    if (process.argv.length !== 3) {
        console.error("Usage: node validate_tsv.js <path_to_tsv>");
        process.exit(1);
    }
    validateTsv(process.argv[2]);
}

module.exports = {
    validateTsv,
    validateTsvContent
};
