#!/usr/bin/env bash
# Builds the three resume PDFs and their web previews into ../assets/resume.
# Runs automatically on GitHub after every push. To run it yourself you need
# TeX Live (pdflatex + fontawesome5), poppler-utils and webp (cwebp).
set -euo pipefail
cd "$(dirname "$0")"
OUT=../assets/resume
mkdir -p "$OUT"
TMP=$(mktemp -d)

build() {
  local src=$1 name=$2
  if ! pdflatex -interaction=nonstopmode -halt-on-error "$src.tex" > "$TMP/$src.out"; then
    echo "LaTeX error in $src.tex:"; grep -A3 '^!' "$src.log" || tail -20 "$src.log"; exit 1
  fi
  local pages
  pages=$(pdfinfo "$src.pdf" | awk '/^Pages:/ {print $2}')
  if [ "$pages" != "1" ]; then echo "::warning::$src.pdf is $pages pages long; trim it back to one page."; fi
  cp "$src.pdf" "$OUT/$name.pdf"
  pdftoppm -r 150 -png -singlefile "$src.pdf" "$TMP/$name"
  cwebp -quiet -q 82 "$TMP/$name.png" -o "$OUT/$name.webp"
  echo "built $name ($pages page)"
}

build ai-full-stack-engineer KS-Pankaj-AI-Full-Stack-Engineer
build full-stack-engineer    KS-Pankaj-Full-Stack-Engineer
build ai-engineer            KS-Pankaj-AI-Engineer

rm -f ./*.aux ./*.log ./*.out ./*.pdf
rm -rf "$TMP"
