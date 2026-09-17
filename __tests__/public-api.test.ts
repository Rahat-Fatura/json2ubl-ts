/**
 * 🔴 CEPHE TAMLIK TESTİ — S4'ün asıl teslimatı.
 *
 * Bu paket bir kütüphane; gerçek sözleşmesi `src/index.ts`in dışa verdiği ADLAR.
 * MimForge'da 30+ dosya bu adlardan import ediyor (`SessionPaths`,
 * `SimpleInvoiceInput`, `CURRENCY_DEFINITIONS`, `InvoiceSession`,
 * `PartyIdentificationSchemeId`…). Bir klasör taşıması sırasında tek bir
 * `export` satırı düşerse kütüphanenin 2956 testi YEŞİL kalır ve kırılma ancak
 * tüketicinin `tsc`'sinde ortaya çıkar — yani en geç ve en pahalı yerde.
 *
 * Bu test o boşluğu kapatır: yüzey `__tests__/public-api.snapshot.txt`e
 * dondurulmuştur, her koşumda tip denetçisiyle yeniden ölçülür ve FARK SIFIR
 * olmalıdır. Bilerek yapılan bir cephe değişikliği snapshot'ı da güncellemeyi
 * gerektirir — yani `git diff`te GÖRÜNÜR olur, sessizce geçemez.
 *
 * Yenileme:  npx tsx scripts/public-api-surface.ts --write
 */

import * as fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
    collectPublicApi,
    renderSurface,
    parseSurface,
    SNAPSHOT_FILE,
    type PublicExport,
} from '../scripts/public-api-surface';
import * as publicEntry from '../src';

/** Yüzey ölçümü tam bir TS programı kurar (~1.5 sn) — bir kez yapılır. */
const liveApi: PublicExport[] = collectPublicApi();
const liveLines = parseSurface(renderSurface(liveApi));
const frozenLines = parseSurface(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

const nameOf = (line: string): string => line.split('\t')[1] ?? line;

describe('cephe tamlığı — src/index.ts dışa verdiği adlar', () => {
    it('donmuş yüzeyden HİÇBİR ad DÜŞMEMİŞ olmalı', () => {
        const live = new Set(liveLines.map(nameOf));
        const missing = frozenLines.map(nameOf).filter((n) => !live.has(n));
        expect(
            missing,
            `Cephe daraldı — bu adlar artık dışa verilmiyor. MimForge'daki tüketici ` +
                `DERLENMEZ. Kaybolan adları geri bağlayın ya da kırılmayı bilerek ` +
                `yaptığınızı snapshot'ı güncelleyerek beyan edin.\nKayıp: ${missing.join(', ')}`,
        ).toEqual([]);
    });

    it('bir adın anlamı (değer/tip) DARALMAMIŞ olmalı', () => {
        const liveKinds = new Map(liveApi.map((e) => [e.name, e.kind]));
        const narrowed = frozenLines
            .map((line) => {
                const [kind, name] = line.split('\t');
                return { name: name ?? '', frozen: kind ?? '', now: liveKinds.get(name ?? '') };
            })
            .filter((e) => e.now !== undefined && e.now !== e.frozen);
        expect(
            narrowed.map((e) => `${e.name}: ${e.frozen} → ${e.now}`),
            "Bir adın değer/tip niteliği değişti. `value+type` → `type` daralması, " +
                'tüketicide `import { X }` satırını sessizce kırar.',
        ).toEqual([]);
    });

    it('yüzey donmuş dosyayla BİREBİR aynı olmalı (fark sıfır)', () => {
        expect(
            liveLines,
            'Cephe yüzeyi değişti. Ekleme kasıtlıysa snapshot\'ı yenileyin: ' +
                'npx tsx scripts/public-api-surface.ts --write',
        ).toEqual(frozenLines);
    });

    it('`value` olarak bildirilen her ad ÇALIŞMA ZAMANINDA da var olmalı', () => {
        const runtime = publicEntry as unknown as Record<string, unknown>;
        const absent = liveApi
            .filter((e) => e.kind === 'value' || e.kind === 'value+type')
            .map((e) => e.name)
            .filter((name) => !(name in runtime));
        expect(
            absent,
            'Tip düzeyinde görünen ama çalışma zamanında olmayan ad(lar) — ' +
                '`export type` ile `export` karışmış olabilir.',
            ).toEqual([]);
    });

    it('yüzey boş olmamalı — ölçüm aracının kendisi de bekçili', () => {
        // Ölçüm sessizce 0 ad döndürürse yukarıdaki üç test de "yeşil" olurdu.
        expect(liveApi.length).toBeGreaterThan(200);
    });
});
