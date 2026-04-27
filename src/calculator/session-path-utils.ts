/**
 * Path utilities (Sprint 8h.2 / AR-10).
 *
 * In-house bracket notation parser + path-targeted clone + path validation
 * için yardımcı fonksiyonlar. ts-morph / lodash dependency'si yok (D-1 kararı).
 *
 * Bracket notation grammar:
 *   path        ::= segment ('.' segment | '[' index ']')*
 *   segment     ::= identifier
 *   identifier  ::= [a-zA-Z_][a-zA-Z0-9_]*
 *   index       ::= [0-9]+
 *
 * Örnek: 'lines[0].taxes[1].code' → [key:'lines', index:0, key:'taxes', index:1, key:'code']
 */

export type PathToken =
  | { kind: 'key'; value: string }
  | { kind: 'index'; value: number };

export class PathParseError extends Error {
  constructor(message: string, public readonly path: string) {
    super(message);
    this.name = 'PathParseError';
  }
}

/**
 * Path string'i token sequence'e parse eder. Bracket notation grammar.
 * Hata durumunda PathParseError throw eder; çağıran (`update()`) bunu yakalayıp
 * `pathError` event'ine çevirir (S-2: throw değil event).
 */
export function parsePath(path: string): PathToken[] {
  if (!path || path.length === 0) {
    throw new PathParseError('empty path', path);
  }

  const tokens: PathToken[] = [];
  let i = 0;
  let expectingSeparator = false;

  while (i < path.length) {
    const ch = path[i];

    if (ch === '.') {
      if (i === 0) throw new PathParseError('leading dot', path);
      if (!expectingSeparator) throw new PathParseError('empty segment', path);
      expectingSeparator = false;
      i++;
      continue;
    }

    if (ch === '[') {
      if (!expectingSeparator) throw new PathParseError("unexpected '[' (no preceding key)", path);
      // Bracket index oku
      const closeIdx = path.indexOf(']', i + 1);
      if (closeIdx === -1) throw new PathParseError('unterminated bracket', path);
      const indexStr = path.slice(i + 1, closeIdx);
      if (indexStr.length === 0) throw new PathParseError('expected index', path);
      if (!/^[0-9]+$/.test(indexStr)) {
        if (indexStr.startsWith('-')) throw new PathParseError('negative index', path);
        throw new PathParseError('invalid index', path);
      }
      tokens.push({ kind: 'index', value: parseInt(indexStr, 10) });
      i = closeIdx + 1;
      expectingSeparator = true;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      // Identifier oku
      let end = i;
      while (end < path.length && /[a-zA-Z0-9_]/.test(path[end])) end++;
      const key = path.slice(i, end);
      tokens.push({ kind: 'key', value: key });
      i = end;
      expectingSeparator = true;
      continue;
    }

    throw new PathParseError(`invalid character '${ch}'`, path);
  }

  if (!expectingSeparator) {
    // En son '.' veya '[' ile bitti
    throw new PathParseError('trailing separator', path);
  }

  return tokens;
}

/**
 * Token sequence'i SessionPaths map'inde aranabilir template'e çevirir.
 * Index token'ları '*' ile değiştirir.
 *
 * Örnek: [key:'lines', index:0, key:'kdvPercent'] → 'lines[*].kdvPercent'
 */
export function tokensToTemplate(tokens: PathToken[]): string {
  let result = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === 'index') {
      result += '[*]';
    } else {
      if (i > 0) result += '.';
      result += token.value;
    }
  }
  return result;
}

/**
 * Path token sequence ile object'ten value oku.
 * Var olmayan path'lerde undefined döner (no throw).
 */
export function readPath(obj: unknown, tokens: PathToken[]): unknown {
  let current: any = obj;
  for (const token of tokens) {
    if (current === null || current === undefined) return undefined;
    if (token.kind === 'key') {
      current = current[token.value];
    } else {
      if (!Array.isArray(current)) return undefined;
      current = current[token.value];
    }
  }
  return current;
}

/**
 * Path-targeted immutable clone. Path üzerindeki node'lar yeni referans alır;
 * paralel kardeşler aynı referans korur.
 *
 * Sub-object opsiyonel field için: ilk sub-field set'inde nesne create (D-6).
 * Örn: update('paymentMeans.iban', '...') → paymentMeans yoksa { iban: '...' } create.
 *
 * Index out of bounds: çağıran path validation katmanında zaten reddedilmiş olmalı.
 * Bu fonksiyon defensive değil — geçerli path varsayar.
 */
export function applyPathUpdate<T>(input: T, tokens: PathToken[], value: unknown): T {
  if (tokens.length === 0) {
    throw new Error('applyPathUpdate: empty token list');
  }

  const [head, ...rest] = tokens;

  if (head.kind === 'index') {
    if (!Array.isArray(input)) {
      throw new Error(`applyPathUpdate: expected array, got ${typeof input}`);
    }
    const result = [...input];
    if (rest.length === 0) {
      result[head.value] = value;
    } else {
      const child = result[head.value];
      result[head.value] = applyPathUpdate(child, rest, value);
    }
    return result as unknown as T;
  }

  // key
  const obj = (input ?? {}) as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };

  if (rest.length === 0) {
    result[head.value] = value;
  } else {
    const child = result[head.value];
    // D-6: Opsiyonel sub-object yoksa otomatik {} create (alt-path inşası için)
    const childInput = child === undefined ? (rest[0].kind === 'index' ? [] : {}) : child;
    result[head.value] = applyPathUpdate(childInput, rest, value);
  }

  return result as T;
}

/**
 * Deep equality kontrolü (diff detection için).
 * Primitive: === ; Object/Array: structural compare.
 *
 * Implementation: node:util isDeepStrictEqual (zero dep, Node 16+).
 */
import { isDeepStrictEqual } from 'node:util';

export function deepEqual(a: unknown, b: unknown): boolean {
  return isDeepStrictEqual(a, b);
}
