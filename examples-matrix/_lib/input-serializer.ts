/**
 * Sprint 8e — JavaScript/TypeScript object → okunabilir TS source literal.
 *
 * Amaç: `specs.ts` içindeki bir `input: SimpleInvoiceInput` objesini
 * `examples/01-temelfatura-satis/input.ts` pattern'ine birebir uyan okunaklı
 * bir TypeScript kaynağına serialize etmek.
 *
 * Neden `JSON.stringify(obj, null, 2)` değil: JSON çıktısı tüm key'leri
 * double-quote ile yazar (`"key"`). ES object literal'da quote sadece
 * geçerli identifier olmayan key'ler için gerekli. Berkay'ın input.ts'yi
 * mevcut `examples/` pattern'iyle aynı görmesi disiplini.
 *
 * Özellikler:
 * - Single-quote string literal (backslash escape + newline)
 * - Trailing comma her listede
 * - Geçerli identifier key'ler quote'suz, diğerleri single-quote'lu
 * - Nested object/array indent
 * - null / undefined / number / boolean / string / Date support
 */

const VALID_IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Bir objeyi TS literal kaynak koduna çevirir (indent 2 boşluk).
 */
export function objectToTsLiteral(value: unknown, indent = 2): string {
  return serialize(value, 0, indent);
}

function serialize(value: unknown, depth: number, step: number): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    return serializeString(value);
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return `new Date(${serializeString(value.toISOString())})`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const pad = ' '.repeat((depth + 1) * step);
    const closePad = ' '.repeat(depth * step);
    const inner = value
      .map((v) => pad + serialize(v, depth + 1, step) + ',')
      .join('\n');
    return `[\n${inner}\n${closePad}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const pad = ' '.repeat((depth + 1) * step);
    const closePad = ' '.repeat(depth * step);
    const inner = keys
      .map((k) => {
        const keyStr = VALID_IDENTIFIER_RE.test(k) ? k : serializeString(k);
        return `${pad}${keyStr}: ${serialize(obj[k], depth + 1, step)},`;
      })
      .join('\n');
    return `{\n${inner}\n${closePad}}`;
  }
  // Fallback: bigint, symbol, function (unexpected)
  return String(value);
}

function serializeString(s: string): string {
  let out = "'";
  for (const ch of s) {
    switch (ch) {
      case '\\':
        out += '\\\\';
        break;
      case "'":
        out += "\\'";
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\t':
        out += '\\t';
        break;
      default: {
        const code = ch.charCodeAt(0);
        // Escape other control chars (< 0x20) and DEL (0x7F)
        if (code < 0x20 || code === 0x7f) {
          out += '\\x' + code.toString(16).padStart(2, '0');
        } else {
          out += ch;
        }
      }
    }
  }
  out += "'";
  return out;
}

/**
 * `SimpleInvoiceInput` objesini `examples/01-temelfatura-satis/input.ts`
 * pattern'iyle uyumlu tam bir TS kaynak dosyasına çevirir.
 *
 * @param relativeSrcImport  `input.ts` konumundan `src`'e relative path,
 *                            örn. `'../../../../src'` (valid/<profile>/<slug>)
 */
export function buildInvoiceInputSource(
  input: unknown,
  relativeSrcImport: string,
): string {
  const literal = objectToTsLiteral(input, 2);
  return [
    `import type { SimpleInvoiceInput } from '${relativeSrcImport}';`,
    '',
    `export const input: SimpleInvoiceInput = ${literal};`,
    '',
    'export default input;',
    '',
  ].join('\n');
}

/**
 * `DespatchInput` objesi için benzeri.
 */
export function buildDespatchInputSource(
  input: unknown,
  relativeSrcImport: string,
): string {
  const literal = objectToTsLiteral(input, 2);
  return [
    `import type { DespatchInput } from '${relativeSrcImport}';`,
    '',
    `export const input: DespatchInput = ${literal};`,
    '',
    'export default input;',
    '',
  ].join('\n');
}
