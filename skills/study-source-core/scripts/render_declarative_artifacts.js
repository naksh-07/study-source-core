/**
 * study-source-core Declarative Content Renderers (`render_declarative_artifacts.js`)
 * 
 * Implements deterministic downstream projections of SemanticLearningIR and PedagogicalIR
 * for declarative study artifacts:
 * 1. Knowledge Notes (`Notes/<Chapter>_Notes.md`)
 * 2. Basic Anki Flashcards (`Basic/<Chapter>_Basic.tsv`)
 * 3. Cloze Anki Flashcards (`Cloze/<Chapter>_Cloze.tsv`)
 * 4. Relational MindMap (`Optional/<Chapter>.mindmap.json` & Mermaid diagram)
 * 5. NotebookLM Slide Deck Prompt (`SlideDeck/<Chapter>_SlideDeckPrompt.md`)
 * 
 * Invariants:
 * - Pure Projections: Renderers consume IR directly; no rediscovery of facts from raw source.
 * - Single-Writer & Renderer Independence: No renderer reads another renderer's output.
 * - Determinism: Identical IR input produces byte-for-byte identical output.
 * - Hindi-First Bilingual Standard: Explanatory prose in Hindi with English terms in parentheses.
 * - Anti-Slop: Monotonic headings, single H1, valid TSV delimiters, bounded slide budgets.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- HELPER UTILITIES ---

function escapeTsvField(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/\t/g, ' ')
        .replace(/\r?\n/g, '<br>')
        .trim();
}

function getSafeChapterName(ir) {
    if (ir.chapter_context && ir.chapter_context.chapter) return ir.chapter_context.chapter;
    if (ir.chapter) return ir.chapter;
    if (ir.title) return ir.title;
    return 'Chapter';
}

function getSafeSubject(ir) {
    if (ir.chapter_context && ir.chapter_context.subject) return ir.chapter_context.subject;
    if (ir.subject) return ir.subject;
    if (ir.domain) return ir.domain;
    return 'General';
}

function getEvidenceSha256(ir) {
    if (ir.provenance && ir.provenance.source_sha256) return ir.provenance.source_sha256;
    if (ir.chapter_context && ir.chapter_context.evidence_pack_hash) return ir.chapter_context.evidence_pack_hash;
    return crypto.createHash('sha256').update(JSON.stringify(ir.chapter_context || ir.chapter || 'ir')).digest('hex');
}

// --- 1. KNOWLEDGE NOTES RENDERER ---

function renderNotesMarkdown(semanticIr, pedagogicalIr = null, options = {}) {
    if (!semanticIr || typeof semanticIr !== 'object') {
        throw new Error('INVALID_INPUT: SemanticLearningIR must be an object.');
    }

    const chapter = getSafeChapterName(semanticIr);
    const subject = getSafeSubject(semanticIr);
    const hindiChapter = (semanticIr.chapter_context && semanticIr.chapter_context.hindi_title) || chapter;
    const sourceSha = getEvidenceSha256(semanticIr);

    const kus = Array.isArray(semanticIr.knowledge_units) ? semanticIr.knowledge_units : [];
    const rels = Array.isArray(semanticIr.relationships) ? semanticIr.relationships : [];

    const lines = [];

    // 1. YAML Frontmatter
    lines.push('---');
    lines.push(`title: "${chapter}"`);
    lines.push(`aliases: ["${chapter}", "${hindiChapter}"]`);
    lines.push(`tags: ["${subject.toLowerCase()}", "${chapter.toLowerCase()}"]`);
    lines.push(`chapter: "${chapter}"`);
    lines.push(`subject: "${subject}"`);
    lines.push(`source_sha256: "${sourceSha}"`);
    lines.push(`canonical_type: "notes"`);
    lines.push('---');
    lines.push('');

    // 2. Single H1 Title
    lines.push(`# ${chapter} (${hindiChapter})`);
    lines.push('');

    // 3. Section 1: Chapter Overview & Core DNA (Mandatory)
    lines.push('## 1. Chapter Overview & Core DNA');
    lines.push('');
    const overview = (semanticIr.chapter_context && semanticIr.chapter_context.summary) ||
        `यह अध्याय ${subject} विषय के अंतर्गत ${chapter} के मूलभूत सिद्धांतों, संकल्पनाओं और नियमों का व्यापक अध्ययन प्रस्तुत करता है।`;
    lines.push(overview);
    lines.push('');
    lines.push('> [!NOTE] मुख्य सिद्धांत (Core Governing Principle)');
    const corePrinciple = (semanticIr.chapter_context && semanticIr.chapter_context.governing_principles) ||
        `${chapter} की सभी परिघटनाएं और समस्याएं मूलभूत वैज्ञानिक नियमों एवं सत्यापित सिद्धांतों पर आधारित हैं।`;
    lines.push(`> ${corePrinciple}`);
    lines.push('');

    // 4. Section 2: Core Concepts & Definitions (Mandatory)
    lines.push('## 2. Core Concepts & Definitions');
    lines.push('');

    if (kus.length === 0) {
        lines.push('इस अध्याय के लिए कोई प्रत्यक्ष संकल्पना इकाइयाँ (Knowledge Units) उपलब्ध नहीं हैं।');
        lines.push('');
    } else {
        const sortedKus = [...kus].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
        for (const ku of sortedKus) {
            const label = ku.label || ku.title || ku.id;
            const engTerm = ku.english_term ? ` (${ku.english_term})` : '';
            lines.push(`### ${label}${engTerm}`);
            lines.push('');
            
            const defText = ku.definition || ku.proposition || ku.content || 'सत्यापित प्रमाण पर आधारित मूलभूत विवरण।';
            lines.push(defText);
            lines.push('');

            if (ku.formula || ku.equation) {
                lines.push('**गणितीय सूत्र / नियम (Mathematical Formula):**');
                lines.push('$$');
                lines.push(ku.formula || ku.equation);
                lines.push('$$');
                lines.push('');
            }

            if (ku.variables && typeof ku.variables === 'object') {
                lines.push('| प्रतीक (Symbol) | विवरण (Description) | SI मात्रक (SI Unit) |');
                lines.push('|---|---|---|');
                for (const [sym, info] of Object.entries(ku.variables)) {
                    const desc = typeof info === 'string' ? info : (info.desc || '');
                    const unit = typeof info === 'object' && info.unit ? info.unit : '—';
                    lines.push(`| $${sym}$ | ${desc} | ${unit} |`);
                }
                lines.push('');
            }

            if (ku.source_chunk_hash) {
                lines.push(`<!-- provenance: ${ku.source_chunk_hash} -->`);
                lines.push('');
            }
        }
    }

    // 5. Section 3: Structural & Relational Architecture (Optional)
    if (rels.length > 0) {
        lines.push('## 3. Structural & Relational Architecture');
        lines.push('');
        lines.push('| स्रोत संकल्पना (Source) | संबंध प्रकार (Relationship) | लक्ष्य संकल्पना (Target) |');
        lines.push('|---|---|---|');
        const sortedRels = [...rels].sort((a, b) => ((a.source || a.source_id || '') + (a.target || a.target_id || '')).localeCompare((b.source || b.source_id || '') + (b.target || b.target_id || '')));
        for (const r of sortedRels) {
            const src = r.source || r.source_id || '—';
            const type = r.type || r.relation || 'relates_to';
            const tgt = r.target || r.target_id || '—';
            lines.push(`| ${src} | ${type} | ${tgt} |`);
        }
        lines.push('');
    }

    // 6. Section 4: Processes, Mechanisms & Cause-Effect Chains (Optional)
    const processKus = kus.filter(k => k.type === 'process' || k.type === 'mechanism' || (Array.isArray(k.steps) && k.steps.length > 0));
    if (processKus.length > 0) {
        lines.push('## 4. Processes, Mechanisms & Cause-Effect Chains');
        lines.push('');
        for (const pk of processKus) {
            lines.push(`### ${pk.label || pk.id} - चरणबद्ध प्रक्रिया (Step-by-Step Process)`);
            lines.push('');
            if (Array.isArray(pk.steps)) {
                pk.steps.forEach((st, idx) => {
                    lines.push(`${idx + 1}. **चरण ${idx + 1}:** ${typeof st === 'string' ? st : (st.description || st.step || '')}`);
                });
            } else {
                lines.push(`1. **प्रारंभिक अवस्था:** ${pk.definition || 'प्रक्रिया आरंभिक स्थितियों का विश्लेषण।'}`);
                lines.push('2. **अभिक्रिया / परिवर्तन:** मानक सैद्धांतिक नियमों के अनुसार परिवर्तन।');
                lines.push('3. **अंतिम अवस्था:** संतुलित परिणामी अवस्था की प्राप्ति।');
            }
            lines.push('');
        }
    }

    // 7. Section 5: Classifications & Comparative Analysis (Optional)
    const compKus = kus.filter(k => k.type === 'classification' || k.type === 'comparative' || (k.comparisons && Array.isArray(k.comparisons)));
    if (compKus.length > 0) {
        lines.push('## 5. Classifications & Comparative Analysis');
        lines.push('');
        for (const ck of compKus) {
            lines.push(`### ${ck.label || ck.id} - वर्गीकरण एवं तुलना`);
            lines.push('');
            if (ck.comparisons && Array.isArray(ck.comparisons)) {
                lines.push('| तुलना का आधार (Parameter) | वर्ग A (Category A) | वर्ग B (Category B) |');
                lines.push('|---|---|---|');
                for (const item of ck.comparisons) {
                    lines.push(`| ${item.parameter || 'विशेषता'} | ${item.catA || '—'} | ${item.catB || '—'} |`);
                }
            } else {
                lines.push(`- **वर्गीकरण:** ${ck.definition || 'प्रामाणिक स्रोत वर्गीकरण के अनुसार।'}`);
            }
            lines.push('');
        }
    }

    // 8. Section 6: Exceptions, Boundary Conditions & Traps (Optional)
    const trapKus = kus.filter(k => k.boundary_conditions || k.exceptions || k.traps || k.common_pitfall);
    if (trapKus.length > 0) {
        lines.push('## 6. Exceptions, Boundary Conditions & Traps');
        lines.push('');
        for (const tk of trapKus) {
            const trapText = tk.traps || tk.common_pitfall || tk.boundary_conditions || tk.exceptions;
            lines.push(`- **${tk.label || tk.id}:** ${trapText}`);
        }
        lines.push('');
    }

    // 9. Section 7: 5-Minute Quick Revision Zone (Mandatory)
    lines.push('## 7. 5-Minute Quick Revision Zone');
    lines.push('');
    lines.push('| संकल्पना / नियम (Concept / Law) | मुख्य सारांश (Core Takeaway) |');
    lines.push('|---|---|');
    const revisionCandidates = kus.slice(0, 10);
    if (revisionCandidates.length === 0) {
        lines.push(`| ${chapter} | संपूर्ण अध्याय के मूलभूत सिद्धांतों का त्वरित पुनरावलोकन। |`);
    } else {
        for (const rk of revisionCandidates) {
            const shortDef = (rk.definition || rk.proposition || 'महत्वपूर्ण नियम।').split('.')[0] + '।';
            lines.push(`| ${rk.label || rk.id} | ${shortDef} |`);
        }
    }
    lines.push('');

    return lines.join('\n');
}

// --- 2. BASIC ANKI FLASHCARDS RENDERER ---

function renderBasicAnkiTsv(semanticIr, pedagogicalIr = null, options = {}) {
    if (!semanticIr || typeof semanticIr !== 'object') {
        throw new Error('INVALID_INPUT: SemanticLearningIR must be an object.');
    }

    const chapter = getSafeChapterName(semanticIr);
    const subject = getSafeSubject(semanticIr);
    const kus = Array.isArray(semanticIr.knowledge_units) ? semanticIr.knowledge_units : [];

    const basicCandidates = kus.filter(k => {
        if (k.type === 'procedural' || k.question_type === 'numerical') return false;
        if (k.retrieval_mode && k.retrieval_mode !== 'basic') return false;
        return k.definition || k.proposition || k.content;
    });

    if (basicCandidates.length === 0) {
        return {
            status: 'SUPPRESSED',
            reason: 'ZERO_BASIC_CANDIDATES',
            count: 0,
            content: 'Front\tBack\tTags\n'
        };
    }

    const rows = [];
    const seenFronts = new Set();
    const sortedCandidates = [...basicCandidates].sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    for (const ku of sortedCandidates) {
        const label = ku.label || ku.title || ku.id;
        const engTerm = ku.english_term ? ` (${ku.english_term})` : '';
        const front = `${label}${engTerm} की परिभाषा एवं महत्व क्या है?`;
        
        if (seenFronts.has(front)) continue;
        seenFronts.add(front);

        let back = ku.definition || ku.proposition || ku.content || '';
        if (ku.formula) {
            back += ` [सूत्र: ${ku.formula}]`;
        }

        const tag = `${subject}::${chapter}::Basic`;
        rows.push(`${escapeTsvField(front)}\t${escapeTsvField(back)}\t${escapeTsvField(tag)}`);
    }

    if (rows.length === 0) {
        return {
            status: 'SUPPRESSED',
            reason: 'ZERO_BASIC_CANDIDATES',
            count: 0,
            content: 'Front\tBack\tTags\n'
        };
    }

    const tsvContent = ['Front\tBack\tTags', ...rows].join('\n') + '\n';
    return {
        status: 'ACTIVE',
        reason: null,
        count: rows.length,
        content: tsvContent
    };
}

// --- 3. CLOZE ANKI FLASHCARDS RENDERER ---

function renderClozeAnkiTsv(semanticIr, pedagogicalIr = null, options = {}) {
    if (!semanticIr || typeof semanticIr !== 'object') {
        throw new Error('INVALID_INPUT: SemanticLearningIR must be an object.');
    }

    const chapter = getSafeChapterName(semanticIr);
    const subject = getSafeSubject(semanticIr);
    const kus = Array.isArray(semanticIr.knowledge_units) ? semanticIr.knowledge_units : [];

    const clozeCandidates = kus.filter(k => {
        if (k.type === 'procedural') return false;
        return (k.formula || k.proposition || k.definition || k.cloze_target);
    });

    if (clozeCandidates.length === 0) {
        return {
            status: 'SUPPRESSED',
            reason: 'ZERO_CLOZE_CANDIDATES',
            count: 0,
            content: 'Text\tExtra\tTags\n'
        };
    }

    const rows = [];
    const seenTexts = new Set();
    const sortedCandidates = [...clozeCandidates].sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    for (const ku of sortedCandidates) {
        const label = ku.label || ku.title || ku.id;
        let text = '';
        let extra = '';

        if (ku.cloze_text && /\{\{c\d+::.*?\}\}/.test(ku.cloze_text)) {
            text = ku.cloze_text;
            extra = ku.extra || `संकल्पना: ${label}`;
        } else if (ku.formula) {
            text = `${label} का प्रामाणिक गणितीय सूत्र {{c1::${ku.formula}::सूत्र}} है।`;
            extra = ku.definition || `विषय: ${subject} | अध्याय: ${chapter}`;
        } else if (ku.cloze_target && ku.proposition) {
            text = ku.proposition.replace(ku.cloze_target, `{{c1::${ku.cloze_target}}}`);
            extra = `संकल्पना: ${label}`;
        } else {
            const target = ku.english_term || label;
            text = `${chapter} में, {{c1::${target}::मुख्य संकल्पना}} को "${ku.definition || ku.proposition || label}" के रूप में परिभाषित किया जाता है।`;
            extra = `महत्वपूर्ण परिभाषा एवं नियम (${label})`;
        }

        if (seenTexts.has(text)) continue;
        seenTexts.add(text);

        const tag = `${subject}::${chapter}::Cloze`;
        rows.push(`${escapeTsvField(text)}\t${escapeTsvField(extra)}\t${escapeTsvField(tag)}`);
    }

    if (rows.length === 0) {
        return {
            status: 'SUPPRESSED',
            reason: 'ZERO_CLOZE_CANDIDATES',
            count: 0,
            content: 'Text\tExtra\tTags\n'
        };
    }

    const tsvContent = ['Text\tExtra\tTags', ...rows].join('\n') + '\n';
    return {
        status: 'ACTIVE',
        reason: null,
        count: rows.length,
        content: tsvContent
    };
}

// --- 4. RELATIONAL MINDMAP RENDERER ---

function renderMindmap(semanticIr, pedagogicalIr = null, options = {}) {
    if (!semanticIr || typeof semanticIr !== 'object') {
        throw new Error('INVALID_INPUT: SemanticLearningIR must be an object.');
    }

    const chapter = getSafeChapterName(semanticIr);
    const subject = getSafeSubject(semanticIr);
    const hindiChapter = (semanticIr.chapter_context && semanticIr.chapter_context.hindi_title) || chapter;

    const kus = Array.isArray(semanticIr.knowledge_units) ? semanticIr.knowledge_units : [];
    const rels = Array.isArray(semanticIr.relationships) ? semanticIr.relationships : [];

    if (kus.length === 0) {
        return {
            status: 'SUPPRESSED',
            reason: 'NO_RELATIONAL_TOPOLOGY',
            json: null,
            mermaid: null
        };
    }

    const groups = {};
    for (const ku of kus) {
        const cat = ku.category || ku.topic || (ku.type ? ku.type.toUpperCase() : 'CORE');
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ku);
    }

    const mapId = `map-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${chapter.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const children = [];
    for (const [cat, items] of Object.entries(groups)) {
        const branchId = `node-cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const branchChildren = items.map((item, idx) => ({
            id: `node-${item.id || `${branchId}-${idx}`}`,
            label: `${item.label || item.id} (${item.english_term || 'Concept'})`
        }));

        children.push({
            id: branchId,
            label: cat,
            children: branchChildren
        });
    }

    const validNodeIds = new Set(['root']);
    for (const ch of children) {
        validNodeIds.add(ch.id);
        if (ch.children) {
            for (const leaf of ch.children) validNodeIds.add(leaf.id);
        }
    }

    const crossLinks = [];
    for (const r of rels) {
        const sId = `node-${r.source || r.source_id}`;
        const tId = `node-${r.target || r.target_id}`;
        if (validNodeIds.has(sId) && validNodeIds.has(tId)) {
            crossLinks.push({
                sourceId: sId,
                targetId: tId,
                label: r.type || r.relation || 'relates_to'
            });
        }
    }

    const mapJson = {
        id: mapId,
        title: `${chapter} Concept Map`,
        subject: subject,
        language: 'hi',
        root: {
            id: 'root',
            label: `${chapter} (${hindiChapter})`,
            children: children
        },
        crossLinks: crossLinks
    };

    const mermaidLines = [];
    mermaidLines.push('mindmap');
    mermaidLines.push(`  root(("${chapter}"))`);
    for (const [cat, items] of Object.entries(groups)) {
        mermaidLines.push(`    ["${cat}"]`);
        for (const item of items) {
            const lbl = (item.label || item.id).replace(/[()"[\]{}]/g, '');
            mermaidLines.push(`      ("${lbl}")`);
        }
    }
    const mermaidStr = mermaidLines.join('\n');

    return {
        status: 'ACTIVE',
        reason: null,
        json: mapJson,
        mermaid: mermaidStr
    };
}

// --- 5. SLIDE DECK PROMPT RENDERER ---

function renderSlideDeck(semanticIr, pedagogicalIr = null, options = {}) {
    if (!semanticIr || typeof semanticIr !== 'object') {
        throw new Error('INVALID_INPUT: SemanticLearningIR must be an object.');
    }

    const chapter = getSafeChapterName(semanticIr);
    const subject = getSafeSubject(semanticIr);
    const hindiChapter = (semanticIr.chapter_context && semanticIr.chapter_context.hindi_title) || chapter;
    const sourceSha = getEvidenceSha256(semanticIr);
    const kus = Array.isArray(semanticIr.knowledge_units) ? semanticIr.knowledge_units : [];

    if (kus.length === 0) {
        return {
            status: 'SUPPRESSED',
            reason: 'DECK_WORTHINESS_BELOW_THRESHOLD',
            content: null
        };
    }

    const deckWorthiness = kus.length >= 3 ? 'HIGH' : 'MEDIUM';
    const slideCount = Math.min(Math.max(5, kus.length + 3), 10);

    const promptSections = [];

    promptSections.push(`1. ROLE / AUDIENCE
You are an expert pedagogical presentation designer and visual educator. Your task is to generate a highly focused, pedagogically sequenced slide deck for students studying "${chapter}" (${hindiChapter}) in ${subject}. The learners require strict conceptual clarity, mathematical precision, and high-yield retention without visual or cognitive clutter.`);

    promptSections.push(`2. LEARNING OBJECTIVE
By the conclusion of this presentation, learners will master the core governing principles of ${chapter}, understand all fundamental definitions and mathematical relations, successfully navigate common exam traps, and apply step-by-step problem-solving methods to authentic questions.`);

    promptSections.push(`3. SOURCE GROUNDING
This presentation is strictly grounded in the authorized study evidence pack (SHA-256: ${sourceSha}). Every definition, constant, formula, and boundary condition must derive purely from this verified source with zero external hallucinations or unsupported claims.`);

    promptSections.push(`4. VISUAL WORLD
Design a sleek, high-contrast, academic visual theme. Use deep navy backgrounds (#0F172A) with crisp white typography (#F8FAFC) and deliberate accent colors: Cyan (#06B6D4) for definitions, Amber (#F59E0B) for formulas, and Emerald (#10B981) for worked examples. Incorporate structured coordinate layouts, SVG vector diagrams, and side-by-side comparison tables.`);

    promptSections.push(`5. NARRATIVE MODE
Follow a progressive pedagogical arc:
- Slide 1: Hook and Core Phenomenon / Governing Principle.
- Slide 2: Prerequisite Foundations and Domain Lexicon.
- Slides 3–${slideCount - 2}: Deep Conceptual Unfolding, Mechanism Stages, and Key Mathematical Relations.
- Slide ${slideCount - 1}: Worked Exemplar / Analytical Application.
- Slide ${slideCount}: 5-Minute Quick Revision Matrix and Key Exam Takeaways.`);

    promptSections.push(`6. VISUAL VOCABULARY
Deploy standard pedagogical visual badges across every slide:
- 💡 Core Insight / Governing Axiom
- 🔍 Microscopic Mechanism / Deep Detail
- ⚡ High-Yield Exam Trigger / Fast Recall
- ⚠️ Common Pitfall / Boundary Condition
- 📐 Mathematical Formula / Dimensional Invariant`);

    const slideItems = [];
    slideItems.push(`Slide 1: Title & Chapter Overview
- Title: ${chapter} (${hindiChapter})
- Visual Directive: Central dynamic vector diagram showing the core physical/conceptual model.
- 💡 Governing Principle: ${chapter} constitutes the foundational architecture for this domain.
- 📐 Scope: Complete coverage of verified source units.`);

    slideItems.push(`Slide 2: Prerequisite Foundation & Lexicon
- Title: Foundation & Core Terms
- Visual Directive: Split-pane glossary with bilingual terminology.
- 🔍 Term 1: Primary technical terms in Hindi with standard English notations in parentheses.
- 💡 Axiom: Scientific definitions require dimensional and structural consistency.`);

    const keyKus = kus.slice(0, slideCount - 4);
    keyKus.forEach((k, idx) => {
        const sNum = idx + 3;
        const label = k.label || k.id;
        const formulaLine = k.formula ? `- 📐 Governing Equation: $$${k.formula}$$` : `- 💡 Core Proposition: ${k.proposition || k.definition || 'प्रामाणिक सिद्धांत।'}`;
        slideItems.push(`Slide ${sNum}: ${label}
- Title: ${label} (${k.english_term || 'Core Mechanism'})
- Visual Directive: Annotated structural diagram illustrating cause-effect relationships.
${formulaLine}
- 🔍 Mechanism: Step-by-step physical or logical progression.
- ⚠️ Boundary Condition: Applicable strictly within specified domain constraints.`);
    });

    slideItems.push(`Slide ${slideCount - 1}: Worked Problem & Solution DAG
- Title: Worked Application & Analytical Strategy
- Visual Directive: Linear solution flow chart (Recognition -> Formula Selection -> Stepwise Calculation).
- 💡 Recognition Signal: Identify key parameters and constraints given in the problem statement.
- 📐 Method: Apply verified formulas with explicit dimensional unit checking.
- ⚠️ Trap: Avoid common calculation oversights and sign convention errors.`);

    slideItems.push(`Slide ${slideCount}: 5-Minute Summary & Quick Revision Zone
- Title: High-Yield Summary Matrix
- Visual Directive: High-contrast 3-column summary table (Concept | Key Formula | Exam Trigger).
- ⚡ Quick Recall: Active memory retention of all core laws.
- 💡 Mastery Rule: Consistent practice across problem patterns guarantees exam readiness.`);

    promptSections.push(`7. SLIDE STRUCTURE\nTotal Slide Budget: ${slideCount} Slides (Strictly within 5–15 slides budget).\n\n${slideItems.join('\n\n')}`);

    promptSections.push(`8. TEXT / DENSITY RULES
- Strictly adhere to maximum 6 bullet points per slide.
- Maximum 15–20 words per bullet point (anti-wall-of-text rule).
- Every bullet point must begin with an approved badge (💡, 🔍, ⚡, ⚠️, 📐).
- Never place full textbook paragraphs on slides; enforce high-density bulleted scannability.`);

    promptSections.push(`9. ARTIFACT NON-DUPLICATION
The slide deck serves as an interactive visual lecture narrative. It does NOT duplicate the exhaustive textual prose of Knowledge Notes (Notes.md), nor does it atomize individual questions into flashcard TSV pairs. It synthesizes visual topology and pacing for audio-visual review.`);

    promptSections.push(`10. EXAM CONTEXT
Tailored for competitive examinations and rigorous academic assessments. Emphasize recurring question patterns, dimensional consistency, high-probability trap triggers, and rapid elimination strategies for multiple-choice questions.`);

    promptSections.push(`11. ANTI-PATTERNS
- STRICTLY FORBIDDEN: Decorative stock photos with zero educational information value.
- STRICTLY FORBIDDEN: Walls of unformatted continuous prose.
- STRICTLY FORBIDDEN: Slides with more than 8 bullet points or multiple unlinked ideas.
- STRICTLY FORBIDDEN: Synthetic unverified formulas or fabricated exceptions.`);

    promptSections.push(`12. FINAL QUALITY CHECK
Verify that all mathematical formulas compile in LaTeX, all Hindi explanatory terms match the approved bilingual terminology, exactly ${slideCount} slides are specified, and all 12 mandatory sections are fully present and compliant.`);

    const payloadText = promptSections.join('\n\n');

    const mdLines = [];
    mdLines.push('---');
    mdLines.push('type: slide-deck-prompt');
    mdLines.push(`subject: "${subject}"`);
    mdLines.push(`chapter: "${chapter}"`);
    mdLines.push(`deck_worthiness: ${deckWorthiness}`);
    mdLines.push('recommended_format: Presenter Slides');
    mdLines.push('dominant_structures:');
    mdLines.push('  - Conceptual Architecture');
    mdLines.push('  - Worked Problem Patterns');
    mdLines.push('---');
    mdLines.push('');
    mdLines.push(`# Slide Deck Prompt: ${chapter}`);
    mdLines.push('');
    mdLines.push('## Overview & Generation Guidelines');
    mdLines.push('');
    mdLines.push(`This document provides the deterministic, production-grade prompt for generating a ${slideCount}-slide presentation deck in NotebookLM or Marp for **${chapter}** in **${subject}**.`);
    mdLines.push('');
    mdLines.push('## Copy & Paste into NotebookLM');
    mdLines.push('');
    mdLines.push('```text');
    mdLines.push(payloadText);
    mdLines.push('```');
    mdLines.push('');

    const fullDoc = mdLines.join('\n');
    return {
        status: 'ACTIVE',
        reason: null,
        slideCount: slideCount,
        content: fullDoc
    };
}

// --- 6. HIGH-LEVEL COORDINATOR ---

function renderAllDeclarativeArtifacts(semanticIr, pedagogicalIr = null, options = {}) {
    const notesContent = renderNotesMarkdown(semanticIr, pedagogicalIr, options);
    const basicRes = renderBasicAnkiTsv(semanticIr, pedagogicalIr, options);
    const clozeRes = renderClozeAnkiTsv(semanticIr, pedagogicalIr, options);
    const mindmapRes = renderMindmap(semanticIr, pedagogicalIr, options);
    const slideRes = renderSlideDeck(semanticIr, pedagogicalIr, options);

    const deliverables = {
        notes: { status: 'ACTIVE', content: notesContent },
        basicAnki: basicRes,
        clozeAnki: clozeRes,
        mindmap: mindmapRes,
        slideDeck: slideRes
    };

    if (options.outputDir) {
        const outDir = options.outputDir;
        const chapter = getSafeChapterName(semanticIr);

        // 1. Notes
        const notesDir = path.join(outDir, 'Notes');
        fs.mkdirSync(notesDir, { recursive: true });
        fs.writeFileSync(path.join(notesDir, `${chapter}_Notes.md`), deliverables.notes.content, 'utf8');

        // 2. Basic
        if (deliverables.basicAnki.status === 'ACTIVE') {
            const basicDir = path.join(outDir, 'Basic');
            fs.mkdirSync(basicDir, { recursive: true });
            fs.writeFileSync(path.join(basicDir, `${chapter}_Basic.tsv`), deliverables.basicAnki.content, 'utf8');
        }

        // 3. Cloze
        if (deliverables.clozeAnki.status === 'ACTIVE') {
            const clozeDir = path.join(outDir, 'Cloze');
            fs.mkdirSync(clozeDir, { recursive: true });
            fs.writeFileSync(path.join(clozeDir, `${chapter}_Cloze.tsv`), deliverables.clozeAnki.content, 'utf8');
        }

        // 4. MindMap
        if (deliverables.mindmap.status === 'ACTIVE') {
            const mapDir = path.join(outDir, 'Optional');
            fs.mkdirSync(mapDir, { recursive: true });
            fs.writeFileSync(path.join(mapDir, `${chapter}.mindmap.json`), JSON.stringify(deliverables.mindmap.json, null, 2), 'utf8');
        }

        // 5. SlideDeck
        if (deliverables.slideDeck.status === 'ACTIVE') {
            const slideDir = path.join(outDir, 'SlideDeck');
            fs.mkdirSync(slideDir, { recursive: true });
            fs.writeFileSync(path.join(slideDir, `${chapter}_SlideDeckPrompt.md`), deliverables.slideDeck.content, 'utf8');
        }
    }

    return deliverables;
}

module.exports = {
    renderNotesMarkdown,
    renderBasicAnkiTsv,
    renderClozeAnkiTsv,
    renderMindmap,
    renderSlideDeck,
    renderAllDeclarativeArtifacts
};
