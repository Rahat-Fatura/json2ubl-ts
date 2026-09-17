/**
 * KATMAN BEKÇİSİ — `documents/* → ubltr/ → ubl/` tek yönlü bağımlılığı.
 *
 * NİYE VAR: klasör yapısı kendi kendini uygulamaz. Bu deponun kendi geçmişi
 * dersi veriyor — kök sekans tabloları yıllarca "tanımlı ama bağlı değil"
 * durdu ve sıra elle kuruldu; tablo doğruluk kaynağı sanılırken DEKORATİFTİ.
 * Bekçisiz bir katman ayrımının sonu aynıdır: ilk acelede biri `ubl/`den
 * `documents/`e import eder, kimse görmez.
 *
 * Kurallar:
 *   1. YUKARI import YOK — `ubl/` `ubltr/`yi, `ubltr/` `documents/`i göremez.
 *   2. KARDEŞ import YOK — `documents/invoice ⊥ documents/despatch-advice`.
 *   3. `ubl/` ve `ubltr/` yatay yapraklara (`calculator/`, `session/`) uzanamaz.
 *
 * DEVRALINAN BORÇ: S4 MEKANİK bir taşımaydı — dosya içeriği değişmedi, yalnız
 * yer değişti. Bu yüzden bugün var olan ihlaller taşımanın ÜRETTİĞİ değil,
 * GÖRÜNÜR KILDIĞI kusurlardır ve `KNOWN_DEBT`te tek tek sayılıdır. Liste
 * kapalı uçludur: yeni bir ihlal eklenirse test KIRMIZI olur, listedeki bir
 * ihlal düzeltilirse (artık gerçekleşmiyorsa) test yine KIRMIZI olur — yani
 * borç ne sessizce büyür ne de sessizce eskir.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = path.resolve(__dirname, '..', 'src');

type Layer =
    | 'ubl'
    | 'ubltr'
    | 'doc:shared'
    | 'doc:invoice'
    | 'doc:despatch'
    | 'doc:self-employed-voucher'
    | 'doc:producer-receipt'
    | 'calculator'
    | 'session'
    | 'leaf';

const LAYER_PREFIXES: ReadonlyArray<readonly [string, Layer]> = [
    ['ubl/', 'ubl'],
    ['ubltr/', 'ubltr'],
    ['documents/shared/', 'doc:shared'],
    ['documents/invoice/', 'doc:invoice'],
    ['documents/despatch-advice/', 'doc:despatch'],
    ['documents/self-employed-voucher/', 'doc:self-employed-voucher'],
    ['documents/producer-receipt/', 'doc:producer-receipt'],
    ['calculator/', 'calculator'],
    ['session/', 'session'],
];

/**
 * Katman sırası — büyük sayı "daha üstte" demek; üstten alta import SERBEST.
 *
 * 🔑 `documents/shared` 2.5'tedir, 3 DEĞİL. İki şeyi aynı anda söyler:
 *   • belge türleri (3) ondan okuyabilir — YUKARI değildir,
 *   • o hiçbir belge türünü göremez — `doc:shared → doc:invoice` YUKARI olur.
 * 3 verilseydi kardeş sayılır ve belge türlerinden import edilemezdi; 2 verilip
 * `ubltr/` altına konsaydı belge katmanı kavramları (builder seçenekleri,
 * `UblBuildError`) UBL-TR sözlüğüne sızardı.
 */
const RANK: Partial<Record<Layer, number>> = {
    ubl: 1,
    ubltr: 2,
    'doc:shared': 2.5,
    'doc:invoice': 3,
    'doc:despatch': 3,
    'doc:self-employed-voucher': 3,
    'doc:producer-receipt': 3,
};

function layerOf(relative: string): Layer {
    for (const [prefix, layer] of LAYER_PREFIXES) {
        if (relative.startsWith(prefix)) return layer;
    }
    return 'leaf';
}

function listSources(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) listSources(full, acc);
        else if (entry.name.endsWith('.ts')) acc.push(full);
    }
    return acc;
}

/* `from '…'`, çıplak `import '…'` ve `require('…')` — üçü de bağımlılıktır. */
const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*(['"])(\.[^'"]*)\1/g;

/** Göreli belirteci `src/` köküne göre dosya yoluna çözer. */
function resolveSpecifier(fromFile: string, specifier: string): string | undefined {
    const base = path.resolve(path.dirname(fromFile), specifier);
    for (const probe of [`${base}.ts`, path.join(base, 'index.ts'), base]) {
        if (fs.existsSync(probe) && fs.statSync(probe).isFile()) {
            return path.relative(SRC, probe).split(path.sep).join('/');
        }
    }
    return undefined;
}

interface Edge {
    readonly from: string;
    readonly to: string;
    readonly rule: string;
}

function collectViolations(): Edge[] {
    const found: Edge[] = [];
    for (const file of listSources(SRC).sort()) {
        const from = path.relative(SRC, file).split(path.sep).join('/');
        const fromLayer = layerOf(from);
        const text = fs.readFileSync(file, 'utf8');
        for (const match of text.matchAll(SPECIFIER)) {
            const to = resolveSpecifier(file, match[2]);
            if (!to) continue;
            const toLayer = layerOf(to);
            if (fromLayer === toLayer) continue;

            const fromRank = RANK[fromLayer];
            const toRank = RANK[toLayer];
            if (fromRank !== undefined && toRank !== undefined) {
                if (toRank > fromRank) found.push({ from, to, rule: 'YUKARI' });
                else if (toRank === fromRank) found.push({ from, to, rule: 'KARDEŞ' });
            }
            if ((fromLayer === 'ubl' || fromLayer === 'ubltr') && (toLayer === 'calculator' || toLayer === 'session')) {
                found.push({ from, to, rule: `YATAY→${toLayer}` });
            }
        }
    }
    // Aynı kenar iki kez sayılmasın (bir dosya aynı hedefi birden çok kez import edebilir).
    const seen = new Set<string>();
    return found.filter((e) => {
        const key = `${e.rule} ${e.from} -> ${e.to}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * S4 öncesinden DEVRALINAN ihlaller. Her biri gerçek bir kusurdur; taşıma
 * onları yaratmadı, klasör sınırı çizildiği için GÖRÜNÜR oldular.
 *
 *  • `ubltr → documents` (TEK yukarı-import): `header-bindings` irsaliye
 *    doğrulayıcısından `DespatchValidationStage` TİPİNİ alıyor — üstelik
 *    döngüsel (irsaliye doğrulayıcısı da `header-bindings`i alıyor). Çözüm:
 *    aşama tipi kural katmanına insin.
 *  • `ubl/components/line → calculator/config-manager`: belge türü bilmemesi
 *    gereken bileşen birim-kodu sözlüğüne uzanıyor. Plandaki hedef
 *    `ubltr/vocabulary/units`.
 *  • `ubltr/vocabulary → calculator/*`: UBL-TR sözlüğünün gerçek gövdesi
 *    bugün `calculator/` altında duruyor (`tax-config`, `withholding-config`,
 *    `package-type-code-config`, `configManager`). Sözlük oraya taşınana
 *    kadar `vocabulary` bir CEPHE.
 */
const KNOWN_DEBT: ReadonlyArray<string> = [
    /* `YUKARI ubltr/rules/shared/header-bindings.ts -> documents/despatch-advice/validators.ts`
     * S5b'de KAPANDI: aşama tipi `ubltr/rules/shared/validation-stage.ts`e indi,
     * irsaliye onu TAKMA AD olarak bağlıyor. Listedeki tek yukarı-import buydu. */
    'YATAY→calculator ubl/components/line.ts -> calculator/config-manager.ts',
    'YATAY→calculator ubltr/vocabulary/constants.ts -> calculator/config-manager.ts',
    'YATAY→calculator ubltr/vocabulary/constants.ts -> calculator/package-type-code-config.ts',
    'YATAY→calculator ubltr/vocabulary/constants.ts -> calculator/tax-config.ts',
    'YATAY→calculator ubltr/vocabulary/constants.ts -> calculator/withholding-config.ts',
    'YATAY→calculator ubltr/vocabulary/derived-config.ts -> calculator/config-manager.ts',
];

describe('katman bekçisi — documents/* → ubltr/ → ubl/', () => {
    const violations = collectViolations().map((e) => `${e.rule} ${e.from} -> ${e.to}`).sort();

    it('YENİ bir katman ihlali eklenmemiş olmalı', () => {
        const fresh = violations.filter((v) => !KNOWN_DEBT.includes(v));
        expect(
            fresh,
            'Katman kuralı kırıldı. `documents/* → ubltr/ → ubl/` TEK YÖNLÜDÜR ve ' +
                'kardeş belge türleri birbirini GÖRMEZ. Bağımlılığı ters çevirin ' +
                '(ortak parçayı alt katmana indirin) — listeye eklemeyin.',
        ).toEqual([]);
    });

    it('devralınan borç listesi ESKİMEMİŞ olmalı', () => {
        const stale = KNOWN_DEBT.filter((v) => !violations.includes(v));
        expect(
            stale,
            'Bu ihlaller artık gerçekleşmiyor — düzeltilmişler. KNOWN_DEBT listesinden ' +
                'silin ki liste borcun GERÇEK boyutunu göstermeye devam etsin.',
        ).toEqual([]);
    });

    it('kardeş belge türleri birbirini GÖRMEMELİ', () => {
        const siblings = violations.filter((v) => v.startsWith('KARDEŞ'));
        expect(
            siblings,
            'documents/invoice · documents/despatch-advice · documents/self-employed-voucher · ' +
                'documents/producer-receipt birbirinden bağımsızdır. Ortak ihtiyaç ' +
                'ubltr/rules/shared ya da documents/shared altına İNER — yana geçmez.',
        ).toEqual([]);
    });

    it('her belge türü klasörü bekçinin KAPSAMINDA olmalı', () => {
        /* Kapsam dışı bir klasör 'leaf' sayılır ve kardeş/yukarı kuralları ona
         * HİÇ uygulanmaz — yani bekçi onu sessizce geçirir. Yeni bir belge türü
         * eklenip LAYER_PREFIXES güncellenmezse testler yeşil kalır ve ayrım
         * ilk acelede kaybolur. Bu test o sessizliği kapatır. */
        const documentsDir = path.join(SRC, 'documents');
        const folders = fs
            .readdirSync(documentsDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => `documents/${d.name}/`)
            .sort();
        const covered = LAYER_PREFIXES.map(([prefix]) => prefix);
        const uncovered = folders.filter((f) => !covered.includes(f));
        expect(
            uncovered,
            'Bu belge türü klasörleri katman bekçisinin LAYER_PREFIXES tablosunda YOK. ' +
                'Kapsam dışı klasöre kardeş/yukarı kuralı UYGULANMAZ — tabloya ekleyin ' +
                've RANK değerini 3 verin (ortak alt katman ise 2.5).',
        ).toEqual([]);
    });

    it('ölçüm gerçekten dosya tarıyor olmalı', () => {
        // Tarama sessizce 0 dosya bulursa üç test de sahte-yeşil olurdu.
        expect(listSources(SRC).length).toBeGreaterThan(80);
    });
});
