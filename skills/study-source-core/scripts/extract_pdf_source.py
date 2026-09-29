#!/usr/bin/env python3
"""
PDF Source Extraction Engine (`extract_pdf_source.py`)

Extracts text, structured tables, visual asset bounding boxes, formulas,
and question items from educational textbook/exam PDFs.
Computes deterministic SHA-256 chunk hashes and physical page coordinates.

Emits structured JSON compatible with `evidence_ingestion_engine.js`.
"""

import sys
import os
import re
import json
import hashlib
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    import pdfplumber
    import pypdf
except ImportError:
    pdfplumber = None
    pypdf = None


def compute_sha256(data: bytes | str) -> str:
    """Computes SHA-256 hex digest for bytes or string."""
    h = hashlib.sha256()
    if isinstance(data, str):
        h.update(data.encode('utf-8'))
    else:
        h.update(data)
    return h.hexdigest()


def extract_questions_from_text(text: str, page_num: int) -> List[Dict[str, Any]]:
    """Extracts candidate questions, options, and answers from text."""
    questions = []
    lines = text.split('\n')
    current_q: Optional[Dict[str, Any]] = None
    option_regex = re.compile(r'^\s*(?:\(?([A-Da-d])\)|\b([A-Da-d])[\.\:])\s+(.+)$')
    q_start_regex = re.compile(r'^(?:Q(?:uestion)?\s*\d+[\.\:\)]?|\d+[\.\:\)])\s+(.+)$', re.IGNORECASE)
    ans_regex = re.compile(r'^(?:Ans(?:wer)?|Sol(?:ution)?|Correct Option)[\s\:\-]+(.+)$', re.IGNORECASE)

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        q_match = q_start_regex.match(stripped)
        if q_match:
            if current_q and current_q.get('statement'):
                questions.append(current_q)
            current_q = {
                'page': page_num,
                'statement': q_match.group(1).strip(),
                'options': [],
                'correct_answer': None,
                'question_type': 'numerical'
            }
            continue

        opt_match = option_regex.match(stripped)
        if opt_match and current_q:
            opt_letter = (opt_match.group(1) or opt_match.group(2)).upper()
            opt_text = opt_match.group(3).strip()
            current_q['options'].append(f"{opt_letter}) {opt_text}")
            current_q['question_type'] = 'mcq'
            continue

        ans_match = ans_regex.match(stripped)
        if ans_match and current_q:
            current_q['correct_answer'] = ans_match.group(1).strip()
            continue

        if current_q and not current_q['options'] and not current_q['correct_answer']:
            current_q['statement'] += " " + stripped

    if current_q and current_q.get('statement'):
        questions.append(current_q)

    return questions


def extract_formulas_from_text(text: str, page_num: int) -> List[Dict[str, Any]]:
    """Detects explicit LaTeX math and mathematical formula expressions."""
    formulas = []
    # 1. Block math: $$...$$
    for m in re.finditer(r'\$\$([^\$]+)\$\$', text):
        expr = m.group(1).strip()
        formulas.append({
            'name': f"Formula p.{page_num}",
            'formula': expr,
            'page': page_num,
            'scope': 'General'
        })
    # 2. Inline math: $...$ with equality or algebraic symbols
    for m in re.finditer(r'(?<!\$)\$([^\$\n]+)\$(?!\$)', text):
        expr = m.group(1).strip()
        if '=' in expr or '\\' in expr or any(op in expr for op in ['+', '-', '*', '/', '^', '_']):
            formulas.append({
                'name': f"Equation p.{page_num}",
                'formula': expr,
                'page': page_num,
                'scope': 'General'
            })
    return formulas


def extract_concepts_from_text(text: str, page_num: int) -> List[Dict[str, Any]]:
    """Detects concept definitions, rules, and theorems."""
    concepts = []
    def_regex = re.compile(r'^(?:(?:\*\*([^*]+)\*\*|([A-Z][a-zA-Z\s]{2,30}))\s*[\:\-]\s*(.+)|(?:Definition|Rule|Law|Theorem)[\s\:\-]+(.+))$', re.MULTILINE)
    for m in def_regex.finditer(text):
        name = m.group(1) or m.group(2) or "Key Concept"
        definition = m.group(3) or m.group(4)
        if definition and len(definition.strip()) > 10:
            concepts.append({
                'name': name.strip(),
                'definition': definition.strip(),
                'page': page_num
            })
    return concepts


def extract_pdf_document(
    pdf_path: Path,
    subject: str = "General",
    chapter: str = "Chapter",
    page_start: Optional[int] = None,
    page_end: Optional[int] = None
) -> Dict[str, Any]:
    """Ingests a PDF file and extracts comprehensive, structured evidence."""
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF source file not found: {pdf_path}")

    file_bytes = pdf_path.read_bytes()
    file_sha256 = compute_sha256(file_bytes)
    file_size = len(file_bytes)

    if not pdfplumber:
        raise ImportError("pdfplumber is required for PDF source extraction. Run .venv/Scripts/pip install pdfplumber")

    pages_data = []
    all_chunks = []
    all_concepts = []
    all_formulas = []
    all_questions = []
    all_visuals = []

    chunk_idx = 0

    with pdfplumber.open(str(pdf_path)) as pdf:
        total_pages = len(pdf.pages)
        start_idx = (page_start - 1) if page_start and page_start >= 1 else 0
        end_idx = min(page_end, total_pages) if page_end else total_pages

        for idx in range(start_idx, end_idx):
            page_num = idx + 1
            page = pdf.pages[idx]
            raw_text = page.extract_text() or ""
            normalized_text = raw_text.replace('\r\n', '\n').replace('\r', '\n').strip()
            ocr_applied = False
            is_scanned = False

            # Extract visual candidate bounding boxes (images/diagrams)
            visual_candidates = []
            images = page.images or []

            # Scanned Document Detection & OCR Fallback
            if len(normalized_text) < 50 and len(images) > 0:
                is_scanned = True
                # Attempt local OCR if pytesseract is available
                try:
                    import pytesseract
                    from PIL import Image
                    page_img = page.to_image(resolution=200).original
                    ocr_res = pytesseract.image_to_string(page_img)
                    if ocr_res and len(ocr_res.strip()) > len(normalized_text):
                        normalized_text = ocr_res.replace('\r\n', '\n').replace('\r', '\n').strip()
                        ocr_applied = True
                except Exception:
                    pass

                # If text is still empty, catalog visual crop for multimodal processing
                if len(normalized_text) < 50:
                    vis_id = f"vis.{chapter.lower().replace(' ', '_')}.p{page_num}.scanned_full"
                    visual_candidates.append({
                        'id': vis_id,
                        'page': page_num,
                        'bbox': [0.0, 0.0, round(page.width, 2), round(page.height, 2)],
                        'width': round(page.width, 2),
                        'height': round(page.height, 2),
                        'description': f"Scanned full page image on page {page_num} requiring vision extraction"
                    })

            # Extract tables
            tables = []
            extracted_tables = page.extract_tables() or []
            for t_idx, tbl in enumerate(extracted_tables):
                cleaned_rows = []
                for row in tbl:
                    cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                    if any(cleaned_row):
                        cleaned_rows.append(cleaned_row)
                if cleaned_rows:
                    tables.append({
                        'table_index': t_idx + 1,
                        'rows': cleaned_rows
                    })

            for img_idx, img in enumerate(images):
                bbox = [
                    round(img.get('x0', 0), 2),
                    round(img.get('top', 0), 2),
                    round(img.get('x1', 0), 2),
                    round(img.get('bottom', 0), 2)
                ]
                width = round(img.get('width', 0), 2)
                height = round(img.get('height', 0), 2)
                if width > 40 and height > 40:  # Ignore tiny icons/artifacts
                    vis_id = f"vis.{chapter.lower().replace(' ', '_')}.p{page_num}.img{img_idx + 1}"
                    visual_info = {
                        'id': vis_id,
                        'page': page_num,
                        'bbox': bbox,
                        'width': width,
                        'height': height,
                        'description': f"Diagram/Visual asset on page {page_num}"
                    }
                    visual_candidates.append(visual_info)
                    all_visuals.append(visual_info)

            # Chunk paragraphs on this page
            paragraphs = [p.strip() for p in normalized_text.split('\n\n') if p.strip()]
            if not paragraphs and is_scanned:
                # Retain physical chunk for scanned page
                paragraphs = [f"[SCANNED_PAGE_IMAGE: Page {page_num} contains scanned visual image; image coordinates recorded in visual_assets]"]

            for p_idx, para in enumerate(paragraphs):
                p_hash = compute_sha256(para)
                chunk_id = f"chk.{chapter.lower().replace(' ', '_')}.p{page_num}.c{chunk_idx:03d}.{p_hash[:8]}"
                chunk_record = {
                    'chunk_id': chunk_id,
                    'chunk_index': chunk_idx,
                    'chunk_type': 'scanned_image' if is_scanned and not ocr_applied else 'prose',
                    'coordinates': {
                        'page_start': page_num,
                        'page_end': page_num,
                        'section': f"Page {page_num}",
                        'paragraph': p_idx + 1,
                        'line_start': None,
                        'line_end': None
                    },
                    'content': para,
                    'chunk_hash': p_hash
                }
                all_chunks.append(chunk_record)
                chunk_idx += 1

            # Extract entities
            page_questions = extract_questions_from_text(normalized_text, page_num)
            page_formulas = extract_formulas_from_text(normalized_text, page_num)
            page_concepts = extract_concepts_from_text(normalized_text, page_num)

            all_questions.extend(page_questions)
            all_formulas.extend(page_formulas)
            all_concepts.extend(page_concepts)

            pages_data.append({
                'page_number': page_num,
                'is_scanned': is_scanned,
                'ocr_applied': ocr_applied,
                'char_count': len(normalized_text),
                'word_count': len(normalized_text.split()),
                'tables_count': len(tables),
                'images_count': len(visual_candidates),
                'questions_found': len(page_questions),
                'formulas_found': len(page_formulas),
                'concepts_found': len(page_concepts),
                'text': normalized_text,
                'tables': tables,
                'visual_candidates': visual_candidates
            })

    # Format practice problems for Source Question Inventory
    formatted_questions = []
    for q_idx, q in enumerate(all_questions):
        q_id = f"q.{chapter.lower().replace(' ', '_')}.p{q['page']}.{q_idx + 1:03d}"
        formatted_questions.append({
            'source_question_id': q_id,
            'question_number': q_idx + 1,
            'page': q['page'],
            'question_type': q['question_type'],
            'statement': q['statement'],
            'options': q['options'],
            'correct_answer': q['correct_answer'],
            'difficulty': 2.0,
            'source_provenance': {
                'source_id': f"src.{subject.lower()}.{chapter.lower()}",
                'file_name': pdf_path.name,
                'page': q['page']
            }
        })

    structured_result = {
        'subject': subject,
        'chapter': chapter,
        'source_provenance': {
            'source_id': f"src.{subject.lower().replace(' ', '_')}.{chapter.lower().replace(' ', '_')}",
            'source_title': pdf_path.stem.replace('_', ' ').title(),
            'file_name': pdf_path.name,
            'file_path': str(pdf_path.resolve()),
            'file_sha256': file_sha256,
            'file_size_bytes': file_size,
            'total_pages_in_pdf': total_pages,
            'pages_extracted': len(pages_data),
            'page_range': [start_idx + 1, end_idx]
        },
        'chunks': all_chunks,
        'concepts': all_concepts,
        'master_formulas': all_formulas,
        'source_problems': formatted_questions,
        'visual_assets': all_visuals,
        'pages': pages_data
    }

    return structured_result


def main():
    parser = argparse.ArgumentParser(description="PDF Source Extraction Engine")
    parser.add_argument("--pdf", required=True, help="Path to PDF source document")
    parser.add_argument("--subject", default="General", help="Academic subject")
    parser.add_argument("--chapter", default=None, help="Chapter name (inferred from filename if omitted)")
    parser.add_argument("--page-start", type=int, default=None, help="Starting page (1-based)")
    parser.add_argument("--page-end", type=int, default=None, help="Ending page (1-based)")
    parser.add_argument("--output-json", default=None, help="Destination path for structured JSON")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    chapter = args.chapter or pdf_path.stem.replace('_', ' ').replace('-', ' ').title()

    try:
        result = extract_pdf_document(
            pdf_path=pdf_path,
            subject=args.subject,
            chapter=chapter,
            page_start=args.page_start,
            page_end=args.page_end
        )
    except Exception as e:
        sys.stderr.write(f"EXTRACTION_FAILED: {str(e)}\n")
        sys.exit(1)

    output_str = json.dumps(result, indent=2)
    if args.output_json:
        out_p = Path(args.output_json)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(output_str, encoding="utf-8")
        print(f"Extracted {len(result['chunks'])} chunks, {len(result['concepts'])} concepts, {len(result['master_formulas'])} formulas, {len(result['source_problems'])} questions to {out_p}")
    else:
        print(output_str)


if __name__ == "__main__":
    main()
