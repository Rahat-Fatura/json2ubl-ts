/**
 * Sprint 8e — examples-matrix/ orchestrator.
 *
 * Valid senaryoları (`valid/<profile>/<slug>/run.ts`) ve invalid senaryoları
 * (`invalid/<error-code>/<slug>/run.ts`) keşfedip dynamic import ile çalıştırır.
 * run.ts'ler side-effect-driven (input.json + output.xml / actual-error.json yazılır).
 *
 * Kullanım:
 *   npx tsx examples-matrix/run-all.ts                    # tüm senaryolar
 *   npx tsx examples-matrix/run-all.ts --only temelfatura # slug filtresi
 *   npx tsx examples-matrix/run-all.ts --valid-only       # sadece valid
 *   npx tsx examples-matrix/run-all.ts --invalid-only     # sadece invalid
 */

import * as fs from 'fs';
import * as path from 'path';

const MATRIX_DIR = __dirname;

interface Flags {
  only: string | null;
  validOnly: boolean;
  invalidOnly: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { only: null, validOnly: false, invalidOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') flags.only = argv[++i] ?? null;
    else if (a === '--valid-only') flags.validOnly = true;
    else if (a === '--invalid-only') flags.invalidOnly = true;
  }
  return flags;
}

function discoverScenarios(subdir: string): string[] {
  const base = path.join(MATRIX_DIR, subdir);
  if (!fs.existsSync(base)) return [];
  // İki seviye: <category>/<scenario-slug>
  const out: string[] = [];
  for (const category of fs.readdirSync(base, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryDir = path.join(base, category.name);
    for (const scenario of fs.readdirSync(categoryDir, { withFileTypes: true })) {
      if (!scenario.isDirectory()) continue;
      const runTs = path.join(categoryDir, scenario.name, 'run.ts');
      if (fs.existsSync(runTs)) {
        out.push(`${subdir}/${category.name}/${scenario.name}`);
      }
    }
  }
  return out.sort();
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  let scenarios: string[] = [];
  if (!flags.invalidOnly) scenarios.push(...discoverScenarios('valid'));
  if (!flags.validOnly) scenarios.push(...discoverScenarios('invalid'));

  if (flags.only) {
    scenarios = scenarios.filter((s) => s.includes(flags.only!));
  }

  let ok = 0;
  let err = 0;
  const errors: Array<{ slug: string; message: string }> = [];

  console.log(`\n${'═'.repeat(70)}`);
  console.log('  examples-matrix/ run-all');
  console.log(`  ${scenarios.length} senaryo çalıştırılıyor`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const slug of scenarios) {
    try {
      await import(`./${slug}/run`);
      console.log(`  ✅ ${slug}`);
      ok++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.log(`  ❌ ${slug}\n     HATA: ${message}`);
      errors.push({ slug, message });
      err++;
    }
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  Sonuç: ${ok} başarılı, ${err} hatalı / ${scenarios.length} toplam`);
  if (errors.length > 0) {
    console.log('\n  Hatalar:');
    for (const e of errors) console.log(`    - ${e.slug}: ${e.message}`);
  }
  console.log(`${'═'.repeat(70)}\n`);

  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
