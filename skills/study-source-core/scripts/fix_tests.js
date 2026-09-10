const fs = require('fs');
let content = fs.readFileSync('scripts/test_contracts.js', 'utf8');

// Find all explanation: '...', and replace with explanation, hints, and source_provenance if not present
content = content.replace(/(question_type: '[^']+',\s+options: \[[^\]]+\],\s+correct_option: '[^']+',\s+explanation: '[^']+')/g, "$1,\n                    hints: ['hint'],\n                    source_provenance: { source: 'Mock' }");

content = content.replace(/(question_type: '[^']+',\s+options: \[[^\]]+\],\s+correct_option: '[^']+')(?!\s*,?\s*explanation)/g, "$1,\n                    explanation: 'Sol',\n                    hints: ['hint'],\n                    source_provenance: { source: 'Mock' }");

// And for numericals
content = content.replace(/(question_type: 'numerical',\s+answer: [^,]+,\s+tolerance: [^,]+,\s+explanation: '[^']+')/g, "$1,\n                    hints: ['hint'],\n                    source_provenance: { source: 'Mock' }");
content = content.replace(/(question_type: 'numerical',\s+answer: [^,]+,\s+tolerance: [^,]+)(?!\s*,?\s*explanation)/g, "$1,\n                    explanation: 'Sol',\n                    hints: ['hint'],\n                    source_provenance: { source: 'Mock' }");

fs.writeFileSync('scripts/test_contracts.js', content);
