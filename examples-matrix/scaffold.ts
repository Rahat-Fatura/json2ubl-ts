/**
 * Sprint 8e — examples-matrix/ scaffold CLI.
 *
 * `_lib/specs.ts`'teki spec'leri okur, her biri için klasör yapısını kurar:
 *
 *   valid/<profile-lowercase>/<slug>/
 *     ├── input.ts
 *     ├── run.ts
 *     └── meta.json
 *
 *   invalid/<error-code-slug>/<slug>/
 *     ├── input.ts
 *     ├── expected-error.json
 *     ├── run.ts
 *     └── meta.json
 *
 * Varsayılan: idempotent — mevcut dosyalara dokunmaz (sadece eksikleri yazar).
 * `meta.json.review === 'needs-manual-check'` ise klasör tamamen atlanır.
 *
 * Flag'ler:
 *   --force         mevcut dosyaları üstüne yaz (needs-manual-check klasörleri hariç)
 *   --dry-run       diske yazmadan sadece planı yazdır
 *   --only <slug>   yalnız slug'ı eşleşen spec'leri işle
 *
 * Kullanım:
 *   npx tsx examples-matrix/scaffold.ts
 *   npx tsx examples-matrix/scaffold.ts --force
 *   npx tsx examples-matrix/scaffold.ts --only temelfatura-satis-baseline
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildInvoiceInputSource,
  buildDespatchInputSource,
} from './_lib/input-serializer';
import { allSpecs } from './_lib/specs';
import type { Spec, ValidSpec, InvalidSpec } from './_lib/scenario-spec';

const MATRIX_DIR = __dirname;

type Flags = {
  force: boolean;
  dryRun: boolean;
  only: string | null;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { force: false, dryRun: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') flags.force = true;
    else if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--only') flags.only = argv[++i] ?? null;
  }
  return flags;
}

function specClassification(spec: Spec): 'valid' | 'invalid' {
  return spec.kind === 'invoice' || spec.kind === 'despatch' ? 'valid' : 'invalid';
}

function errorCodeSlug(code: string): string {
  return code.toLowerCase().replace(/_/g, '-');
}

function scenarioDir(spec: Spec): string {
  if (spec.kind === 'invoice' || spec.kind === 'despatch') {
    const profile = spec.profile.toLowerCase();
    const type = spec.type.toLowerCase();
    const slug = `${profile}-${type}-${spec.variantSlug}`;
    return path.join(MATRIX_DIR, 'valid', profile, slug);
  }
  // invalid
  const codeSlug = errorCodeSlug(spec.primaryCode);
  const slug = `${codeSlug}-${spec.variantSlug}`;
  return path.join(MATRIX_DIR, 'invalid', codeSlug, slug);
}

function scenarioId(spec: Spec): string {
  if (spec.kind === 'invoice' || spec.kind === 'despatch') {
    return `${spec.profile.toLowerCase()}-${spec.type.toLowerCase()}-${spec.variantSlug}`;
  }
  return `${errorCodeSlug(spec.primaryCode)}-${spec.variantSlug}`;
}

function buildValidMeta(spec: ValidSpec, id: string): Record<string, unknown> {
  return {
    id,
    kind: spec.kind,
    profile: spec.profile,
    type: spec.type,
    variantSlug: spec.variantSlug,
    dimensions: spec.dimensions,
    generatedAt: new Date().toISOString(),
    generatedBy: 'examples-matrix/scaffold.ts',
    review: spec.review ?? 'auto-ok',
    notes: spec.notes,
  };
}

function buildInvalidMeta(
  spec: InvalidSpec,
  id: string,
): Record<string, unknown> {
  return {
    id,
    kind: spec.kind,
    primaryCode: spec.primaryCode,
    errorCodes: [...new Set(spec.expectedErrors.map((e) => e.code))],
    description: spec.description,
    profileContext: spec.profileContext,
    typeContext: spec.typeContext,
    validationLevel: spec.validationLevel,
    isMultiError: spec.isMultiError,
    generatedAt: new Date().toISOString(),
    generatedBy: 'examples-matrix/scaffold.ts',
    review: spec.review ?? 'auto-ok',
  };
}

/**
 * relativeSrcImport: input.ts konumundan `src`'e relative path.
 * - valid:   valid/<profile>/<slug>/input.ts → src: 4 level up (../../../../src)
 * - invalid: invalid/<code>/<slug>/input.ts  → src: 4 level up (../../../../src)
 */
const RELATIVE_SRC_IMPORT_FROM_SCENARIO = '../../../../src';

/** run.ts içeriği — valid senaryolar için. */
function buildValidRunSource(kind: 'invoice' | 'despatch'): string {
  const runner = kind === 'despatch' ? 'runDespatch' : 'runScenario';
  return [
    `import { ${runner} } from '../../../_lib/${runner}';`,
    `import input from './input';`,
    '',
    `${runner}(__dirname, input);`,
    '',
  ].join('\n');
}

/** run.ts içeriği — invalid senaryolar için. */
function buildInvalidRunSource(): string {
  return [
    `import { runInvalid } from '../../../_lib/runInvalid';`,
    `import input from './input';`,
    `import expected from './expected-error.json';`,
    '',
    `runInvalid(__dirname, input, expected);`,
    '',
  ].join('\n');
}

type WriteResult = 'written' | 'skipped-exists' | 'skipped-manual-check';

function maybeWriteFile(
  filePath: string,
  content: string,
  flags: Flags,
): WriteResult {
  const exists = fs.existsSync(filePath);
  if (exists && !flags.force) return 'skipped-exists';
  if (!flags.dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  return 'written';
}

/** Mevcut meta.json'da 'needs-manual-check' flag varsa true. */
function isManualCheckProtected(dir: string): boolean {
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaPath)) return false;
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return meta && meta.review === 'needs-manual-check';
  } catch {
    return false;
  }
}

interface ScaffoldStats {
  total: number;
  written: number;
  skippedExists: number;
  skippedManual: number;
  errors: number;
}

function scaffoldSpec(spec: Spec, flags: Flags): WriteResult {
  const dir = scenarioDir(spec);
  const id = scenarioId(spec);

  if (isManualCheckProtected(dir)) {
    return 'skipped-manual-check';
  }

  const inputPath = path.join(dir, 'input.ts');
  const runPath = path.join(dir, 'run.ts');
  const metaPath = path.join(dir, 'meta.json');

  let anyWritten = false;

  if (spec.kind === 'invoice') {
    const src = buildInvoiceInputSource(spec.input, RELATIVE_SRC_IMPORT_FROM_SCENARIO);
    const r1 = maybeWriteFile(inputPath, src, flags);
    const r2 = maybeWriteFile(runPath, buildValidRunSource('invoice'), flags);
    const r3 = maybeWriteFile(
      metaPath,
      JSON.stringify(buildValidMeta(spec, id), null, 2) + '\n',
      flags,
    );
    anyWritten = [r1, r2, r3].includes('written');
  } else if (spec.kind === 'despatch') {
    const src = buildDespatchInputSource(spec.input, RELATIVE_SRC_IMPORT_FROM_SCENARIO);
    const r1 = maybeWriteFile(inputPath, src, flags);
    const r2 = maybeWriteFile(runPath, buildValidRunSource('despatch'), flags);
    const r3 = maybeWriteFile(
      metaPath,
      JSON.stringify(buildValidMeta(spec, id), null, 2) + '\n',
      flags,
    );
    anyWritten = [r1, r2, r3].includes('written');
  } else {
    // invalid-invoice / invalid-despatch
    const src =
      spec.kind === 'invalid-invoice'
        ? buildInvoiceInputSource(spec.input, RELATIVE_SRC_IMPORT_FROM_SCENARIO)
        : buildDespatchInputSource(spec.input, RELATIVE_SRC_IMPORT_FROM_SCENARIO);
    const expectedPath = path.join(dir, 'expected-error.json');
    const r1 = maybeWriteFile(inputPath, src, flags);
    const r2 = maybeWriteFile(runPath, buildInvalidRunSource(), flags);
    const r3 = maybeWriteFile(
      expectedPath,
      JSON.stringify({ errors: spec.expectedErrors }, null, 2) + '\n',
      flags,
    );
    const r4 = maybeWriteFile(
      metaPath,
      JSON.stringify(buildInvalidMeta(spec, id), null, 2) + '\n',
      flags,
    );
    anyWritten = [r1, r2, r3, r4].includes('written');
  }

  return anyWritten ? 'written' : 'skipped-exists';
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2));
  const stats: ScaffoldStats = {
    total: 0,
    written: 0,
    skippedExists: 0,
    skippedManual: 0,
    errors: 0,
  };

  console.log(`\n${'═'.repeat(70)}`);
  console.log('  examples-matrix/ scaffold');
  if (flags.dryRun) console.log('  [DRY RUN — diske yazılmaz]');
  if (flags.force) console.log('  [--force — mevcut dosyalar üstüne yazılır]');
  if (flags.only) console.log(`  [--only ${flags.only}]`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const spec of allSpecs) {
    const classification = specClassification(spec);
    const id = scenarioId(spec);
    if (flags.only && !id.includes(flags.only)) continue;
    stats.total++;
    try {
      const result = scaffoldSpec(spec, flags);
      if (result === 'written') {
        stats.written++;
        console.log(`  ✅  [${classification}] ${id}`);
      } else if (result === 'skipped-manual-check') {
        stats.skippedManual++;
        console.log(`  🛡️  [${classification}] ${id} (needs-manual-check, atlandı)`);
      } else {
        stats.skippedExists++;
        console.log(`  ⏭️  [${classification}] ${id} (zaten mevcut)`);
      }
    } catch (e) {
      stats.errors++;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ❌  [${classification}] ${id}: ${msg}`);
    }
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(
    `  Toplam: ${stats.total}   ` +
      `Yazıldı: ${stats.written}   ` +
      `Atlandı (mevcut): ${stats.skippedExists}   ` +
      `Korundu (manuel): ${stats.skippedManual}   ` +
      `Hata: ${stats.errors}`,
  );
  console.log(`${'═'.repeat(70)}\n`);

  process.exit(stats.errors > 0 ? 1 : 0);
}

main();
