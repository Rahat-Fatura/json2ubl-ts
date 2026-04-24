/**
 * Sprint 8e — meta.json → README.md auto-generator.
 *
 * examples-matrix/ altındaki tüm valid + invalid meta.json'ları tarayıp
 * profil bazında gruplanmış markdown tablo üretir.
 *
 * Kullanım:
 *   npx tsx examples-matrix/_lib/meta-indexer.ts             # stdout
 *   npx tsx examples-matrix/_lib/meta-indexer.ts --write     # README.md'ye yaz
 */

import * as fs from 'fs';
import * as path from 'path';
import { PROFILE_TYPE_MATRIX } from '../../src/config/constants';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';

const MATRIX_ROOT = path.resolve(__dirname, '..');

interface ValidMeta {
  id: string;
  kind: 'invoice' | 'despatch';
  profile: string;
  type: string;
  variantSlug: string;
  dimensions: Record<string, unknown>;
  notes: string;
  review?: string;
}

interface InvalidMeta {
  id: string;
  kind: 'invalid-invoice' | 'invalid-despatch';
  primaryCode: string;
  errorCodes: string[];
  description: string;
  profileContext: string;
  typeContext: string;
  validationLevel: string;
  isMultiError: boolean;
  review?: string;
}

function readJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function discoverValid(): Array<{ relPath: string; meta: ValidMeta }> {
  const validDir = path.join(MATRIX_ROOT, 'valid');
  const out: Array<{ relPath: string; meta: ValidMeta }> = [];
  if (!fs.existsSync(validDir)) return out;

  for (const profileDir of fs.readdirSync(validDir, { withFileTypes: true })) {
    if (!profileDir.isDirectory()) continue;
    const profilePath = path.join(validDir, profileDir.name);
    for (const slugDir of fs.readdirSync(profilePath, { withFileTypes: true })) {
      if (!slugDir.isDirectory()) continue;
      const metaPath = path.join(profilePath, slugDir.name, 'meta.json');
      const meta = readJson<ValidMeta>(metaPath);
      if (meta) {
        out.push({
          relPath: `valid/${profileDir.name}/${slugDir.name}`,
          meta,
        });
      }
    }
  }
  return out.sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}

function discoverInvalid(): Array<{ relPath: string; meta: InvalidMeta }> {
  const invalidDir = path.join(MATRIX_ROOT, 'invalid');
  const out: Array<{ relPath: string; meta: InvalidMeta }> = [];
  if (!fs.existsSync(invalidDir)) return out;

  for (const codeDir of fs.readdirSync(invalidDir, { withFileTypes: true })) {
    if (!codeDir.isDirectory()) continue;
    const codePath = path.join(invalidDir, codeDir.name);
    for (const slugDir of fs.readdirSync(codePath, { withFileTypes: true })) {
      if (!slugDir.isDirectory()) continue;
      const metaPath = path.join(codePath, slugDir.name, 'meta.json');
      const meta = readJson<InvalidMeta>(metaPath);
      if (meta) {
        out.push({
          relPath: `invalid/${codeDir.name}/${slugDir.name}`,
          meta,
        });
      }
    }
  }
  return out.sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}

function groupValidByProfile(
  valid: Array<{ relPath: string; meta: ValidMeta }>,
): Map<string, Array<{ relPath: string; meta: ValidMeta }>> {
  const map = new Map<string, Array<{ relPath: string; meta: ValidMeta }>>();
  for (const item of valid) {
    const key = item.meta.profile;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function groupInvalidByPrimaryCode(
  invalid: Array<{ relPath: string; meta: InvalidMeta }>,
): Map<string, Array<{ relPath: string; meta: InvalidMeta }>> {
  const map = new Map<string, Array<{ relPath: string; meta: InvalidMeta }>>();
  for (const item of invalid) {
    const key = item.meta.primaryCode;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

// Sprint 8f.13: Pivot + coverage gap + error/exemption dağılım helpers

function buildPivotTable(valid: Array<{ meta: ValidMeta }>): { rows: string[]; matrixTypes: string[] } {
  // Tüm tipleri topla (yalnızca invoice senaryolarından; despatch ayrı)
  const typeSet = new Set<string>();
  const countMap = new Map<string, Map<string, number>>();
  for (const { meta } of valid) {
    if (meta.kind !== 'invoice') continue;
    typeSet.add(meta.type);
    if (!countMap.has(meta.profile)) countMap.set(meta.profile, new Map());
    const typeMap = countMap.get(meta.profile)!;
    typeMap.set(meta.type, (typeMap.get(meta.type) ?? 0) + 1);
  }
  const matrixTypes = Array.from(typeSet).sort();
  const profiles = Array.from(countMap.keys()).sort();

  const rows: string[] = [];
  rows.push(`| Profil \\ Tip | ${matrixTypes.join(' | ')} | **Toplam** |`);
  rows.push(`|---${matrixTypes.map(() => '|---:').join('')}|---:|`);
  for (const profile of profiles) {
    const typeMap = countMap.get(profile)!;
    const cells = matrixTypes.map(t => {
      const n = typeMap.get(t);
      return n ? String(n) : '—';
    });
    const total = Array.from(typeMap.values()).reduce((a, b) => a + b, 0);
    rows.push(`| ${profile} | ${cells.join(' | ')} | **${total}** |`);
  }
  return { rows, matrixTypes };
}

function buildCoverageGap(valid: Array<{ meta: ValidMeta }>): string[] {
  // Mevcut kombinasyonlar set
  const coveredSet = new Set<string>();
  for (const { meta } of valid) {
    if (meta.kind !== 'invoice') continue;
    coveredSet.add(`${meta.profile}|${meta.type}`);
  }

  // PROFILE_TYPE_MATRIX tümünü tara
  const missing: Array<{ profile: string; type: string }> = [];
  for (const [profileKey, typeSet] of Object.entries(PROFILE_TYPE_MATRIX)) {
    const profileName = profileKey as InvoiceProfileId;
    for (const type of typeSet) {
      const typeName = type as InvoiceTypeCode;
      if (!coveredSet.has(`${profileName}|${typeName}`)) {
        missing.push({ profile: profileName, type: typeName });
      }
    }
  }

  const lines: string[] = [];
  if (missing.length === 0) {
    lines.push('✅ **Tüm PROFILE_TYPE_MATRIX kombinasyonları kapsamlı.**');
  } else {
    lines.push(`⚠️ **${missing.length} kombinasyon kapsamsız** (PROFILE_TYPE_MATRIX'te izinli ama senaryo yok):`);
    lines.push('');
    for (const { profile, type } of missing) {
      lines.push(`- ${profile} × ${type}`);
    }
  }
  return lines;
}

function buildBarChart(counts: Map<string, number>, title: string): string[] {
  const lines: string[] = [];
  lines.push(`### ${title}`);
  lines.push('');
  lines.push('```');
  const sortedEntries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedEntries.length === 0) {
    lines.push('(veri yok)');
  } else {
    const maxCount = Math.max(...sortedEntries.map(([, n]) => n));
    const maxLabelLen = Math.max(...sortedEntries.map(([k]) => k.length));
    for (const [label, count] of sortedEntries) {
      const barLen = Math.round((count / maxCount) * 24);
      const bar = '█'.repeat(barLen);
      lines.push(`${label.padEnd(maxLabelLen)}  ${bar} ${count}`);
    }
  }
  lines.push('```');
  lines.push('');
  return lines;
}

function buildErrorCodeChart(
  invalid: Array<{ meta: InvalidMeta }>,
): string[] {
  const counts = new Map<string, number>();
  for (const { meta } of invalid) {
    counts.set(meta.primaryCode, (counts.get(meta.primaryCode) ?? 0) + 1);
  }
  return buildBarChart(counts, 'Error Code Dağılımı (invalid senaryolarda)');
}

function buildExemptionCodeChart(
  valid: Array<{ meta: ValidMeta }>,
): string[] {
  const counts = new Map<string, number>();
  for (const { meta } of valid) {
    const codes = (meta.dimensions as any)?.exemptionCodes;
    if (Array.isArray(codes)) {
      for (const c of codes) {
        counts.set(String(c), (counts.get(String(c)) ?? 0) + 1);
      }
    }
  }
  return buildBarChart(counts, 'Exemption Code Dağılımı (valid senaryolarda)');
}

export function buildReadme(): string {
  const valid = discoverValid();
  const invalid = discoverInvalid();
  const validByProfile = groupValidByProfile(valid);
  const invalidByCode = groupInvalidByPrimaryCode(invalid);

  // Matrix istatistikleri
  const matrixTotal = Object.values(PROFILE_TYPE_MATRIX).reduce((a, s) => a + s.size, 0);
  const coveredCombos = new Set<string>();
  for (const { meta } of valid) {
    if (meta.kind === 'invoice') coveredCombos.add(`${meta.profile}|${meta.type}`);
  }
  const coverageRatio = matrixTotal > 0 ? (coveredCombos.size / matrixTotal) * 100 : 0;

  const lines: string[] = [];
  lines.push('# examples-matrix/');
  lines.push('');
  lines.push('Sprint 8e (Publish Öncesi Kapsam Doğrulama) + Sprint 8f (Bug hotfix + kapsam genişletme) altında üretilen **script-assisted kapsam kataloğu**. Kütüphanenin desteklediği profil+tip kombinasyonları ve validator error code\'ları için çalıştırılabilir example\'lar.');
  lines.push('');
  lines.push('> **Auto-generated** — `examples-matrix/_lib/meta-indexer.ts` tarafından tüm `meta.json` dosyalarından üretilir. Manuel düzenleme yapılmamalı; yerine `npx tsx examples-matrix/_lib/meta-indexer.ts --write` ile yeniden üretilir.');
  lines.push('');

  // Dashboard özet
  lines.push('## 📊 Özet (Dashboard)');
  lines.push('');
  lines.push(`- **${validByProfile.size} profil** × **${new Set(valid.filter(v => v.meta.kind === 'invoice').map(v => v.meta.type)).size} tip** — PROFILE_TYPE_MATRIX'te **${matrixTotal} kombinasyon** tanımlı`);
  lines.push(`- **${valid.length} valid senaryo** (${valid.filter(v => v.meta.kind === 'invoice').length} invoice + ${valid.filter(v => v.meta.kind === 'despatch').length} despatch)`);
  lines.push(`- **${invalid.length} invalid senaryo** — ${invalidByCode.size} farklı error code kapsıyor`);
  lines.push(`- **Coverage:** ${coveredCombos.size}/${matrixTotal} kombinasyon (%${coverageRatio.toFixed(1)})`);
  lines.push(`- **Toplam:** ${valid.length + invalid.length} senaryo`);
  lines.push('');

  lines.push('## Kullanım');
  lines.push('');
  lines.push('```bash');
  lines.push('# Senaryoları scaffold et (spec → klasör):');
  lines.push('npx tsx examples-matrix/scaffold.ts');
  lines.push('');
  lines.push('# Tüm senaryoları çalıştır:');
  lines.push('npx tsx examples-matrix/run-all.ts');
  lines.push('');
  lines.push('# Filtreleyerek gezin:');
  lines.push('npx tsx examples-matrix/find.ts --profile=TEMELFATURA --type=IHRACKAYITLI');
  lines.push('npx tsx examples-matrix/find.ts --error-code=MISSING_FIELD');
  lines.push('npx tsx examples-matrix/find.ts --has-withholding --currency=USD');
  lines.push('```');
  lines.push('');

  // Pivot tablo
  lines.push('## Profil × Tip Pivot Tablosu');
  lines.push('');
  const { rows: pivotRows } = buildPivotTable(valid);
  lines.push(...pivotRows);
  lines.push('');

  // Coverage gap
  lines.push('## Coverage Gap Report');
  lines.push('');
  lines.push(...buildCoverageGap(valid));
  lines.push('');

  // Error code dağılımı
  lines.push('## Kod Dağılımları');
  lines.push('');
  lines.push(...buildErrorCodeChart(invalid));
  lines.push(...buildExemptionCodeChart(valid));

  // Valid — profil bazında
  lines.push('## Valid Senaryolar (profil bazında)');
  lines.push('');
  const sortedProfiles = Array.from(validByProfile.keys()).sort();
  for (const profile of sortedProfiles) {
    const items = validByProfile.get(profile)!;
    lines.push(`### ${profile} (${items.length})`);
    lines.push('');
    lines.push('| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const { relPath, meta } of items) {
      const dims = meta.dimensions as Record<string, unknown>;
      const kdvArr = Array.isArray(dims.kdvBreakdown) ? (dims.kdvBreakdown as number[]).join(',') : '—';
      const currency = String(dims.currency ?? '—');
      const specials = Array.isArray(dims.specialIdentifiers) ? (dims.specialIdentifiers as string[]).join(', ') : '—';
      lines.push(`| [${meta.id}](${relPath}/) | ${meta.type} | ${meta.variantSlug} | ${kdvArr} | ${currency} | ${specials || '—'} | ${meta.notes} |`);
    }
    lines.push('');
  }

  // Invalid — error code bazında
  lines.push('## Invalid Senaryolar (error code bazında)');
  lines.push('');
  const sortedCodes = Array.from(invalidByCode.keys()).sort();
  for (const code of sortedCodes) {
    const items = invalidByCode.get(code)!;
    lines.push(`### ${code} (${items.length})`);
    lines.push('');
    lines.push('| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |');
    lines.push('|---|---|---|---|---|');
    for (const { relPath, meta } of items) {
      lines.push(`| [${meta.id}](${relPath}/) | ${meta.profileContext} | ${meta.typeContext} | ${meta.isMultiError ? 'Yes' : 'No'} | ${meta.description} |`);
    }
    lines.push('');
  }

  lines.push('## Kapsam Dışı');
  lines.push('');
  lines.push('Sprint 8e (dokunulmaz) + Sprint 8f (sadece bug fix için src/ dokunuldu):');
  lines.push('');
  lines.push('- `src/**` — Sprint 8e boyunca tamamen dokunulmadı; 8f\'te sadece Bug #1-3 fix\'leri için minimal değişiklik (WITHHOLDING_ALLOWED_TYPES, validateOzelMatrah, YATIRIMTESVIK_REQUIRES_YTBNO). Yeni feature yok.');
  lines.push('- `examples/**` — Mevcut 38 el-yazımı senaryo (dokunulmaz).');
  lines.push('');

  return lines.join('\n');
}

function main(): void {
  const readme = buildReadme();
  const flags = process.argv.slice(2);
  if (flags.includes('--write')) {
    const outPath = path.join(MATRIX_ROOT, 'README.md');
    fs.writeFileSync(outPath, readme, 'utf-8');
    console.log(`README.md yazıldı: ${outPath}`);
  } else {
    console.log(readme);
  }
}

// tsx ile çalıştırıldığında main
if (require.main === module) {
  main();
}
