/**
 * SessionPaths generator (Sprint 8h.1 / AR-10).
 *
 * `src/calculator/simple-types.ts` SimpleInvoiceInput interface'ini TypeScript
 * Compiler API ile tarayıp `src/calculator/session-paths.generated.ts` üretir.
 *
 * Modlar:
 *   - `tsx scripts/generate-session-paths.ts`         → dosyayı yaz
 *   - `tsx scripts/generate-session-paths.ts --check` → diff varsa exit 1 (CI drift)
 *
 * Kararlar:
 *   - In-house parser, ts-morph yok (D-1).
 *   - Bracket notation path: `lines[0].kdvPercent` (validator pattern uyumu).
 *   - Sub-object isimlendirme prefix'li: `lineDeliveryGtipNo` (tutarlılık).
 *   - Manuel append: `liability` (D-9, session-level state).
 *   - READ_ONLY_PATHS: `isExport` (D-10, constructor-locked).
 */

import * as ts from 'typescript';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname shim (ESM/CJS arası uyumlu)
const SCRIPT_DIR = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(SCRIPT_DIR, '..');
const SIMPLE_TYPES_PATH = join(REPO_ROOT, 'src', 'calculator', 'simple-types.ts');
const OUTPUT_PATH = join(REPO_ROOT, 'src', 'calculator', 'session-paths.generated.ts');

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
  /** JSDoc açıklaması (opsiyonel kaynak: simple-types.ts) */
  jsdoc?: string;
  /** Fonksiyon parametreleri (line-level için ['i'], çift indeks için ['i', 'ti']) */
  fnParams: string[];
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

const PRIMITIVE_TYPES = new Set([
  'string', 'number', 'boolean',
]);

const PRIMITIVE_ARRAY_TYPES = new Set([
  'string[]', 'number[]', 'boolean[]',
]);

function isPrimitive(type: string): boolean {
  return PRIMITIVE_TYPES.has(type) || PRIMITIVE_ARRAY_TYPES.has(type)
    || /^['"]/.test(type)               // String literal union ('einvoice' | 'earchive')
    || /^[0-9]/.test(type);             // Numeric literal
}

/** Type alias resolution (örn: SimpleSgkType → "'SAGLIK_ECZ' | 'SAGLIK_HAS' | ..."). */
const TYPE_ALIASES = new Map<string, string>();

function resolveAlias(type: string): string {
  const resolved = TYPE_ALIASES.get(type);
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

// ─── AST tarama: tüm interface'leri topla ─────────────────────────────────────

function parseInterfaces(): Map<string, InterfaceField[]> {
  const sourceText = readFileSync(SIMPLE_TYPES_PATH, 'utf-8');
  const sourceFile = ts.createSourceFile(
    SIMPLE_TYPES_PATH,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  const interfaces = new Map<string, InterfaceField[]>();

  // İlk geçiş: type aliases topla (literal union resolve için)
  for (const stmt of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(stmt)) {
      const aliasName = stmt.name.text;
      const aliasType = stmt.type.getText(sourceFile).trim();
      TYPE_ALIASES.set(aliasName, aliasType);
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
      // Bu sayede addSubObjectEntries içindeki array-of-interface dalı normal şekilde
      // çalışır (8j.2: party identifications için kritik).
      if (member.type) {
        const inlineFields = extractInlineLiteralArrayFields(member.type, sourceFile);
        if (inlineFields) {
          const syntheticName = `__Inline_${stmt.name.text}_${name}_Element`;
          interfaces.set(syntheticName, inlineFields);
          type = `${syntheticName}[]`;
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

  return interfaces;
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

function buildPathTemplate(segments: Array<string | { array: string; param: string }>): string {
  let result = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (typeof seg === 'string') {
      result += (i === 0 ? '' : '.') + seg;
    } else {
      result += (i === 0 ? '' : '.') + seg.array + `[${seg.param}]`;
    }
  }
  return result;
}

function generateEntries(interfaces: Map<string, InterfaceField[]>): PathEntry[] {
  const entries: PathEntry[] = [];
  const inputFields = interfaces.get('SimpleInvoiceInput');
  if (!inputFields) {
    throw new Error('SimpleInvoiceInput interface not found in simple-types.ts');
  }

  for (const field of inputFields) {
    const baseType = stripUndefined(field.type);
    const resolved = resolveAlias(baseType);

    // 1) Doc-level primitive (veya literal union, veya string[], veya type alias literal union)
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
      const elementType = getArrayElementType(baseType);
      const elementFields = interfaces.get(elementType);
      if (!elementFields) continue;

      // Array adı için key prefix'i (lines → line, despatchReferences → despatchReference)
      const itemKey = singularize(field.name);

      for (const subField of elementFields) {
        addArrayElementEntries(
          entries,
          interfaces,
          subField,
          /* arrayName */ field.name,
          /* itemKeyPrefix */ itemKey,
        );
      }
      continue;
    }

    // 3) Sub-object (interface ref)
    if (interfaces.has(baseType)) {
      const subFields = interfaces.get(baseType)!;
      for (const subField of subFields) {
        addSubObjectEntries(entries, interfaces, subField, field.name);
      }
      continue;
    }

    // Diğer tipler (örn. inline object literal `{ filename: string; ... }`) skip — Faz 1 kapsamı dışı
  }

  return entries;
}

/**
 * Sub-object alt-fields'ı için entry üretir (örn: sender.taxNumber, paymentMeans.iban).
 * Deep-nested sub-object'leri (örn. delivery.deliveryAddress dış lines için) skip eder.
 */
function addSubObjectEntries(
  entries: PathEntry[],
  interfaces: Map<string, InterfaceField[]>,
  field: InterfaceField,
  parentName: string,
): void {
  const baseType = stripUndefined(field.type);
  const resolved = resolveAlias(baseType);

  if (isPrimitive(resolved)) {
    entries.push({
      key: buildKey([parentName, field.name]),
      pathTemplate: `${parentName}.${field.name}`,
      valueType: field.optional ? `${resolved} | undefined` : resolved,
      jsdoc: field.jsdoc,
      fnParams: [],
    });
    return;
  }

  // Sub-object array (örn. sender.identifications: SimplePartyIdentification[],
  // buyerCustomer.identifications: __Inline_*[] synthetic). Sprint 8j.2.
  if (isArrayOfInterface(baseType)) {
    const elementType = getArrayElementType(baseType);
    const elementFields = interfaces.get(elementType);
    if (!elementFields) return;
    const itemKey = singularize(field.name);
    for (const subField of elementFields) {
      const subBase = stripUndefined(subField.type);
      const subResolved = resolveAlias(subBase);
      if (!isPrimitive(subResolved)) continue;
      entries.push({
        key: buildKey([parentName, itemKey, subField.name]),
        pathTemplate: `${parentName}.${field.name}[i].${subField.name}`,
        valueType: subField.optional ? `${subResolved} | undefined` : subResolved,
        jsdoc: subField.jsdoc,
        fnParams: ['i'],
      });
    }
    return;
  }

  // Sub-object'in kendi sub-object'i (örn. paymentMeans.attachment) → SKIP
}

/**
 * Array element fields'ı için entry üretir (örn: lines[i].kdvPercent, lines[i].delivery.gtipNo,
 * lines[i].taxes[ti].code).
 */
function addArrayElementEntries(
  entries: PathEntry[],
  interfaces: Map<string, InterfaceField[]>,
  field: InterfaceField,
  arrayName: string,
  itemKeyPrefix: string,
): void {
  const baseType = stripUndefined(field.type);
  const resolved = resolveAlias(baseType);

  // 1) Element içi primitive: lines[i].kdvPercent
  if (isPrimitive(resolved)) {
    entries.push({
      key: buildKey([itemKeyPrefix, field.name]),
      pathTemplate: `${arrayName}[i].${field.name}`,
      valueType: field.optional ? `${resolved} | undefined` : resolved,
      jsdoc: field.jsdoc,
      fnParams: ['i'],
    });
    return;
  }

  // 2) Element içi sub-object: lines[i].delivery.gtipNo
  if (interfaces.has(baseType)) {
    const subFields = interfaces.get(baseType)!;
    for (const subField of subFields) {
      const subBase = stripUndefined(subField.type);
      const subResolved = resolveAlias(subBase);
      if (isPrimitive(subResolved)) {
        entries.push({
          key: buildKey([itemKeyPrefix, field.name, subField.name]),
          pathTemplate: `${arrayName}[i].${field.name}.${subField.name}`,
          valueType: subField.optional ? `${subResolved} | undefined` : subResolved,
          jsdoc: subField.jsdoc,
          fnParams: ['i'],
        });
      }
      // Üçüncü derinlik (lines[i].delivery.deliveryAddress.X) → Faz 1 SKIP
    }
    return;
  }

  // 3) Element içi array of interface: lines[i].taxes[ti].code (çift indeks)
  if (isArrayOfInterface(baseType)) {
    const innerElementType = getArrayElementType(baseType);
    const innerFields = interfaces.get(innerElementType);
    if (!innerFields) return;

    const innerKeyPrefix = singularize(field.name);
    for (const innerField of innerFields) {
      const innerBase = stripUndefined(innerField.type);
      const innerResolved = resolveAlias(innerBase);
      if (isPrimitive(innerResolved)) {
        entries.push({
          key: buildKey([itemKeyPrefix, innerKeyPrefix, innerField.name]),
          pathTemplate: `${arrayName}[i].${field.name}[ti].${innerField.name}`,
          valueType: innerField.optional ? `${innerResolved} | undefined` : innerResolved,
          jsdoc: innerField.jsdoc,
          fnParams: ['i', 'ti'],
        });
      }
    }
  }

  // Diğer (inline object literal, anon array) → SKIP
}

// ─── Manuel append (D-9): session-level state, SimpleInvoiceInput dışı ────────

const MANUAL_ENTRIES: PathEntry[] = [
  {
    key: 'liability',
    pathTemplate: 'liability',
    valueType: "'einvoice' | 'earchive' | undefined",
    jsdoc: 'Customer liability (e-invoice / e-archive enrolment). Session-level state, not part of SimpleInvoiceInput. Note: ignored when session was created with isExport=true (M10 contract → LIABILITY_LOCKED_BY_EXPORT pathError).',
    fnParams: [],
  },
];

// ─── Read-only path'ler (D-10): constructor-locked, update() reddedilir ──────

const READ_ONLY_PATHS = ['isExport'] as const;

// ─── Çıktı üretimi ────────────────────────────────────────────────────────────

function renderEntry(entry: PathEntry): string {
  const jsdocBlock = entry.jsdoc
    ? `  /**\n   * ${entry.jsdoc.split('\n').join('\n   * ')}\n   * Expected type: ${entry.valueType}\n   */\n`
    : `  /** Expected type: ${entry.valueType} */\n`;

  // Sprint 8k.2 / Library Öneri #2: fonksiyon path return değeri
  // SessionPathMap key'iyle aynı template literal'a `as ...` ile narrow
  // edilir; `update<P extends keyof SessionPathMap>(...)` generic'ine
  // cast'siz assign edilebilmesi için kritik.
  const fnPath = entry.pathTemplate.replace(/\[i\]/g, '[${i}]').replace(/\[ti\]/g, '[${ti}]');
  const mapKey = entry.pathTemplate.replace(/\[i\]/g, '[${number}]').replace(/\[ti\]/g, '[${number}]');

  const value = entry.fnParams.length === 0
    ? `'${entry.pathTemplate}'`
    : `(${entry.fnParams.map(p => `${p}: number`).join(', ')}) => \`${fnPath}\` as \`${mapKey}\``;

  return `${jsdocBlock}  ${entry.key}: ${value},`;
}

function renderPathMapType(entries: PathEntry[]): string {
  // SessionPathMap: her path template'i için value tipi.
  // Fonksiyon path'lerinde template değişkenler (`i`, `ti`) literal `${number}` ile gösterilir.
  const lines = entries.map(entry => {
    const tpl = entry.pathTemplate
      .replace(/\[i\]/g, '[${number}]')
      .replace(/\[ti\]/g, '[${number}]');
    return `  '${tpl}': ${entry.valueType};`;
  });
  return `export interface SessionPathMap {\n${lines.join('\n')}\n}`;
}

function renderKnownPathTemplates(entries: PathEntry[]): string {
  // Path validation Katman 3: parsed path → '*' normalize → bu set'te ara.
  const templates = entries.map(entry =>
    entry.pathTemplate.replace(/\[i\]/g, '[*]').replace(/\[ti\]/g, '[*]'),
  );
  const unique = Array.from(new Set(templates)).sort();
  return `export const KNOWN_PATH_TEMPLATES: ReadonlySet<string> = new Set([\n${unique.map(t => `  '${t}',`).join('\n')}\n]);`;
}

function renderReadOnlyPaths(): string {
  return `export const READ_ONLY_PATHS: ReadonlySet<string> = new Set([\n${READ_ONLY_PATHS.map(p => `  '${p}',`).join('\n')}\n]);`;
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
 * `InvoiceSessionUpdateOverloads` interface'i `invoice-session.ts`'te declaration
 * merging (interface InvoiceSession extends ...) ile InvoiceSession class'ına enjekte
 * edilir.
 *
 * Tek-indeks (i): `update<I extends number>(path: \`...[${'$'}{I}]...\`, value: T): void;`
 * Çift-indeks (i, ti): `update<I extends number, TI extends number>(path: \`...[${'$'}{I}]...[${'$'}{TI}]...\`, value: T): void;`
 */
function renderUpdateOverloads(entries: PathEntry[]): string {
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
    const pathTpl = entry.pathTemplate
      .replace(/\[i\]/g, '[${number}]')
      .replace(/\[ti\]/g, '[${number}]');
    return `  update(path: \`${pathTpl}\`, value: ${entry.valueType}): void;`;
  });

  const header = [
    '/**',
    ' * Sprint 8l.2 / v2.2.4 — Tüm path overload\'larının deklaratif kaynağı.',
    ' *',
    ' * TS 5.7+ template literal type inference uyumsuzluğunu çözer (Library Öneri #6).',
    ' * `invoice-session.ts` declaration merging ile `InvoiceSession` class\'ına enjekte eder:',
    ' *',
    ' *   export interface InvoiceSession extends InvoiceSessionUpdateOverloads {}',
    ' *',
    ' * TÜM path\'ler için spesifik overload üretilir (doc-level literal + fonksiyonel',
    ' * `${number}` placeholder); class\'ta `<P extends keyof SessionPathMap>` generic',
    ' * yok — TS 5.7+ keyof distributive union template literal key\'leri açamıyor.',
    ' * Generator regenerate sonrası overload listesi otomatik güncellenir.',
    ' */',
  ].join('\n');

  return `${header}\nexport interface InvoiceSessionUpdateOverloads {\n${lines.join('\n')}\n}`;
}

function generateOutputContent(entries: PathEntry[]): string {
  const header = `// =====================================================================
// @generated
// THIS FILE IS AUTO-GENERATED by scripts/generate-session-paths.ts
// DO NOT EDIT BY HAND. Edits will be lost on next regeneration.
// Generator input: src/calculator/simple-types.ts (SimpleInvoiceInput)
// Manual entries: liability (session-level state, see scripts/generate-session-paths.ts MANUAL_ENTRIES)
// Read-only paths: isExport (constructor-locked, D-10)
// =====================================================================
//
// SessionPaths — path-based update API için tip-güvenli path map (AR-10).
// Mimsoft form akışında her field için \`session.update(SessionPaths.X, value)\` çağrısında kullanılır.
//
// Path syntax: bracket notation (örn: 'lines[0].kdvPercent') — kütüphanedeki tüm
// validator'lar bu formatta ValidationError.path üretir, reactive session aynı convention'ı taşır.
//
// Generic tip türetimi: \`SessionPathMap\` ile \`update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P])\`
// imzası compile-time tip kontrolü sağlar.
`;

  const constBlock = `export const SessionPaths = {\n${entries.map(renderEntry).join('\n\n')}\n} as const;`;

  return [
    header,
    constBlock,
    renderPathMapType(entries),
    renderKnownPathTemplates(entries),
    renderReadOnlyPaths(),
    renderUpdateOverloads(entries),
    '',
  ].join('\n\n');
}

// ─── Ana akış ─────────────────────────────────────────────────────────────────

export function generateSessionPaths(): string {
  const interfaces = parseInterfaces();
  const autoEntries = generateEntries(interfaces);
  const allEntries = [...autoEntries, ...MANUAL_ENTRIES];
  return generateOutputContent(allEntries);
}

function normalizeLineEndings(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

function main(): void {
  const generated = generateSessionPaths();
  const checkMode = process.argv.includes('--check');

  if (checkMode) {
    if (!existsSync(OUTPUT_PATH)) {
      console.error(`SessionPaths drift: ${OUTPUT_PATH} does not exist. Run \`npm run generate:paths\` to create.`);
      process.exit(1);
    }
    const existing = readFileSync(OUTPUT_PATH, 'utf-8');
    if (normalizeLineEndings(generated) !== normalizeLineEndings(existing)) {
      console.error('SessionPaths drift detected. Run `npm run generate:paths` to regenerate.');
      console.error(`  Expected: ${generated.length} chars`);
      console.error(`  Found:    ${existing.length} chars`);
      process.exit(1);
    }
    console.log('SessionPaths up to date.');
    return;
  }

  writeFileSync(OUTPUT_PATH, generated, 'utf-8');
  const lineCount = generated.split('\n').length;
  console.log(`Generated ${OUTPUT_PATH} (${lineCount} lines)`);
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
