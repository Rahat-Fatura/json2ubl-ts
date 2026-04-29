#!/bin/bash
#
# Mimsoft tüketici TS 5.7+ tsconfig simülasyonu (Sprint 8l.2 / v2.2.4 / Library Öneri #6).
#
# Kütüphane local TypeScript versiyonu (^5.3.3) `${number}` template literal
# placeholder'ını `keyof X` distributive union'ında match edebiliyor; ancak
# TS 5.4-5.7 arasında bu davranış değişti. Mimsoft (TS 5.7+) action helper
# pattern'inde TS2345 alıyordu — v2.2.4'te `update()` method'una eklenen
# 13 spesifik template literal overload sorunu çözdü.
#
# Bu script Mimsoft'un birebir tsconfig'iyle TS 5.7.3 simülasyonu yapar:
# overload bloğu eksik kalırsa veya yeni fonksiyonel path eklendiğinde
# overload yazılmadıysa burada hata verir.
#
# Kullanım:
#   npm run check:ts57
#   # veya doğrudan: bash scripts/check-ts57-strict.sh
#
# Pre-publish hook'a eklemek için package.json `prepublishOnly`'ye `npm run check:ts57`
# ekleyin. CI hook'u olarak GitHub Action'da `node setup` sonrası çalıştırılabilir.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$(mktemp -t tsc57-sim.XXXXXX.json)"
trap 'rm -f "$CONFIG_FILE"' EXIT

cat > "$CONFIG_FILE" <<JSON
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "typeRoots": ["$REPO_ROOT/node_modules/@types"]
  },
  "include": [
    "$REPO_ROOT/__tests__/integration/session-paths-action-helper.test.ts",
    "$REPO_ROOT/__tests__/integration/exports.test.ts",
    "$REPO_ROOT/src/**/*.ts"
  ]
}
JSON

echo "→ TS 5.7.3 + Mimsoft tsconfig simülasyonu (target ES2022, module esnext, moduleResolution bundler, strict)..."

if npx -p typescript@5.7.3 tsc --project "$CONFIG_FILE"; then
  echo "✅ TS 5.7.3 strict typecheck temiz — Mimsoft tüketici ortamında 0 hata bekleniyor."
  exit 0
else
  echo "❌ TS 5.7.3 strict typecheck FAIL — Mimsoft tüketici ortamında TS2345 veya başka sorun olası."
  echo "   Sebepler:"
  echo "   1. invoice-session.ts'te update() overload bloğu eksik veya yanlış"
  echo "   2. Yeni fonksiyonel SessionPaths.X(i) eklendi ama overload yazılmadı"
  echo "   3. Generator regenerate sonrası path tipi değişti"
  echo "   Plan: src/calculator/invoice-session.ts update() overload bloğunu güncelle."
  exit 1
fi
