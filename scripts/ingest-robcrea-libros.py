#!/usr/bin/env python3
"""Convierte PDFs Robcrea a PNG en public/coloring/libro-XX/ y escribe manifest."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

REPO = Path(__file__).resolve().parents[1]
STORE_LIBROS = Path("/cursor/stores/bc-8efffe52-6216-4b49-8d42-dcf1b794fdb0/media/libros")
OUT_PUBLIC = REPO / "public" / "coloring"
MANIFEST = REPO / "src" / "lib" / "robcrea-manifest.json"

DPI = 150
ZOOM = DPI / 72


def libro_num(pdf: Path) -> int:
    m = re.search(r"libro-(\d+)", pdf.name)
    if not m:
        raise ValueError(pdf)
    return int(m.group(1))


def convert(pdf: Path, out_dir: Path, mirror_dir: Path | None) -> list[str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    if mirror_dir:
        mirror_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf)
    pages: list[str] = []
    for i in range(doc.page_count):
        page = doc.load_page(i)
        mat = fitz.Matrix(ZOOM, ZOOM)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        name = f"page-{i + 1:02d}.png"
        target = out_dir / name
        pix.save(str(target))
        if mirror_dir:
            pix.save(str(mirror_dir / name))
        pages.append(name)
    doc.close()
    return pages


def main() -> int:
    pdfs = sorted(STORE_LIBROS.glob("libro-*.pdf"), key=libro_num)
    if len(pdfs) != 12:
        print(f"Expected 12 PDFs, found {len(pdfs)}", file=sys.stderr)
        return 1

    libros: list[dict] = []
    total_pages = 0

    for pdf in pdfs:
        n = libro_num(pdf)
        slug = f"libro-{n:02d}"
        pages = convert(
            pdf,
            OUT_PUBLIC / slug,
            STORE_LIBROS / slug if STORE_LIBROS.exists() else None,
        )
        total_pages += len(pages)
        libros.append({"numero": n, "slug": slug, "paginas": len(pages), "files": pages})

    MANIFEST.write_text(json.dumps({"libros": libros}, indent=2), encoding="utf-8")
    print(f"Converted {len(libros)} libros, {total_pages} pages -> {OUT_PUBLIC}")
    print(f"Manifest: {MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())