/**
 * Sprint 8e/8f — meta.json filter CLI.
 *
 * Kullanım:
 *   npx tsx examples-matrix/find.ts --profile=TEMELFATURA
 *   npx tsx examples-matrix/find.ts --profile=TEMELFATURA --type=IHRACKAYITLI
 *   npx tsx examples-matrix/find.ts --error-code=MISSING_FIELD
 *   npx tsx examples-matrix/find.ts --exemption=308
 *   npx tsx examples-matrix/find.ts --needs-review
 *   npx tsx examples-matrix/find.ts --phantom-kdv
 *   npx tsx examples-matrix/find.ts --currency=EUR
 *
 * Sprint 8f.14 — 4 yeni filtre:
 *   npx tsx examples-matrix/find.ts --has-withholding
 *   npx tsx examples-matrix/find.ts --line-count=3
 *   npx tsx examples-matrix/find.ts --kind=invoice
 *   npx tsx examples-matrix/find.ts --multi-error
 *
 * Filtreler AND ile birleşir (kombinasyon desteklenir).
 * Çıktı: eşleşen klasör yollarının listesi.
 */

import * as fs from 'fs';
import * as path from 'path';

const MATRIX_ROOT = __dirname;

interface Flags {
  profile?: string;
  type?: string;
  errorCode?: string;
  exemption?: string;
  currency?: string;
  lineCount?: number;
  kind?: string;
  needsReview: boolean;
  phantomKdv: boolean;
  hasWithholding: boolean;
  multiError: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    needsReview: false, phantomKdv: false, hasWithholding: false, multiError: false,
  };
  for (const a of argv) {
    if (a === '--needs-review') flags.needsReview = true;
    else if (a === '--phantom-kdv') flags.phantomKdv = true;
    else if (a === '--has-withholding') flags.hasWithholding = true;
    else if (a === '--multi-error') flags.multiError = true;
    else if (a.startsWith('--profile=')) flags.profile = a.slice('--profile='.length);
    else if (a.startsWith('--type=')) flags.type = a.slice('--type='.length);
    else if (a.startsWith('--error-code=')) flags.errorCode = a.slice('--error-code='.length);
    else if (a.startsWith('--exemption=') || a.startsWith('--exemption-code=')) {
      flags.exemption = a.split('=')[1];
    }
    else if (a.startsWith('--currency=')) flags.currency = a.slice('--currency='.length);
    else if (a.startsWith('--line-count=')) flags.lineCount = Number(a.slice('--line-count='.length));
    else if (a.startsWith('--kind=')) flags.kind = a.slice('--kind='.length);
  }
  return flags;
}

interface Result {
  relPath: string;
  kind: string;
  label: string;
}

function discover(): Result[] {
  const out: Result[] = [];
  const validDir = path.join(MATRIX_ROOT, 'valid');
  const invalidDir = path.join(MATRIX_ROOT, 'invalid');

  for (const [subdir, base] of [['valid', validDir], ['invalid', invalidDir]] as const) {
    if (!fs.existsSync(base)) continue;
    for (const cat of fs.readdirSync(base, { withFileTypes: true })) {
      if (!cat.isDirectory()) continue;
      const catPath = path.join(base, cat.name);
      for (const scen of fs.readdirSync(catPath, { withFileTypes: true })) {
        if (!scen.isDirectory()) continue;
        const metaPath = path.join(catPath, scen.name, 'meta.json');
        if (!fs.existsSync(metaPath)) continue;
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          out.push({
            relPath: `${subdir}/${cat.name}/${scen.name}`,
            kind: String(meta.kind ?? '?'),
            label: meta,
          });
        } catch {
          /* ignore */
        }
      }
    }
  }
  return out;
}

function matches(item: Result, flags: Flags): boolean {
  const m = item.label as Record<string, unknown>;

  if (flags.profile) {
    const p = (m.profile ?? m.profileContext ?? '') as string;
    if (p.toUpperCase() !== flags.profile.toUpperCase()) return false;
  }
  if (flags.type) {
    const t = (m.type ?? m.typeContext ?? '') as string;
    if (t.toUpperCase() !== flags.type.toUpperCase()) return false;
  }
  if (flags.errorCode) {
    const primary = m.primaryCode as string | undefined;
    const codes = (m.errorCodes ?? []) as string[];
    if (primary !== flags.errorCode && !codes.includes(flags.errorCode)) return false;
  }
  if (flags.exemption) {
    const dims = m.dimensions as Record<string, unknown> | undefined;
    const codes = (dims?.exemptionCodes ?? []) as string[];
    if (!codes.includes(flags.exemption)) return false;
  }
  if (flags.currency) {
    const dims = m.dimensions as Record<string, unknown> | undefined;
    if (String(dims?.currency ?? '').toUpperCase() !== flags.currency.toUpperCase()) return false;
  }
  if (flags.needsReview) {
    if (m.review !== 'needs-manual-check') return false;
  }
  if (flags.phantomKdv) {
    const dims = m.dimensions as Record<string, unknown> | undefined;
    if (!dims?.phantomKdv) return false;
  }
  // Sprint 8f.14 — yeni filtreler
  if (flags.hasWithholding) {
    const dims = m.dimensions as Record<string, unknown> | undefined;
    const codes = (dims?.withholdingCodes ?? []) as unknown[];
    if (codes.length === 0) return false;
  }
  if (flags.lineCount !== undefined) {
    const dims = m.dimensions as Record<string, unknown> | undefined;
    if (Number(dims?.lineCount) !== flags.lineCount) return false;
  }
  if (flags.kind) {
    if (String(m.kind) !== flags.kind) return false;
  }
  if (flags.multiError) {
    if (m.isMultiError !== true) return false;
  }
  return true;
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2));
  const all = discover();
  const matched = all.filter((item) => matches(item, flags));

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  examples-matrix/find — ${matched.length}/${all.length} eşleşme`);
  console.log(`${'─'.repeat(70)}\n`);

  for (const { relPath, kind } of matched) {
    console.log(`  [${kind.padEnd(16)}]  ${relPath}`);
  }

  console.log(`\n${'─'.repeat(70)}\n`);
}

if (require.main === module) {
  main();
}
