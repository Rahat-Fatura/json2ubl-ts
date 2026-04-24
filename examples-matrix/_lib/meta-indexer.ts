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

export function buildReadme(): string {
  const valid = discoverValid();
  const invalid = discoverInvalid();
  const validByProfile = groupValidByProfile(valid);
  const invalidByCode = groupInvalidByPrimaryCode(invalid);

  const lines: string[] = [];
  lines.push('# examples-matrix/');
  lines.push('');
  lines.push('Sprint 8e (Publish Öncesi Kapsam Doğrulama) altında üretilen **script-assisted kapsam kataloğu**. Kütüphanenin desteklediği profil+tip kombinasyonları ve validator error code\'ları için çalıştırılabilir example\'lar.');
  lines.push('');
  lines.push('> **Auto-generated** — `examples-matrix/_lib/meta-indexer.ts` tarafından tüm `meta.json` dosyalarından üretilir. Manuel düzenleme yapılmamalı; yerine `npx tsx examples-matrix/_lib/meta-indexer.ts --write` ile yeniden üretilir.');
  lines.push('');
  lines.push(`## Özet`);
  lines.push('');
  lines.push(`- **Valid senaryo:** ${valid.length} (${validByProfile.size} profil)`);
  lines.push(`- **Invalid senaryo:** ${invalid.length} (${invalidByCode.size} farklı error code)`);
  lines.push(`- **Toplam:** ${valid.length + invalid.length}`);
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
  lines.push('```');
  lines.push('');

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
  lines.push('Sprint 8e boyunca aşağıdaki dizinler **dokunulmaz**:');
  lines.push('');
  lines.push('- `src/**` — Kütüphane kodu. Bulunan bug\'lar yalnızca `audit/sprint-08e-implementation-log.md` → "Bulunan Buglar" section\'ına loglanır; düzeltme Sprint 8f\'te yapılır.');
  lines.push('- `examples/**` — Mevcut 38 el-yazımı senaryo.');
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
