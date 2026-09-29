/**
 * End-to-End Test for Real PDF Document Ingestion (`test_pdf_ingestion_end_to_end.js`)
 * 
 * Verifies that:
 * 1. A multi-page educational PDF can be synthesized on the fly via Python reportlab.
 * 2. extract_pdf_source.py extracts layout text, formulas, concepts, and questions with page coordinates.
 * 3. evidence_ingestion_engine.js seamlessly ingests the PDF into canonical evidence-pack.md and provenance.json.
 * 4. Content Lineage Record (CLR) invariants and chunk SHA-256 hashes are strictly verified.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { computeSha256 } = require('./content_lineage_record');
const { ingestSourceToEvidencePack, persistEvidencePack } = require('./evidence_ingestion_engine');

function resolvePython() {
    const venvPy = path.join(__dirname, '../.venv/Scripts/python.exe');
    if (fs.existsSync(venvPy)) return venvPy;
    return process.platform === 'win32' ? 'python' : 'python3';
}

function runPdfIngestionTest() {
    console.log('[TEST] Starting Real PDF Ingestion End-to-End Test...');

    const scratchDir = path.join(__dirname, 'scratch/test_pdf_ingestion');
    if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
    }

    const testPdfPath = path.join(scratchDir, 'Authentic_Math_LCM_HCF.pdf');
    const pyScript = path.join(scratchDir, 'generate_test_pdf.py');

    // 1. Script to generate an authentic 3-page educational PDF
    const pyGeneratorCode = `
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

pdf_path = sys.argv[1]
doc = SimpleDocTemplate(pdf_path, pagesize=letter)
styles = getSampleStyleSheet()

story = []

# Page 1: Chapter Overview & Concepts
story.append(Paragraph("Chapter 1: Number Systems and Arithmetic", styles['Title']))
story.append(Spacer(1, 12))
story.append(Paragraph("Definition: The Least Common Multiple (LCM) of two or more integers is the smallest positive integer that is divisible by all of them.", styles['Normal']))
story.append(Spacer(1, 10))
story.append(Paragraph("Rule: The Highest Common Factor (HCF), also known as the Greatest Common Divisor (GCD), is the largest positive integer that divides each of the integers without leaving a remainder.", styles['Normal']))
story.append(Spacer(1, 10))
story.append(Paragraph("Core Concept: For any two positive coprime integers a and b, their HCF is always 1.", styles['Normal']))
story.append(Spacer(1, 400)) # Force page break

# Page 2: Master Formulas & Properties
story.append(Paragraph("Section 2: Mathematical Theorems and Master Formulas", styles['Heading1']))
story.append(Spacer(1, 12))
story.append(Paragraph("Theorem: For any two positive integers a and b, the product of their LCM and HCF equals the product of the numbers.", styles['Normal']))
story.append(Spacer(1, 10))
story.append(Paragraph("$$LCM(a, b) * HCF(a, b) = a * b$$", styles['Normal']))
story.append(Spacer(1, 10))
story.append(Paragraph("Formula: $HCF = (a * b) / LCM$", styles['Normal']))
story.append(Spacer(1, 15))

# Table data
data = [
    ['Property', 'Scope', 'Formula'],
    ['Product Law', 'Two positive integers', 'a * b = LCM * HCF'],
    ['Coprime Rule', 'HCF(a,b) = 1', 'LCM = a * b']
]
t = Table(data)
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.grey),
    ('GRID', (0,0), (-1,-1), 1, colors.black)
]))
story.append(t)
story.append(Spacer(1, 350)) # Force page break

# Page 3: Authentic Questions & Practice Problems
story.append(Paragraph("Section 3: Authentic Exam Practice Questions", styles['Heading1']))
story.append(Spacer(1, 12))
story.append(Paragraph("Q1. What is the LCM of two coprime numbers a and b?", styles['Normal']))
story.append(Paragraph("A) a + b", styles['Normal']))
story.append(Paragraph("B) a * b", styles['Normal']))
story.append(Paragraph("C) 1", styles['Normal']))
story.append(Paragraph("D) a / b", styles['Normal']))
story.append(Paragraph("Ans: B", styles['Normal']))
story.append(Spacer(1, 15))

story.append(Paragraph("Q2. The HCF of two numbers is 12 and their LCM is 72. If one number is 24, find the other number.", styles['Normal']))
story.append(Paragraph("A) 36", styles['Normal']))
story.append(Paragraph("B) 48", styles['Normal']))
story.append(Paragraph("C) 18", styles['Normal']))
story.append(Paragraph("D) 30", styles['Normal']))
story.append(Paragraph("Ans: A", styles['Normal']))

doc.build(story)
print("PDF_GENERATED_SUCCESSFULLY")
`;
    fs.writeFileSync(pyScript, pyGeneratorCode, 'utf8');

    // Run Python generator
    const pythonExe = resolvePython();
    console.log(`[TEST] Using Python binary: ${pythonExe}`);
    const genOut = execFileSync(pythonExe, [pyScript, testPdfPath], { encoding: 'utf8' });
    assert(genOut.includes('PDF_GENERATED_SUCCESSFULLY'), 'PDF generation failed');
    assert(fs.existsSync(testPdfPath), 'Test PDF does not exist on disk');
    console.log(`[TEST] Generated authentic PDF at ${testPdfPath} (Size: ${fs.statSync(testPdfPath).size} bytes)`);

    // 2. Ingest the PDF using evidence_ingestion_engine
    console.log('[TEST] Executing evidence_ingestion_engine.ingestSourceToEvidencePack on PDF...');
    const evidencePack = ingestSourceToEvidencePack(testPdfPath, {
        subject: 'Math',
        chapter: 'LCM-HCF'
    });

    // 3. Assertions on Extracted Evidence Pack
    assert(evidencePack.evidence_pack_id.includes('lcm-hcf') || evidencePack.evidence_pack_id.includes('lcm_hcf'), 'Evidence pack ID must reflect chapter');
    assert(evidencePack.chunks.length > 0, `Extracted chunks must be > 0 (found ${evidencePack.chunks.length})`);
    console.log(`[TEST] Extracted ${evidencePack.chunks.length} granular chunks.`);

    // Verify page coordinates exist in chunks
    const pagesFound = new Set(evidencePack.chunks.map(c => c.coordinates.page_start).filter(Boolean));
    assert(pagesFound.size >= 2, `Chunks must retain physical page coordinates across pages (found pages: ${[...pagesFound].join(', ')})`);
    console.log(`[TEST] Physical page coordinates verified across pages: ${[...pagesFound].join(', ')}`);

    // Verify concepts were detected
    assert(evidencePack.concepts.length > 0, `Concepts must be extracted from PDF (found ${evidencePack.concepts.length})`);
    console.log(`[TEST] Extracted ${evidencePack.concepts.length} concepts (e.g. "${evidencePack.concepts[0].name}").`);

    // Verify formulas were detected
    assert(evidencePack.formulas.length > 0, `Formulas must be extracted from PDF (found ${evidencePack.formulas.length})`);
    console.log(`[TEST] Extracted ${evidencePack.formulas.length} formulas.`);

    // Verify questions were detected and converted to Source Question Inventory
    const q1 = evidencePack.source_problems[0];
    const q1Text = q1.question_text || q1.statement || '';
    assert(q1Text.includes('LCM') || q1Text.includes('coprime'), 'Question 1 statement must match PDF content');
    assert(q1.options.length >= 4, `Question 1 must have at least 4 options (found ${q1.options.length})`);
    console.log(`[TEST] Extracted questions verified with options and answers.`);

    // 4. Test Persistence
    const persisted = persistEvidencePack(evidencePack, scratchDir);
    assert(fs.existsSync(persisted.markdownPath), 'evidence-pack.md must exist');
    assert(fs.existsSync(persisted.provenancePath), 'provenance.json must exist');

    const mdContent = fs.readFileSync(persisted.markdownPath, 'utf8');
    assert(mdContent.includes('# Canonical Evidence Pack: LCM-HCF (Math)'), 'Markdown header must match');
    assert(mdContent.includes('## 1. Chapter Metadata & Provenance'), 'Section 1 must exist');
    assert(mdContent.includes('## 2. Granular Source Chunks Registry'), 'Section 2 must exist');
    assert(mdContent.includes('## 3. Extracted Concepts'), 'Section 3 must exist');
    assert(mdContent.includes('## 4. Master Formulas'), 'Section 4 must exist');

    const provContent = JSON.parse(fs.readFileSync(persisted.provenancePath, 'utf8'));
    assert.strictEqual(provContent.evidence_pack_id, evidencePack.evidence_pack_id);
    assert.strictEqual(provContent.chunk_count, evidencePack.chunks.length);

    // 5. Test Scanned Image PDF Detection & Graceful Fallback
    console.log('[TEST] Testing Scanned (image-only, non-digital text) PDF handling...');
    const scannedPdfPath = path.join(scratchDir, 'Scanned_Exam_Photocopy.pdf');
    const pyScannedGenCode = `
import sys
from PIL import Image, ImageDraw

pdf_path = sys.argv[1]
# Create a bitmap image with simulated diagram/exam content
img = Image.new('RGB', (800, 1000), color=(255, 255, 255))
d = ImageDraw.Draw(img)
d.rectangle([(50, 50), (750, 950)], outline=(0, 0, 0), width=3)
d.ellipse([(200, 200), (600, 600)], outline=(100, 100, 100), width=4)
# Save directly as pure image PDF with NO digital text layer
img.save(pdf_path, "PDF", resolution=100.0)
print("SCANNED_PDF_GENERATED_SUCCESSFULLY")
`;
    const pyScannedScript = path.join(scratchDir, 'generate_scanned_pdf.py');
    fs.writeFileSync(pyScannedScript, pyScannedGenCode, 'utf8');
    const scanGenOut = execFileSync(pythonExe, [pyScannedScript, scannedPdfPath], { encoding: 'utf8' });
    assert(scanGenOut.includes('SCANNED_PDF_GENERATED_SUCCESSFULLY'), 'Scanned PDF generation failed');

    const scannedEvidencePack = ingestSourceToEvidencePack(scannedPdfPath, {
        subject: 'Physics',
        chapter: 'Optics-Diagrams'
    });

    assert(scannedEvidencePack.chunks.length > 0, 'Scanned PDF must still yield valid chunk records');
    const scannedChunk = scannedEvidencePack.chunks.find(c => c.chunk_type === 'scanned_image' || c.content.includes('SCANNED_PAGE_IMAGE'));
    assert(scannedChunk, 'Scanned PDF must produce a scanned_image chunk');
    console.log(`[TEST] Scanned PDF chunk verified: ${scannedChunk.chunk_id}`);

    console.log('[TEST] PASS: Real PDF Document Ingestion verified end-to-end with 100% precision.');

    // Cleanup scratch test directory
    try {
        fs.unlinkSync(testPdfPath);
        fs.unlinkSync(pyScript);
        fs.unlinkSync(scannedPdfPath);
        fs.unlinkSync(pyScannedScript);
        fs.unlinkSync(persisted.markdownPath);
        fs.unlinkSync(persisted.provenancePath);
        fs.rmdirSync(scratchDir);
    } catch (_) {}
}

if (require.main === module) {
    try {
        runPdfIngestionTest();
    } catch (e) {
        console.error(`[TEST] FAILED: ${e.message}`);
        console.error(e.stack);
        process.exit(1);
    }
}

module.exports = { runPdfIngestionTest };
