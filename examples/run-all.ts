/**
 * Tüm senaryoları çalıştırıp JSON input + XML output + hesaplama özetini dosyaya yazar.
 *
 * Kullanım:
 *   npx tsx examples/run-all.ts            # tümünü çalıştır
 *   npx tsx examples/run-all.ts 08         # sadece 08 numaralı senaryoyu çalıştır
 *   npx tsx examples/run-all.ts 08 12 22   # birden fazla senaryo
 */

import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder } from '../src/calculator/simple-invoice-builder';
import { calculateDocument } from '../src/calculator/document-calculator';
import { allScenarios } from './scenarios';

const OUTPUT_DIR = path.join(__dirname, 'output');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatMoney(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function run(): void {
  ensureDir(OUTPUT_DIR);

  const args = process.argv.slice(2);
  const filter = args.length > 0 ? args : null;

  const builder = new SimpleInvoiceBuilder({
    prettyPrint: true,
    validationLevel: 'none', // örneklerde validasyon kapalı — gerçek kullanımda 'basic' veya 'strict'
    returnCalculation: true,
  });

  let successCount = 0;
  let errorCount = 0;
  const errors: { name: string; error: string }[] = [];

  const scenariosToRun = filter
    ? allScenarios.filter(s => filter.some(f => s.name.includes(f)))
    : allScenarios;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  json2ubl-ts — Örnek Senaryo Runner`);
  console.log(`  ${scenariosToRun.length} senaryo çalıştırılacak`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const scenario of scenariosToRun) {
    const scenarioDir = path.join(OUTPUT_DIR, scenario.name);
    ensureDir(scenarioDir);

    try {
      // Hesaplama
      const calc = calculateDocument(scenario.input);

      // XML üret
      const result = builder.build(scenario.input);

      // JSON input yaz
      fs.writeFileSync(
        path.join(scenarioDir, 'input.json'),
        JSON.stringify(scenario.input, null, 2),
        'utf-8',
      );

      // XML yaz
      fs.writeFileSync(
        path.join(scenarioDir, 'output.xml'),
        result.xml,
        'utf-8',
      );

      // Hesaplama özeti yaz
      const summary = buildSummary(scenario.name, calc);
      fs.writeFileSync(
        path.join(scenarioDir, 'summary.txt'),
        summary,
        'utf-8',
      );

      // Hesaplama detayı JSON
      fs.writeFileSync(
        path.join(scenarioDir, 'calculation.json'),
        JSON.stringify(calc, null, 2),
        'utf-8',
      );

      console.log(`  ✅ ${scenario.name}`);
      console.log(`     Tip: ${calc.type} | Profil: ${calc.profile}`);
      console.log(`     Toplam: ${formatMoney(calc.monetary.payableAmount)} ${scenario.input.currencyCode || 'TRY'}`);
      console.log(`     KDV: ${formatMoney(calc.taxes.taxTotal)}`);
      if (calc.withholding) {
        console.log(`     Tevkifat: ${formatMoney(calc.withholding.taxTotal)}`);
      }
      console.log('');

      successCount++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ ${scenario.name}`);
      console.log(`     HATA: ${errMsg}\n`);
      errors.push({ name: scenario.name, error: errMsg });

      // Hata durumunda da input'u kaydet
      fs.writeFileSync(
        path.join(scenarioDir, 'input.json'),
        JSON.stringify(scenario.input, null, 2),
        'utf-8',
      );
      fs.writeFileSync(
        path.join(scenarioDir, 'error.txt'),
        errMsg,
        'utf-8',
      );

      errorCount++;
    }
  }

  // Genel rapor
  console.log(`${'─'.repeat(70)}`);
  console.log(`  Sonuç: ${successCount} başarılı, ${errorCount} hatalı / ${scenariosToRun.length} toplam`);
  console.log(`  Çıktılar: ${OUTPUT_DIR}`);

  if (errors.length > 0) {
    console.log(`\n  Hatalar:`);
    for (const e of errors) {
      console.log(`    - ${e.name}: ${e.error}`);
    }
  }

  console.log(`${'═'.repeat(70)}\n`);
}

function buildSummary(name: string, calc: ReturnType<typeof calculateDocument>): string {
  const lines: string[] = [];
  lines.push(`Senaryo: ${name}`);
  lines.push(`${'─'.repeat(50)}`);
  lines.push(`Fatura Tipi   : ${calc.type}`);
  lines.push(`Fatura Profili: ${calc.profile}`);
  lines.push('');
  lines.push('── Satır Özetleri ──');

  for (const line of calc.calculatedLines) {
    lines.push(`  Satır ${line.id}: ${line.lineExtensionForMonetary.toFixed(2)} (brüt)`);
    if (line.allowanceObject.amount > 0) {
      lines.push(`    İskonto: -${line.allowanceObject.amount.toFixed(2)}`);
    }
    lines.push(`    Net Tutar: ${line.lineExtensionAmount.toFixed(2)}`);
    for (const tax of line.taxes.taxSubtotals) {
      lines.push(`    ${tax.code} %${tax.percent}: ${tax.amount.toFixed(2)} (matrah: ${tax.taxable.toFixed(2)})`);
    }
    if (line.withholdingObject.taxSubtotals.length > 0) {
      for (const wt of line.withholdingObject.taxSubtotals) {
        lines.push(`    Tevkifat ${wt.code} %${wt.percent}: -${wt.amount.toFixed(2)}`);
      }
    }
  }

  lines.push('');
  lines.push('── Belge Toplamları ──');
  lines.push(`  Satır Toplamı (brüt)   : ${calc.monetary.lineExtensionAmount.toFixed(2)}`);
  lines.push(`  İskonto Toplamı        : ${calc.monetary.allowanceTotalAmount.toFixed(2)}`);
  lines.push(`  Vergi Hariç Tutar      : ${calc.monetary.taxExclusiveAmount.toFixed(2)}`);
  lines.push(`  Vergi Toplamı          : ${calc.taxes.taxTotal.toFixed(2)}`);
  lines.push(`  Vergi Dahil Tutar      : ${calc.monetary.taxInclusiveAmount.toFixed(2)}`);
  if (calc.withholding) {
    lines.push(`  Tevkifat Toplamı       : ${calc.withholding.taxTotal.toFixed(2)}`);
  }
  lines.push(`  Ödenecek Tutar         : ${calc.monetary.payableAmount.toFixed(2)}`);

  lines.push('');
  lines.push('── Vergi Alt Toplamları ──');
  for (const ts of calc.taxes.taxSubtotals) {
    lines.push(`  ${ts.code} %${ts.percent}: ${ts.amount.toFixed(2)} (matrah: ${ts.taxable.toFixed(2)})`);
  }

  return lines.join('\n');
}

run();
