#!/usr/bin/env python3
"""
PDF Inventory Tool (`pdf_inventory.py`)
Scans a target directory for PDF files and outputs ONLY the filename, file size, and total page count.
MUST NOT extract, read, or dump OCR text, PDF page content, or base64 image data.
Fully Windows-compatible and dependency-independent (includes a pure Python fallback).
"""

import sys
import os
import re
import zlib
import argparse
from pathlib import Path

def get_pdf_page_count(pdf_path: Path) -> int:
    """
    Extracts page count from a PDF file without reading or extracting text/image content.
    Tries installed PDF libraries first, then falls back to pure Python structural parsing.
    """
    # 1. Try standard third-party libraries if available
    for mod in ('fitz', 'pypdf', 'PyPDF2', 'pdfplumber', 'pypdfium2'):
        try:
            if mod == 'fitz':
                fitz = __import__('fitz')
                doc = fitz.open(str(pdf_path))
                cnt = len(doc)
                doc.close()
                return cnt
            elif mod == 'pypdf':
                pypdf = __import__('pypdf')
                reader = pypdf.PdfReader(str(pdf_path))
                return len(reader.pages)
            elif mod == 'PyPDF2':
                PyPDF2 = __import__('PyPDF2')
                with open(pdf_path, 'rb') as f:
                    reader = PyPDF2.PdfFileReader(f)
                    return reader.getNumPages()
        except Exception:
            pass

    # 2. Pure Python fallback (Catalog, Object Stream decompressed regex, Page count inspection)
    try:
        with open(pdf_path, 'rb') as f:
            content = f.read()

        # Uncompressed regex search for /Pages catalog count
        counts = [int(m) for m in re.findall(br'/Type\s*/Pages\b[^\>]*?/Count\s+(\d+)', content)]
        if not counts:
            counts = [int(m) for m in re.findall(br'/Count\s+(\d+)\s[^\>]*?/Type\s*/Pages\b', content)]
        if counts:
            return max(counts)

        # Decompress streams using zlib to find object streams containing /Pages
        streams = re.findall(br'stream\r?\n(.*?)\r?\nendstream', content, re.DOTALL)
        decompressed_blocks = []
        for s in streams:
            for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
                try:
                    decomp = zlib.decompress(s, wbits)
                    decompressed_blocks.append(decomp)
                    break
                except Exception:
                    pass

        full_data = b' '.join(decompressed_blocks) + b' ' + content
        counts = [int(m) for m in re.findall(br'/Type\s*/Pages\b[^\>]*?/Count\s+(\d+)', full_data)]
        if not counts:
            counts = [int(m) for m in re.findall(br'/Count\s+(\d+)\b', full_data)]
        if not counts:
            page_matches = re.findall(br'/Type\s*/Page\b(?!\s*s)', full_data)
            if page_matches:
                return len(page_matches)

        return max(counts) if counts else 0
    except Exception:
        return 0

def main():
    parser = argparse.ArgumentParser(
        description="PDF Inventory Tool - Outputs filename, file size, and total page count for all PDFs in a directory."
    )
    parser.add_argument(
        "directory",
        nargs="?",
        default=".",
        help="Directory path to scan for PDFs (defaults to current working directory)."
    )
    args = parser.parse_args()

    target_dir = Path(args.directory).resolve()
    if not target_dir.exists() or not target_dir.is_dir():
        print(f"Error: Directory '{target_dir}' does not exist or is not a valid directory.", file=sys.stderr)
        sys.exit(1)

    pdf_files = sorted(list(target_dir.rglob("*.pdf")) + list(target_dir.rglob("*.PDF")))
    
    # Deduplicate paths (handles Windows case-insensitive path matching)
    unique_pdfs = []
    seen = set()
    for p in pdf_files:
        canonical = str(p.resolve()).lower()
        if canonical not in seen:
            seen.add(canonical)
            unique_pdfs.append(p)

    if not unique_pdfs:
        print(f"No PDF files found in directory: {target_dir}")
        return

    print(f"PDF Inventory for Directory: {target_dir}\n")
    print(f"{'Filename':<55} | {'Size (Bytes)':<14} | {'Total Pages':<10}")
    print("-" * 86)

    total_files = 0
    total_bytes = 0
    total_pages = 0

    for pdf in unique_pdfs:
        try:
            rel_name = pdf.relative_to(target_dir).as_posix()
        except ValueError:
            rel_name = pdf.name
        
        size = pdf.stat().st_size
        pages = get_pdf_page_count(pdf)
        
        total_files += 1
        total_bytes += size
        total_pages += pages

        print(f"{rel_name:<55} | {size:<14} | {pages:<10}")

    print("-" * 86)
    print(f"Total PDFs: {total_files} | Total Size: {total_bytes} bytes | Total Pages: {total_pages}")

if __name__ == "__main__":
    main()
