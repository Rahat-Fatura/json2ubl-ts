/**
 * Cephe (public API) yüzey çıkarıcısı — `src/index.ts`in dışa verdiği HER adı
 * (değer + tip) TypeScript derleyici API'siyle listeler.
 *
 * NİYE VAR: MimForge'da 30+ dosya bu paketten import ediyor
 * (`SessionPaths`, `SimpleInvoiceInput`, `CURRENCY_DEFINITIONS`, `InvoiceSession`,
 * `PartyIdentificationSchemeId`…). Klasör taşımaları sırasında bir `export`
 * satırı sessizce düşerse kütüphane yeşil kalır ama tüketici DERLENMEZ.
 * Bu yüzey bir dosyaya dondurulur (`__tests__/public-api.snapshot.txt`) ve
 * `__tests__/public-api.test.ts` her koşumda farkı KIRMIZIYA düşürür.
 *
 * Neden "grep export" değil: `export * from "./types"` gibi yeniden-dışa-verme
 * zincirleri metinden okunamaz; yalnız tip denetçisi gerçek yüzeyi bilir.
 */

import * as path from 'node:path';
import ts from 'typescript';

/** Paket kökü — bu dosya `scripts/` altında durur. */
export const PACKAGE_ROOT = path.resolve(__dirname, '..');

/** Cephe girişi. Yüzey YALNIZ buradan ölçülür. */
export const ENTRY_FILE = path.join(PACKAGE_ROOT, 'src', 'index.ts');

/** Donmuş yüzeyin tutulduğu dosya. */
export const SNAPSHOT_FILE = path.join(PACKAGE_ROOT, '__tests__', 'public-api.snapshot.txt');

/**
 * Bir dışa-verilen adın taşıdığı anlam. Aynı ad hem değer hem tip olabilir
 * (`class`, `enum`), bu yüzden tek bir etiket değil KÜME tutulur:
 *   • `value` — çalışma zamanında import edilebilir (fonksiyon, sabit, sınıf, enum)
 *   • `type`  — yalnız tip konumunda kullanılabilir (interface, type alias)
 * Etiketin daralması (örn. `value+type` → `type`) tüketiciyi kırar; bu yüzden
 * ada ek olarak etiket de dondurulur.
 */
export type ExportKind = 'value' | 'type' | 'value+type' | 'namespace' | 'unknown';

export interface PublicExport {
    readonly name: string;
    readonly kind: ExportKind;
    /** Sembolün bildirim türleri (`FunctionDeclaration`, `TypeAliasDeclaration`…). */
    readonly declarations: readonly string[];
}

function tsconfigOptions(): ts.CompilerOptions {
    const configPath = path.join(PACKAGE_ROOT, 'tsconfig.json');
    const read = ts.readConfigFile(configPath, ts.sys.readFile);
    if (read.error) {
        throw new Error(`tsconfig okunamadı: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`);
    }
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, PACKAGE_ROOT);
    return { ...parsed.options, noEmit: true };
}

function classify(symbol: ts.Symbol): ExportKind {
    const isValue = (symbol.flags & ts.SymbolFlags.Value) !== 0;
    const isType = (symbol.flags & ts.SymbolFlags.Type) !== 0;
    const isNamespace = (symbol.flags & ts.SymbolFlags.Namespace) !== 0;
    if (isValue && isType) return 'value+type';
    if (isValue) return 'value';
    if (isType) return 'type';
    if (isNamespace) return 'namespace';
    return 'unknown';
}

/** Takma ad (`export { X } from …`) zincirini gerçek sembole kadar çözer. */
function resolveAlias(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
    let current = symbol;
    // Döngüye karşı basit bir tavan — pratikte zincir 1-2 adım.
    for (let i = 0; i < 16 && (current.flags & ts.SymbolFlags.Alias) !== 0; i += 1) {
        const next = checker.getAliasedSymbol(current);
        if (next === current) break;
        current = next;
    }
    return current;
}

/** `src/index.ts`in dışa verdiği tüm adları ada göre sıralı döndürür. */
export function collectPublicApi(): PublicExport[] {
    const program = ts.createProgram([ENTRY_FILE], tsconfigOptions());
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(ENTRY_FILE);
    if (!source) throw new Error(`Giriş dosyası programda yok: ${ENTRY_FILE}`);

    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (!moduleSymbol) throw new Error('Giriş dosyasının modül sembolü çözülemedi (dosya modül değil mi?)');

    return checker
        .getExportsOfModule(moduleSymbol)
        .map((exported): PublicExport => {
            const resolved = resolveAlias(checker, exported);
            const declarations = (resolved.declarations ?? [])
                .map((d) => ts.SyntaxKind[d.kind])
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort();
            return { name: exported.name, kind: classify(resolved), declarations };
        })
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Yüzeyi karşılaştırılabilir, satır-bazlı bir metne çevirir. */
export function renderSurface(api: readonly PublicExport[]): string {
    const header = [
        '# json2ubl-ts — CEPHE YÜZEYİ (üretilmiş dosya, ELLE DÜZENLEME)',
        '#',
        '# Üretim:  npx tsx scripts/public-api-surface.ts --write',
        '# Denetim: __tests__/public-api.test.ts (her koşumda)',
        '#',
        '# Bir satırın KAYBOLMASI = tüketici derlemesinin kırılması. Bu dosyadaki',
        '# bir satırı silen commit, o kırılmayı BİLEREK yaptığını beyan etmiş olur.',
        '#',
        `# Toplam: ${api.length} ad`,
        '',
    ].join('\n');
    const body = api.map((e) => `${e.kind}\t${e.name}\t${e.declarations.join(',')}`).join('\n');
    return `${header}${body}\n`;
}

/** Donmuş dosyadan yorum/boş satırları atarak yüzey satırlarını okur. */
export function parseSurface(text: string): string[] {
    return text
        .split('\n')
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
}

if (typeof require !== 'undefined' && require.main === module) {
    const api = collectPublicApi();
    const rendered = renderSurface(api);
    if (process.argv.includes('--write')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('node:fs').writeFileSync(SNAPSHOT_FILE, rendered, 'utf8');
        process.stdout.write(`${SNAPSHOT_FILE} yazıldı — ${api.length} ad\n`);
    } else {
        process.stdout.write(rendered);
    }
}
