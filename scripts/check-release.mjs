#!/usr/bin/env node
/**
 * Yayın kapısı — `npm publish` öncesi (`prepublishOnly`) koşar.
 *
 * Sürüm politikasının (docs/surum-politikasi.md) otomatik denetlenebilen üç
 * maddesi burada. Biri tutmazsa yayın DURUR:
 *
 *   1. Çalışma ağacı temiz — yayımlanan paket bir commit'e karşılık gelmeli.
 *   2. HEAD'i gösteren `v<package.json version>` etiketi var — npm'deki her
 *      sürüm depoda bulunabilmeli (5.0.0'a kadar 23 sürümün etiketi yoktu).
 *   3. CHANGELOG'da `## [<version>]` girdisi var ve "yayımlanmadı" işareti
 *      taşımıyor.
 *
 * Kapıyı bilinçli olarak atlamak için: `JSON2UBL_SKIP_RELEASE_CHECK=1`.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.JSON2UBL_SKIP_RELEASE_CHECK === '1') {
  console.warn('⚠️  check-release ATLANDI (JSON2UBL_SKIP_RELEASE_CHECK=1)');
  process.exit(0);
}

const git = (args) => execSync(`git ${args}`, { cwd: root, encoding: 'utf8' }).trim();
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const tag = `v${version}`;
const problems = [];

const dirty = git('status --porcelain');
if (dirty) problems.push(`Çalışma ağacı temiz değil:\n${dirty}`);

const tagsAtHead = git('tag --points-at HEAD').split('\n').filter(Boolean);
if (!tagsAtHead.includes(tag)) {
  problems.push(
    `HEAD'de '${tag}' etiketi yok (HEAD'deki etiketler: ${tagsAtHead.join(', ') || 'yok'}).\n`
      + `  git tag -a ${tag} -m "${version} — …" && git push origin ${tag}`,
  );
}

const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const heading = changelog.split('\n').find((line) => line.startsWith(`## [${version}]`));
if (!heading) problems.push(`CHANGELOG.md içinde '## [${version}]' girdisi yok.`);
else if (/yayımlanmadı/i.test(heading)) problems.push(`CHANGELOG girdisi 'yayımlanmadı' işaretli: ${heading}`);

if (problems.length > 0) {
  console.error(`✘ Yayın kapısı (${tag}) KAPALI:\n\n- ${problems.join('\n- ')}\n`);
  process.exit(1);
}
console.log(`✔ Yayın kapısı açık: ${tag} HEAD'de, ağaç temiz, CHANGELOG girdisi var.`);
