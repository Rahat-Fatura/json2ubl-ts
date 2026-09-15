/**
 * Session paths generator (Sprint 8h.1 / AR-10 — tip-parametrik: Sprint 10).
 *
 * Bir kök arayüzü (örn. `SimpleInvoiceInput`, `DespatchInput`) TypeScript
 * Compiler API ile tarayıp o belge tipine ait `*-session-paths.generated.ts`
 * dosyasını üretir. Hangi belge tipinin üretileceği `GeneratorTarget` tablosuyla
 * belirlenir; üreteç artık faturaya sabitlenmiş DEĞİLDİR.
 *
 * Modlar:
 *   - `tsx scripts/generate-session-paths.ts`         → tüm hedefleri yaz
 *   - `tsx scripts/generate-session-paths.ts --check` → herhangi bir hedefte
 *                                                       diff varsa exit 1 (CI drift)
 *
 * Kararlar:
 *   - In-house parser, ts-morph yok (D-1).
 *   - Bracket notation path: `lines[0].kdvPercent` (validator pattern uyumu).
 *   - Sub-object isimlendirme prefix'li: `lineDeliveryGtipNo` (tutarlılık).
 *   - Manuel append ve read-only path'ler HEDEFE aittir (fatura: `liability` /
 *     `isExport`; irsaliyede muadili yoktur).
 *   - Her hedef AYRI dosyaya üretilir: `KNOWN_PATH_TEMPLATES` gibi niteliksiz
 *     export adları tek dosyada çakışır, `@generated` drift kontrolü dosya
 *     bazlıdır ve paket tepe yüzeyinde adlar ayrışık kalmalıdır.
 */

import * as ts from 'typescript';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname shim (ESM/CJS arası uyumlu)
const SCRIPT_DIR = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(SCRIPT_DIR, '..');

/** Repo köküne göreli POSIX yolunu mutlak dosya yoluna çevirir. */
function absPath(repoRelative: string): string {
  return join(REPO_ROOT, ...repoRelative.split('/'));
}

// ─── Tip tanımları ────────────────────────────────────────────────────────────

interface InterfaceField {
  name: string;
  type: string;        // TS tip string'i (örn: 'string', 'number', 'SimplePartyInput', 'SimpleLineInput[]')
  optional: boolean;
  jsdoc?: string;
}

interface PathEntry {
  /** SessionPaths object key (örn: 'senderTaxNumber', 'lineKdvPercent') */
  key: string;
  /** Path template (örn: 'sender.taxNumber', 'lines[i].kdvPercent') */
  pathTemplate: string;
  /** TypeScript value tipi */
  valueType: string;
  /** JSDoc açıklaması (opsiyonel kaynak: kaynak arayüz dosyası) */
  jsdoc?: string;
  /** Fonksiyon parametreleri (line-level için ['i'], çift indeks için ['i', 'ti']) */
  fnParams: string[];
}

/**
 * Bir belge tipi için üreteç hedefi.
 *
 * Üretecin faturaya dair TÜM sabitleri bu tabloya taşındı; yeni bir belge tipi
 * eklemek = yeni bir `GeneratorTarget` yazmak.
 */
export interface GeneratorTarget {
  /** Girdi dosyası — repo köküne göreli POSIX yolu. */
  sourceFile: string;
  /** Path üretiminin başladığı kök arayüz adı. */
  rootInterface: string;
  /** Çıktı dosyası — repo köküne göreli POSIX yolu. */
  outputFile: string;
  /** Üretilen sabit map'in adı (örn. `SessionPaths`). */
  constName: string;
  /** Path → değer tipi arayüzünün adı (örn. `SessionPathMap`). */
  mapTypeName: string;
  /** `update()` overload arayüzünün adı (örn. `InvoiceSessionUpdateOverloads`). */
  overloadsName: string;
  /** Bilinen path şablonları set'inin export adı. */
  templatesName: string;
  /** Salt-okunur path set'inin export adı. */
  readOnlyName: string;
  /** Kaynak arayüzde karşılığı olmayan, elle eklenen girdiler (session-level state). */
  manualEntries: readonly PathEntry[];
  /** `update()` ile değiştirilemeyen, constructor'da kilitlenen path'ler. */
  readOnlyPaths: readonly string[];
  /**
   * İzin verilen azami ÖZELLİK SEGMENTİ derinliği; dizi indeksi segment saymaz.
   *
   * `sender.taxNumber` = 2, `lines[i].delivery.gtipNo` = 3,
   * `lines[i].delivery.deliveryAddress.city` = 4.
   *
   * Fatura hedefi bugünkü davranışı (3) korur — derinlik sınırının gevşetilmesi
   * `session-paths.generated.ts` çıktısını DEĞİŞTİREMEZ.
   */
  maxDepth: number;
  /**
   * Kök dosyanın `import type` ile getirdiği arayüz/alias'ları çözebilmek için
   * ek kaynak dosyalar. Üreteç dosyaları kendiliğinden takip etmez; çok dosyalı
   * tip grafiği olan belgelerde (irsaliye: `common.ts` + `enums.ts`) bu liste şarttır.
   */
  dependencyFiles?: readonly string[];
  /** Başlık yorumundaki indeksli path örneği (örn. `lines[0].kdvPercent`). */
  exampleIndexedPath: string;
}

/** Bir kaynak kümesinden çıkarılan tip bilgisi — hedef başına YEREL tutulur. */
interface ParsedTypes {
  /** Arayüz adı → alan listesi (synthetic inline literal'ler dâhil). */
  interfaces: Map<string, InterfaceField[]>;
  /** Type alias / string enum adı → literal union metni. */
  aliases: Map<string, string>;
  /** İmport edilmiş tip adı → mutlak modül yolu (uzantısız). */
  importedTypes: Map<string, string>;
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

const PRIMITIVE_TYPES = new Set([
  'string', 'number', 'boolean',
]);

const PRIMITIVE_ARRAY_TYPES = new Set([
  'string[]', 'number[]', 'boolean[]',
]);

/** Dizi indeks parametrelerinin iç-içe geçme sırasına göre adları. */
const INDEX_PARAM_NAMES = ['i', 'ti', 'tti'] as const;

function isPrimitive(type: string): boolean {
  return PRIMITIVE_TYPES.has(type) || PRIMITIVE_ARRAY_TYPES.has(type)
    || /^['"]/.test(type)               // String literal union ('einvoice' | 'earchive')
    || /^[0-9]/.test(type);             // Numeric literal
}

/**
 * Type alias resolution (örn: SimpleSgkType → "'SAGLIK_ECZ' | 'SAGLIK_HAS' | ...").
 *
 * 🔴 Alias tablosu MODÜL DÜZEYİNDE GLOBAL DEĞİLDİR. Eskiden öyleydi ve
 * `parseInterfaces()` onu hiç temizlemiyordu: aynı süreçte iki hedef üretilince
 * birinci kaynağın alias'ları ikinciye sızıyor, ikinci belgenin KENDİ kaynak
 * kümesinde tanımlı olmayan bir tip sessizce çözümlenmiş gibi davranıyordu.
 * Tek kaynak varken zararsızdı; tip-parametrik üreteçte sessiz yanlış çıktıydı.
 */
function resolveAlias(type: string, aliases: ReadonlyMap<string, string>): string {
  const resolved = aliases.get(type);
  if (!resolved) return type;
  // Multi-line union normalize: '| A\n  | B\n  | C' → 'A | B | C'
  return resolved
    .replace(/^\s*\|\s*/, '')       // leading pipe strip
    .replace(/\s+/g, ' ')            // whitespace collapse (multi-line → single)
    .trim();
}

function stripUndefined(type: string): string {
  return type.replace(/\s*\|\s*undefined\s*$/, '').trim();
}

function isArrayOfInterface(type: string): boolean {
  // Sprint 8j.2: synthetic inline literal array element'leri `__Inline_*` ile
  // başladığı için underscore prefix de kabul edilir.
  return /^[A-Z_]\w*\[\]$/.test(type);
}

function getArrayElementType(type: string): string {
  return type.replace(/\[\]$/, '');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singularize(plural: string): string {
  if (plural.endsWith('ies')) return plural.slice(0, -3) + 'y';
  if (plural.endsWith('xes')) return plural.slice(0, -2);    // taxes → tax, boxes → box
  if (plural.endsWith('s') && !plural.endsWith('ss')) return plural.slice(0, -1);
  return plural;
}

/** PascalCase → kebab-case (`InvoiceSession` → `invoice-session`). */
function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Dizi alanının SessionPaths anahtar öneki (D-11, 4.5.5).
 *
 * Normalde tekilleştirilir (`despatchReferences` → `despatchReference`). Ancak
 * tekil hâli KARDEŞ bir alanın adıyla çakışıyorsa (`billingReferences` ↔ geriye
 * uyum için korunan tekil `billingReference`) iki alan aynı anahtarı üretir ve
 * `SessionPaths` nesne literali "duplicate property" ile derlenemez. Böyle bir
 * durumda ÇOĞUL ad aynen korunur → `billingReferencesId(i)`.
 *
 * Kural GENELDİR; elle bakımı gereken bir istisna listesi YOKTUR.
 */
function arrayItemKey(fieldName: string, siblingNames: ReadonlySet<string>): string {
  const singular = singularize(fieldName);
  return singular !== fieldName && siblingNames.has(singular) ? fieldName : singular;
}

// ─── AST tarama: tüm interface'leri topla ─────────────────────────────────────

/**
 * Hedefin kaynak dosyalarını tarar.
 *
 * Bağımlılık dosyaları ÖNCE okunur, kök dosya EN SON: aynı adlı bir tip iki
 * yerde tanımlıysa kök dosyanın tanımı kazanır.
 */
function parseInterfaces(target: GeneratorTarget): ParsedTypes {
  const parsed: ParsedTypes = {
    interfaces: new Map<string, InterfaceField[]>(),
    aliases: new Map<string, string>(),
    importedTypes: new Map<string, string>(),
  };

  for (const filePath of [...(target.dependencyFiles ?? []), target.sourceFile]) {
    parseSourceFile(absPath(filePath), parsed);
  }

  return parsed;
}

/** Tek bir dosyayı tarayıp `parsed` tablolarına ekler. */
function parseSourceFile(sourcePath: string, parsed: ParsedTypes): void {
  const sourceText = readFileSync(sourcePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  const { interfaces, aliases, importedTypes } = parsed;

  // İlk geçiş: type alias + string enum + import tabloları
  for (const stmt of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(stmt)) {
      aliases.set(stmt.name.text, stmt.type.getText(sourceFile).trim());
      continue;
    }
    // String enum → literal union. Üretilen dosya kendi kendine yetsin diye
    // nominal enum tipi yerine değer kümesi yazılır (alias'larla aynı disiplin).
    if (ts.isEnumDeclaration(stmt)) {
      const union = enumToLiteralUnion(stmt);
      if (union) aliases.set(stmt.name.text, union);
      continue;
    }
    if (ts.isImportDeclaration(stmt)) {
      collectImportedTypeNames(stmt, sourcePath, importedTypes);
    }
  }

  for (const stmt of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(stmt)) continue;
    const fields: InterfaceField[] = [];

    for (const member of stmt.members) {
      if (!ts.isPropertySignature(member)) continue;
      if (!member.name || !ts.isIdentifier(member.name)) continue;

      const name = member.name.text;
      const optional = !!member.questionToken;
      let type = member.type ? member.type.getText(sourceFile).trim() : 'unknown';

      // Inline anon literal array (örn. `Array<{ schemeId: string; value: string; }>`
      // veya `{ schemeId: string; value: string }[]`) → synthetic interface'e indirge.
      // Bu sayede alt-nesne dalı normal şekilde çalışır (8j.2: party identifications
      // için kritik).
      //
      // Sprint 8n.1 / v2.2.6 / Library Öneri #9 — array değilse single inline literal
      // (örn. `attachment?: { filename; mimeCode; ... }`) için de synthetic interface
      // üretilir. Array kontrolü ÖNCE yapılır (regression koruması: `Array<{...}>`
      // form `{...}` olarak yanlış parse edilmesin).
      if (member.type) {
        const inlineArrayFields = extractInlineLiteralArrayFields(member.type, sourceFile);
        if (inlineArrayFields) {
          const syntheticName = `__Inline_${stmt.name.text}_${name}_Element`;
          interfaces.set(syntheticName, inlineArrayFields);
          type = `${syntheticName}[]`;
        } else {
          const inlineObjFields = extractInlineLiteralFields(member.type, sourceFile);
          if (inlineObjFields) {
            const syntheticName = `__InlineObj_${stmt.name.text}_${name}`;
            interfaces.set(syntheticName, inlineObjFields);
            type = syntheticName;
          }
        }
      }

      // JSDoc çıkarımı (basit): leading comment range
      const fullText = sourceFile.getFullText();
      const ranges = ts.getLeadingCommentRanges(fullText, member.getFullStart()) ?? [];
      const jsdocRange = ranges.find(r => fullText.slice(r.pos, r.pos + 3) === '/**');
      const jsdoc = jsdocRange ? extractJSDoc(fullText.slice(jsdocRange.pos, jsdocRange.end)) : undefined;

      fields.push({ name, type, optional, jsdoc });
    }

    interfaces.set(stmt.name.text, fields);
  }
}

/**
 * String enum'u literal union metnine çevirir; üyelerden biri bile string
 * literal ile başlatılmamışsa `undefined` döner (uydurma yapılmaz).
 */
function enumToLiteralUnion(decl: ts.EnumDeclaration): string | undefined {
  const literals: string[] = [];
  for (const member of decl.members) {
    if (!member.initializer || !ts.isStringLiteral(member.initializer)) return undefined;
    literals.push(`'${member.initializer.text}'`);
  }
  return literals.length > 0 ? literals.join(' | ') : undefined;
}

/**
 * `import type { A, B } from './x'` ifadesinden getirilen tip adlarını modülün
 * MUTLAK (uzantısız) yoluyla eşler. Bu tablo yalnızca hiçbir kaynak dosyada
 * çözümlenemeyen tipler için kullanılır: o tipler değer tipi olarak aynen
 * yazılır ve üretilen dosyaya `import type` satırı eklenir.
 */
function collectImportedTypeNames(
  stmt: ts.ImportDeclaration,
  sourcePath: string,
  importedTypes: Map<string, string>,
): void {
  if (!ts.isStringLiteral(stmt.moduleSpecifier)) return;
  const spec = stmt.moduleSpecifier.text;
  if (!spec.startsWith('.')) return;                     // yalnız repo-içi göreli import
  const bindings = stmt.importClause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) return;

  const moduleAbs = join(dirname(sourcePath), ...spec.split('/'));
  for (const element of bindings.elements) {
    importedTypes.set(element.name.text, moduleAbs);
  }
}

/**
 * Type node'u inline literal array (`Array<{...}>` veya `{...}[]`) ise inner
 * type literal alanlarını döndürür, değilse undefined.
 *
 * Sprint 8j.2 — `SimpleBuyerCustomerInput.identifications: Array<{ schemeId; value }>`
 * gibi anon literal array'lere path entry üretebilmek için.
 */
function extractInlineLiteralArrayFields(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
): InterfaceField[] | undefined {
  let elementTypeNode: ts.TypeNode | undefined;

  // `{ ... }[]` formu (TypeOperator/ArrayType)
  if (ts.isArrayTypeNode(typeNode) && ts.isTypeLiteralNode(typeNode.elementType)) {
    elementTypeNode = typeNode.elementType;
  }
  // `Array<{ ... }>` formu (TypeReference + typeArguments)
  if (
    ts.isTypeReferenceNode(typeNode) &&
    ts.isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === 'Array' &&
    typeNode.typeArguments?.length === 1 &&
    ts.isTypeLiteralNode(typeNode.typeArguments[0])
  ) {
    elementTypeNode = typeNode.typeArguments[0];
  }

  if (!elementTypeNode || !ts.isTypeLiteralNode(elementTypeNode)) return undefined;

  const fields: InterfaceField[] = [];
  for (const member of elementTypeNode.members) {
    if (!ts.isPropertySignature(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    const subName = member.name.text;
    const subType = member.type ? member.type.getText(sourceFile).trim() : 'unknown';
    const subOptional = !!member.questionToken;
    fields.push({ name: subName, type: subType, optional: subOptional });
  }
  return fields.length > 0 ? fields : undefined;
}

/**
 * Sprint 8n.1 / v2.2.6 / Library Öneri #9 — Single inline TypeLiteral parse (array DEĞİL).
 *
 * `attachment?: { filename: string; mimeCode: string; ... }` gibi inline object literal
 * field'ları synthetic interface'e indirger. `extractInlineLiteralArrayFields` helper'ının
 * non-array versiyonu — array form (`Array<{...}>` ve `{...}[]`) önce kontrol edilir
 * (parseSourceFile içinde), bu helper sadece tek `{...}` formuna düşer.
 *
 * Sprint 8j.2'deki "still skips single inline literals" disiplini bu commit'te kaldırıldı.
 */
function extractInlineLiteralFields(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
): InterfaceField[] | undefined {
  if (!ts.isTypeLiteralNode(typeNode)) return undefined;

  const fields: InterfaceField[] = [];
  for (const member of typeNode.members) {
    if (!ts.isPropertySignature(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    const subName = member.name.text;
    const subType = member.type ? member.type.getText(sourceFile).trim() : 'unknown';
    const subOptional = !!member.questionToken;
    fields.push({ name: subName, type: subType, optional: subOptional });
  }
  return fields.length > 0 ? fields : undefined;
}

function extractJSDoc(raw: string): string | undefined {
  // /** ... */ → tek satır ya da çok satır temizle
  const cleaned = raw
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .filter(line => line.trim().length > 0)
    .join(' ')
    .trim();
  return cleaned || undefined;
}

// ─── Path entry türetimi ──────────────────────────────────────────────────────

/**
 * Sub-object'ler: SessionPaths key prefix kuralı.
 * Tutarlılık için tüm nested sub-object'ler key'de dahil edilir.
 * Örnek: sender.taxNumber → senderTaxNumber, lines[i].delivery.gtipNo → lineDeliveryGtipNo.
 */
function buildKey(parts: string[]): string {
  return parts[0] + parts.slice(1).map(capitalize).join('');
}

function generateEntries(parsed: ParsedTypes, target: GeneratorTarget): PathEntry[] {
  const entries: PathEntry[] = [];
  const { interfaces, aliases, importedTypes } = parsed;
  const inputFields = interfaces.get(target.rootInterface);
  if (!inputFields) {
    throw new Error(`${target.rootInterface} interface not found in ${target.sourceFile}`);
  }

  // Kardeş alan adları — dizi anahtarı çakışma kontrolü için (D-11).
  const siblingNames = new Set(inputFields.map(f => f.name));
  const rootParam = INDEX_PARAM_NAMES[0];

  for (const field of inputFields) {
    const baseType = stripUndefined(field.type);
    const resolved = resolveAlias(baseType, aliases);

    // 1) Doc-level primitive (veya literal union, veya string[], veya alias/enum union)
    if (isPrimitive(resolved)) {
      entries.push({
        key: field.name,
        pathTemplate: field.name,
        valueType: field.optional ? `${resolved} | undefined` : resolved,
        jsdoc: field.jsdoc,
        fnParams: [],
      });
      continue;
    }

    // 2) Array of interface (lines[], despatchReferences[], additionalDocuments[])
    if (isArrayOfInterface(baseType)) {
      const elementFields = interfaces.get(getArrayElementType(baseType));
      if (!elementFields) continue;

      // Array adı için key prefix'i (lines → line, despatchReferences → despatchReference).
      // Çakışma varsa çoğul ad korunur (billingReferences → billingReferences, D-11).
      const itemKey = arrayItemKey(field.name, siblingNames);

      for (const subField of elementFields) {
        addFieldEntries(entries, parsed, target, subField, [itemKey],
          `${field.name}[${rootParam}]`, [rootParam], 1);
      }
      continue;
    }

    // 3) Sub-object (interface ref veya synthetic inline literal)
    const subFields = interfaces.get(baseType);
    if (subFields) {
      for (const subField of subFields) {
        addFieldEntries(entries, parsed, target, subField, [field.name], field.name, [], 1);
      }
      continue;
    }

    // 4) Başka dosyadan import edilmiş, çözümlenemeyen tip → değer tipi aynen taşınır
    if (importedTypes.has(baseType)) {
      entries.push({
        key: field.name,
        pathTemplate: field.name,
        valueType: field.optional ? `${baseType} | undefined` : baseType,
        jsdoc: field.jsdoc,
        fnParams: [],
      });
      continue;
    }

    // Diğer tipler (anon union, generic vb.) → kapsam dışı
  }

  return entries;
}

/**
 * Tek bir alan için path entry üretir; alt-nesnelere ve dizilere ÖZYİNELER.
 *
 * `depth` = `pathPrefix`'in taşıdığı özellik segmenti sayısı (dizi indeksi
 * segment saymaz): `sender` → 1, `lines[i].delivery` → 2. Bu çağrının üreteceği
 * girdi `depth + 1` derinliğinde olur; hedefin `maxDepth` bütçesi aşılıyorsa
 * alan tümüyle atlanır.
 *
 * Eski üreteçteki iki ayrı fonksiyon (`addSubObjectEntries` / `addArrayElementEntries`)
 * ve içlerindeki "Faz 1 SKIP" sabit sınırları bu tek özyinelemede birleşti;
 * sınır artık hedefe göre ayarlanabilir.
 */
function addFieldEntries(
  entries: PathEntry[],
  parsed: ParsedTypes,
  target: GeneratorTarget,
  field: InterfaceField,
  keyParts: string[],
  pathPrefix: string,
  fnParams: string[],
  depth: number,
): void {
  if (depth + 1 > target.maxDepth) return;

  const { interfaces, aliases, importedTypes } = parsed;
  const baseType = stripUndefined(field.type);
  const resolved = resolveAlias(baseType, aliases);

  // 1) Primitive / literal union / primitive dizi
  if (isPrimitive(resolved)) {
    entries.push({
      key: buildKey([...keyParts, field.name]),
      pathTemplate: `${pathPrefix}.${field.name}`,
      valueType: field.optional ? `${resolved} | undefined` : resolved,
      jsdoc: field.jsdoc,
      fnParams: [...fnParams],
    });
    return;
  }

  // 2) Arayüz dizisi → yeni indeks parametresi (`i` → `ti` → `tti`)
  if (isArrayOfInterface(baseType)) {
    const elementFields = interfaces.get(getArrayElementType(baseType));
    if (!elementFields) return;
    const param = INDEX_PARAM_NAMES[fnParams.length];
    if (!param) return;                       // indeks parametresi tükendi
    const itemKey = singularize(field.name);
    for (const subField of elementFields) {
      addFieldEntries(entries, parsed, target, subField, [...keyParts, itemKey],
        `${pathPrefix}.${field.name}[${param}]`, [...fnParams, param], depth + 1);
    }
    return;
  }

  // 3) Alt-nesne (arayüz referansı veya synthetic inline literal)
  const subFields = interfaces.get(baseType);
  if (subFields) {
    for (const subField of subFields) {
      addFieldEntries(entries, parsed, target, subField, [...keyParts, field.name],
        `${pathPrefix}.${field.name}`, fnParams, depth + 1);
    }
    return;
  }

  // 4) Çözümlenemeyen ama import edilmiş tip → değer tipi aynen taşınır
  if (importedTypes.has(baseType)) {
    entries.push({
      key: buildKey([...keyParts, field.name]),
      pathTemplate: `${pathPrefix}.${field.name}`,
      valueType: field.optional ? `${baseType} | undefined` : baseType,
      jsdoc: field.jsdoc,
      fnParams: [...fnParams],
    });
  }
}

// ─── Manuel append (D-9): session-level state, SimpleInvoiceInput dışı ────────

const MANUAL_ENTRIES: readonly PathEntry[] = [
  {
    key: 'liability',
    pathTemplate: 'liability',
    valueType: "'einvoice' | 'earchive' | undefined",
    jsdoc: 'Customer liability (e-invoice / e-archive enrolment). Session-level state, not part of SimpleInvoiceInput. Note: ignored when session was created with isExport=true (M10 contract → LIABILITY_LOCKED_BY_EXPORT pathError).',
    fnParams: [],
  },
];

// ─── Hedef tablosu ────────────────────────────────────────────────────────────

/**
 * e-Fatura hedefi — üretecin tip-parametrik hâle gelmeden önceki TÜM sabitlerini
 * birebir taşır. `src/calculator/session-paths.generated.ts` byte düzeyinde
 * değişmemelidir; bu tablo o garantinin tek dayanağıdır.
 */
export const INVOICE_TARGET: GeneratorTarget = {
  sourceFile: 'src/calculator/simple-types.ts',
  rootInterface: 'SimpleInvoiceInput',
  outputFile: 'src/calculator/session-paths.generated.ts',
  constName: 'SessionPaths',
  mapTypeName: 'SessionPathMap',
  overloadsName: 'InvoiceSessionUpdateOverloads',
  templatesName: 'KNOWN_PATH_TEMPLATES',
  readOnlyName: 'READ_ONLY_PATHS',
  manualEntries: MANUAL_ENTRIES,
  readOnlyPaths: ['isExport'],
  maxDepth: 3,
  exampleIndexedPath: 'lines[0].kdvPercent',
};

/**
 * e-İrsaliye hedefi — `DespatchSession`'ın path yüzeyi.
 *
 * 🔴 KÖK ARAYÜZ `SimpleDespatchInput`'TUR, ham `DespatchInput` DEĞİL. Fatura
 * hedefi de `SimpleInvoiceInput`'u gösterir; oturum `Simple*` katmanı üzerinde
 * çalışır ve yol yüzeyi oturumun KONUŞTUĞU dili yansıtmak zorundadır.
 *
 * Bu seçim ENUM SORUNUNU DA ÇÖZER: TS string enum'u NOMİNALDİR — `'SEVK'` düz
 * string'i `DespatchTypeCode` parametresine atanamaz, dolayısıyla ham hedefte
 * `update('despatchTypeCode', 'SEVK')` derlenmez, çağıran `as DespatchTypeCode`
 * yazmak zorunda kalırdı. `Simple*` katmanı `type`/`profile`'ı DÜZ STRING
 * tuttuğu için çağrı doğal çalışır; faturada `SimpleInvoiceInput.profile` de
 * düz `string`'tir.
 *
 * `maxDepth: 4` çünkü irsaliyenin taşıdığı veri üçüncü/dördüncü segmentte yaşıyor:
 * `shipment.deliveryAddress.city`, `shipment.drivers[i].firstName`,
 * `shipment.licensePlates[i].value`, `shipment.carrier.identifications[ti].schemeId`.
 *
 * `dependencyFiles` yalnız `simple-types.ts`: `SimplePartyInput` fatura ile
 * ORTAKTIR, taraf tipi orada yaşar. Ham hedefin ihtiyaç duyduğu `enums.ts` +
 * `common.ts` artık GEREKMİYOR — `Simple*` katmanı ne enum ne de ham UBL tipi
 * konuşur; bağımlılık listesinin sadeleşmesi bu ayrımın kanıtıdır.
 *
 * `manualEntries` / `readOnlyPaths` BOŞ: irsaliyede `liability` (mükellefiyet) ve
 * `isExport` (ihracat kilidi) muadili bir session-level state YOKTUR.
 */
export const DESPATCH_TARGET: GeneratorTarget = {
  sourceFile: 'src/calculator/simple-despatch-types.ts',
  rootInterface: 'SimpleDespatchInput',
  outputFile: 'src/calculator/despatch-session-paths.generated.ts',
  constName: 'DespatchSessionPaths',
  mapTypeName: 'DespatchSessionPathMap',
  overloadsName: 'DespatchSessionUpdateOverloads',
  templatesName: 'DESPATCH_KNOWN_PATH_TEMPLATES',
  readOnlyName: 'DESPATCH_READ_ONLY_PATHS',
  manualEntries: [],
  readOnlyPaths: [],
  maxDepth: 4,
  dependencyFiles: ['src/calculator/simple-types.ts'],
  exampleIndexedPath: 'lines[0].quantity',
};

/** Üretilecek tüm hedefler — `main()` ve `--check` bunun üzerinde döner. */
export const TARGETS: readonly GeneratorTarget[] = [INVOICE_TARGET, DESPATCH_TARGET];

// ─── Çıktı üretimi ────────────────────────────────────────────────────────────

/** `lines[i].taxes[ti].code` → `lines[${number}].taxes[${number}].code` */
function toNumberTemplate(pathTemplate: string): string {
  return pathTemplate.replace(/\[[a-z]+\]/g, '[${number}]');
}

/** `lines[i].taxes[ti].code` → `lines[*].taxes[*].code` */
function toStarTemplate(pathTemplate: string): string {
  return pathTemplate.replace(/\[[a-z]+\]/g, '[*]');
}

function renderEntry(entry: PathEntry): string {
  const jsdocBlock = entry.jsdoc
    ? `  /**\n   * ${entry.jsdoc.split('\n').join('\n   * ')}\n   * Expected type: ${entry.valueType}\n   */\n`
    : `  /** Expected type: ${entry.valueType} */\n`;

  // Sprint 8k.2 / Library Öneri #2: fonksiyon path return değeri
  // path map key'iyle aynı template literal'a `as ...` ile narrow
  // edilir; `update<P extends keyof SessionPathMap>(...)` generic'ine
  // cast'siz assign edilebilmesi için kritik.
  const fnPath = entry.pathTemplate.replace(/\[([a-z]+)\]/g, '[${$1}]');
  const mapKey = toNumberTemplate(entry.pathTemplate);

  const value = entry.fnParams.length === 0
    ? `'${entry.pathTemplate}'`
    : `(${entry.fnParams.map(p => `${p}: number`).join(', ')}) => \`${fnPath}\` as \`${mapKey}\``;

  return `${jsdocBlock}  ${entry.key}: ${value},`;
}

function renderPathMapType(entries: PathEntry[], target: GeneratorTarget): string {
  // Path map: her path template'i için value tipi.
  // Fonksiyon path'lerinde template değişkenler (`i`, `ti`) literal `${number}` ile gösterilir.
  const lines = entries.map(entry => `  '${toNumberTemplate(entry.pathTemplate)}': ${entry.valueType};`);
  return `export interface ${target.mapTypeName} {\n${lines.join('\n')}\n}`;
}

function renderKnownPathTemplates(entries: PathEntry[], target: GeneratorTarget): string {
  // Path validation Katman 3: parsed path → '*' normalize → bu set'te ara.
  const unique = Array.from(new Set(entries.map(e => toStarTemplate(e.pathTemplate)))).sort();
  return `export const ${target.templatesName}: ReadonlySet<string> = new Set([\n${unique.map(t => `  '${t}',`).join('\n')}\n]);`;
}

function renderReadOnlyPaths(target: GeneratorTarget): string {
  if (target.readOnlyPaths.length === 0) {
    return `export const ${target.readOnlyName}: ReadonlySet<string> = new Set([]);`;
  }
  const lines = target.readOnlyPaths.map(p => `  '${p}',`).join('\n');
  return `export const ${target.readOnlyName}: ReadonlySet<string> = new Set([\n${lines}\n]);`;
}

/**
 * Sprint 8l.2 / v2.2.4 / Library Öneri #6 — TS 5.7+ template literal inference fix.
 *
 * TypeScript 5.4–5.7 arasında `${number}` placeholder'lı template literal type'ı
 * `keyof X` distributive union'ında match etmeme davranışı ortaya çıktı. Sonuç:
 * fonksiyonel `SessionPaths.X(i)` path'leri `update<P extends keyof SessionPathMap>(...)`
 * generic'iyle TS2345 alıyor.
 *
 * Çözüm: Her fonksiyonel path için spesifik template literal overload üret.
 * Üretilen overload interface'i ilgili session dosyasında declaration merging
 * (interface XSession extends ...) ile class'a enjekte edilir.
 */
function renderUpdateOverloads(entries: PathEntry[], target: GeneratorTarget): string {
  if (entries.length === 0) return '';

  // Sprint 8l.2 / v2.2.4 — Tüm path entry'leri için update() overload üretir.
  //
  // Niçin TÜM entry'ler (fonksiyonel + non-fonksiyonel)?
  // TS 5.7'de `keyof SessionPathMap` template literal key'leri (örn.
  // `'sender.identifications[${number}].schemeId'`) distributive union'a tam
  // açamıyor. Class'taki `update<P extends keyof SessionPathMap>(...)` generic
  // catch-all'ı kullanmıyoruz (declaration merging incompatibility); bunun
  // yerine **TÜM path'ler için spesifik literal overload** üretip interface'te
  // tutarız. Doc-level path'ler (`sender.taxNumber`) için literal string overload,
  // fonksiyonel path'ler için `${number}` placeholder'lı template literal.
  //
  // Class'ta sadece implementation imzası `update(path: string, value: unknown)`
  // bulunur; caller'lar interface'teki overload'ları kullanır.
  const lines = entries.map(entry => {
    if (entry.fnParams.length === 0) {
      // Doc-level: sabit literal path
      return `  update(path: '${entry.pathTemplate}', value: ${entry.valueType}): void;`;
    }
    // Fonksiyonel path: `${number}` placeholder'lı template literal
    return `  update(path: \`${toNumberTemplate(entry.pathTemplate)}\`, value: ${entry.valueType}): void;`;
  });

  const sessionClassName = target.overloadsName.replace(/UpdateOverloads$/, '');
  const sessionModuleName = `${toKebabCase(sessionClassName)}.ts`;

  const header = [
    '/**',
    ' * Sprint 8l.2 / v2.2.4 — Tüm path overload\'larının deklaratif kaynağı.',
    ' *',
    ' * TS 5.7+ template literal type inference uyumsuzluğunu çözer (Library Öneri #6).',
    ' * `' + sessionModuleName + '` declaration merging ile `' + sessionClassName + '` class\'ına enjekte eder:',
    ' *',
    ' *   export interface ' + sessionClassName + ' extends ' + target.overloadsName + ' {}',
    ' *',
    ' * TÜM path\'ler için spesifik overload üretilir (doc-level literal + fonksiyonel',
    ' * `${number}` placeholder); class\'ta `<P extends keyof ' + target.mapTypeName + '>` generic',
    ' * yok — TS 5.7+ keyof distributive union template literal key\'leri açamıyor.',
    ' * Generator regenerate sonrası overload listesi otomatik güncellenir.',
    ' */',
  ].join('\n');

  return `${header}\nexport interface ${target.overloadsName} {\n${lines.join('\n')}\n}`;
}

/**
 * Üretilen dosyanın ihtiyaç duyduğu `import type` satırları.
 *
 * Yalnızca GERÇEKTEN kullanılan tipler yazılır (`noUnusedLocals` açık). Boş
 * dönerse çıktıya hiçbir şey eklenmez — fatura hedefinde durum budur, o yüzden
 * `session-paths.generated.ts` byte düzeyinde etkilenmez.
 */
function renderTypeImports(
  entries: PathEntry[],
  parsed: ParsedTypes,
  target: GeneratorTarget,
): string {
  const outputDir = dirname(absPath(target.outputFile));
  const byModule = new Map<string, Set<string>>();

  for (const [typeName, moduleAbs] of parsed.importedTypes) {
    const used = entries.some(e => new RegExp(`\\b${typeName}\\b`).test(e.valueType));
    if (!used) continue;
    let specifier = relative(outputDir, moduleAbs).split(/[\\/]/).join('/');
    if (!specifier.startsWith('.')) specifier = `./${specifier}`;
    const names = byModule.get(specifier) ?? new Set<string>();
    names.add(typeName);
    byModule.set(specifier, names);
  }

  if (byModule.size === 0) return '';

  return Array.from(byModule.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([specifier, names]) =>
      `import type { ${Array.from(names).sort().join(', ')} } from '${specifier}';`)
    .join('\n');
}

function generateOutputContent(
  entries: PathEntry[],
  parsed: ParsedTypes,
  target: GeneratorTarget,
): string {
  const manualLine = target.manualEntries.length > 0
    ? `${target.manualEntries.map(e => e.key).join(', ')} (session-level state, see scripts/generate-session-paths.ts MANUAL_ENTRIES)`
    : '(none)';
  const readOnlyLine = target.readOnlyPaths.length > 0
    ? `${target.readOnlyPaths.join(', ')} (constructor-locked, D-10)`
    : '(none)';

  const header = `// =====================================================================
// @generated
// THIS FILE IS AUTO-GENERATED by scripts/generate-session-paths.ts
// DO NOT EDIT BY HAND. Edits will be lost on next regeneration.
// Generator input: ${target.sourceFile} (${target.rootInterface})
// Manual entries: ${manualLine}
// Read-only paths: ${readOnlyLine}
// =====================================================================
//
// ${target.constName} — path-based update API için tip-güvenli path map (AR-10).
// Mimsoft form akışında her field için \`session.update(${target.constName}.X, value)\` çağrısında kullanılır.
//
// Path syntax: bracket notation (örn: '${target.exampleIndexedPath}') — kütüphanedeki tüm
// validator'lar bu formatta ValidationError.path üretir, reactive session aynı convention'ı taşır.
//
// Generic tip türetimi: \`${target.mapTypeName}\` ile \`update<P extends keyof ${target.mapTypeName}>(path: P, value: ${target.mapTypeName}[P])\`
// imzası compile-time tip kontrolü sağlar.
`;

  const constBlock = `export const ${target.constName} = {\n${entries.map(renderEntry).join('\n\n')}\n} as const;`;

  const blocks: string[] = [header];
  const importBlock = renderTypeImports(entries, parsed, target);
  if (importBlock) blocks.push(importBlock);

  blocks.push(
    constBlock,
    renderPathMapType(entries, target),
    renderKnownPathTemplates(entries, target),
    renderReadOnlyPaths(target),
    renderUpdateOverloads(entries, target),
    '',
  );

  return blocks.join('\n\n');
}

/**
 * Aynı anahtarı iki path üretirse nesne literali derlenemez ("duplicate property").
 * Sessiz bozuk çıktı yerine üretim anında patlaması için kapı.
 */
function assertUniqueKeys(entries: readonly PathEntry[], target: GeneratorTarget): void {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const entry of entries) {
    const previous = seen.get(entry.key);
    if (previous) clashes.push(`${entry.key} (${previous} ↔ ${entry.pathTemplate})`);
    else seen.set(entry.key, entry.pathTemplate);
  }
  if (clashes.length > 0) {
    throw new Error(`${target.constName}: duplicate path keys — ${clashes.join(', ')}`);
  }
}

// ─── Ana akış ─────────────────────────────────────────────────────────────────

/**
 * Bir hedef için üretilecek dosya içeriğini döndürür (diske YAZMAZ).
 *
 * Varsayılan hedef faturadır: üretecin sıfır-argümanlı eski imzası aynen çalışır.
 */
export function generateSessionPaths(target: GeneratorTarget = INVOICE_TARGET): string {
  const parsed = parseInterfaces(target);
  const autoEntries = generateEntries(parsed, target);
  const allEntries = [...autoEntries, ...target.manualEntries];
  assertUniqueKeys(allEntries, target);
  return generateOutputContent(allEntries, parsed, target);
}

function normalizeLineEndings(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

function main(): void {
  const checkMode = process.argv.includes('--check');
  let drift = false;

  for (const target of TARGETS) {
    const generated = generateSessionPaths(target);
    const outputPath = absPath(target.outputFile);

    if (!checkMode) {
      writeFileSync(outputPath, generated, 'utf-8');
      console.log(`Generated ${outputPath} (${generated.split('\n').length} lines)`);
      continue;
    }

    if (!existsSync(outputPath)) {
      console.error(`SessionPaths drift: ${outputPath} does not exist. Run \`npm run generate:paths\` to create.`);
      drift = true;
      continue;
    }

    const existing = readFileSync(outputPath, 'utf-8');
    if (normalizeLineEndings(generated) !== normalizeLineEndings(existing)) {
      console.error(`SessionPaths drift detected in ${target.outputFile}. Run \`npm run generate:paths\` to regenerate.`);
      console.error(`  Expected: ${generated.length} chars`);
      console.error(`  Found:    ${existing.length} chars`);
      drift = true;
      continue;
    }

    console.log(`${target.outputFile} up to date.`);
  }

  if (drift) process.exit(1);
}

// Direct execution kontrolü (tsx ile çalıştırıldığında)
const isMain = (() => {
  try {
    const url = import.meta.url;
    const argv1 = process.argv[1];
    return url && argv1 && url.endsWith(argv1.replace(/\\/g, '/').split('/').pop() ?? '');
  } catch {
    return require.main === module;
  }
})();

if (isMain) {
  main();
}
