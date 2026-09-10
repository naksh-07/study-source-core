const fs = require('fs');

let content = fs.readFileSync('.agents/skills/study-source-core/scripts/orchestration_engine.js', 'utf8');

const startStr = '    // 4. Schema / Format Validation Assertion';
const endStr = 'errors.push(`[VALIDATOR_EXCEPTION] Validator crashed: ${valErr.message}`);\n    }';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find bounds');
    process.exit(1);
}

const replacement = `    // 4. Schema / Format Validation Assertion
    try {
        if (task.validation_rule) {
            const registry = getArtifactRegistry();
            const trackKey = Object.keys(registry).find(k => registry[k].task_id === task.task_id);
            const def = trackKey ? registry[trackKey] : null;

            if (def && def.validator_export && def.validator_format !== 'none') {
                const valModule = require('./' + task.validation_rule);
                const func = valModule[def.validator_export];
                let res;
                
                if (def.validator_format === 'parsed_json') {
                    res = func(JSON.parse(fs.readFileSync(targetPath, 'utf8')));
                } else if (def.validator_format === 'content_and_basename') {
                    res = func(fs.readFileSync(targetPath, 'utf8'), path.basename(targetPath));
                } else if (def.validator_format === 'async_path') {
                    res = await func(targetPath, false);
                } else if (def.validator_format === 'parsed_json_fallback') {
                    if (func) {
                        res = func(JSON.parse(fs.readFileSync(targetPath, 'utf8')));
                    } else {
                        JSON.parse(fs.readFileSync(targetPath, 'utf8'));
                        res = { isValid: true, errors: [] };
                    }
                } else {
                    res = func(targetPath);
                }

                if (res && !res.isValid) errors.push(...(res.errors || []));
            } else if (targetPath.endsWith('.json')) {
                JSON.parse(fs.readFileSync(targetPath, 'utf8'));
            }
        } else if (targetPath.endsWith('.json')) {
            JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        }
    } catch (valErr) {
        errors.push(\`[VALIDATOR_EXCEPTION] Validator crashed: \${valErr.message}\`);
    }`;

const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx + endStr.length);

fs.writeFileSync('.agents/skills/study-source-core/scripts/orchestration_engine.js', newContent);
console.log('Successfully updated validation logic');
