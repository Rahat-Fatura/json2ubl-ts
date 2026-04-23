/**
 * Sprint 8b Comprehensive Examples Runner.
 *
 * Klasör yapısı: `examples/NN-slug/run.ts` her biri bağımsız bir senaryo
 * çalıştırır (validate + build + write). Bu script alt klasörleri
 * auto-discover edip sırayla import eder; run.ts'ler side-effect-driven.
 *
 * Kullanım:
 *   npx tsx examples/run-all.ts                 # tüm senaryoları çalıştır
 *   npx tsx examples/run-all.ts 02 12           # slug'ında "02" veya "12" geçenler
 *   npx tsx examples/run-all.ts yatirimtesvik   # slug'ında "yatirimtesvik" geçenler
 *   npx tsx examples/NN-slug/run.ts             # tek senaryo bağımsız
 */

import * as fs from 'fs';
import * as path from 'path';

const EXAMPLES_DIR = __dirname;

async function main(): Promise<void> {
  const dirs = fs
    .readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^(\d{2}|99)-/.test(d.name))
    .map((d) => d.name)
    .sort();

  const filter = process.argv.slice(2);
  const toRun = filter.length > 0 ? dirs.filter((d) => filter.some((f) => d.includes(f))) : dirs;

  let ok = 0;
  let err = 0;
  const errors: { dir: string; message: string }[] = [];

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  json2ubl-ts Sprint 8b — Comprehensive Examples`);
  console.log(`  ${toRun.length} senaryo çalıştırılıyor`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const dir of toRun) {
    const runPath = path.join(EXAMPLES_DIR, dir, 'run.ts');
    if (!fs.existsSync(runPath)) {
      console.log(`  ⚠️  ${dir} — run.ts yok, atlanıyor`);
      continue;
    }
    try {
      await import(`./${dir}/run`);
      console.log(`  ✅ ${dir}`);
      ok++;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.log(`  ❌ ${dir}\n     HATA: ${message}`);
      errors.push({ dir, message });
      err++;
    }
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  Sonuç: ${ok} başarılı, ${err} hatalı / ${toRun.length} toplam`);
  if (errors.length > 0) {
    console.log(`\n  Hatalar:`);
    for (const e of errors) console.log(`    - ${e.dir}: ${e.message}`);
  }
  console.log(`${'═'.repeat(70)}\n`);

  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
