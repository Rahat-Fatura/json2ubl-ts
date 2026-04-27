/**
 * Session path utilities testleri (Sprint 8h.2 / AR-10).
 *
 * In-house bracket parser, path-targeted clone, readPath, deepEqual edge case'leri.
 */

import { describe, it, expect } from 'vitest';
import {
  parsePath,
  applyPathUpdate,
  readPath,
  deepEqual,
  tokensToTemplate,
  PathParseError,
  type PathToken,
} from '../../src/calculator/session-path-utils';

describe('parsePath (Sprint 8h.2)', () => {
  it('parses simple key path', () => {
    expect(parsePath('type')).toEqual([{ kind: 'key', value: 'type' }]);
  });

  it('parses dot-separated keys', () => {
    expect(parsePath('sender.taxNumber')).toEqual([
      { kind: 'key', value: 'sender' },
      { kind: 'key', value: 'taxNumber' },
    ]);
  });

  it('parses bracket notation single index', () => {
    expect(parsePath('lines[0]')).toEqual([
      { kind: 'key', value: 'lines' },
      { kind: 'index', value: 0 },
    ]);
  });

  it('parses bracket + dot combination', () => {
    expect(parsePath('lines[0].kdvPercent')).toEqual([
      { kind: 'key', value: 'lines' },
      { kind: 'index', value: 0 },
      { kind: 'key', value: 'kdvPercent' },
    ]);
  });

  it('parses double-indexed path', () => {
    expect(parsePath('lines[0].taxes[1].code')).toEqual([
      { kind: 'key', value: 'lines' },
      { kind: 'index', value: 0 },
      { kind: 'key', value: 'taxes' },
      { kind: 'index', value: 1 },
      { kind: 'key', value: 'code' },
    ]);
  });

  it('parses deep nested path (3 levels)', () => {
    expect(parsePath('lines[0].delivery.gtipNo')).toEqual([
      { kind: 'key', value: 'lines' },
      { kind: 'index', value: 0 },
      { kind: 'key', value: 'delivery' },
      { kind: 'key', value: 'gtipNo' },
    ]);
  });

  it('throws on empty string', () => {
    expect(() => parsePath('')).toThrow(PathParseError);
    expect(() => parsePath('')).toThrow(/empty path/);
  });

  it('throws on leading dot', () => {
    expect(() => parsePath('.lines')).toThrow(/leading dot/);
  });

  it('throws on double dot (empty segment)', () => {
    expect(() => parsePath('lines..kdvPercent')).toThrow(/empty segment/);
  });

  it('throws on unterminated bracket', () => {
    expect(() => parsePath('lines[0')).toThrow(/unterminated bracket/);
  });

  it('throws on empty bracket', () => {
    expect(() => parsePath('lines[]')).toThrow(/expected index/);
  });

  it('throws on non-numeric bracket', () => {
    expect(() => parsePath('lines[abc]')).toThrow(/invalid index/);
  });

  it('throws on negative index', () => {
    expect(() => parsePath('lines[-1]')).toThrow(/negative index/);
  });

  it('throws on bracket without preceding key', () => {
    expect(() => parsePath('[0]')).toThrow(/unexpected/);
  });

  it('throws on invalid character', () => {
    expect(() => parsePath('lines#kdv')).toThrow(/invalid character/);
  });

  it('throws on trailing dot', () => {
    expect(() => parsePath('lines.')).toThrow(/trailing/);
  });

  it('PathParseError includes path in message', () => {
    try {
      parsePath('lines[abc]');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PathParseError);
      expect((err as PathParseError).path).toBe('lines[abc]');
    }
  });
});

describe('tokensToTemplate (Sprint 8h.2)', () => {
  it('normalizes index tokens to asterisk', () => {
    const tokens: PathToken[] = [
      { kind: 'key', value: 'lines' },
      { kind: 'index', value: 5 },
      { kind: 'key', value: 'kdvPercent' },
    ];
    expect(tokensToTemplate(tokens)).toBe('lines[*].kdvPercent');
  });

  it('handles double-indexed template', () => {
    const tokens = parsePath('lines[2].taxes[3].code');
    expect(tokensToTemplate(tokens)).toBe('lines[*].taxes[*].code');
  });

  it('handles flat doc-level path', () => {
    expect(tokensToTemplate(parsePath('type'))).toBe('type');
    expect(tokensToTemplate(parsePath('sender.taxNumber'))).toBe('sender.taxNumber');
  });
});

describe('readPath (Sprint 8h.2)', () => {
  const obj = {
    type: 'TEVKIFAT',
    sender: { taxNumber: '1234567890', name: 'Acme' },
    lines: [
      { name: 'Line 1', kdvPercent: 18, taxes: [{ code: '0071', percent: 25 }] },
      { name: 'Line 2', kdvPercent: 0 },
    ],
  };

  it('reads top-level primitive', () => {
    expect(readPath(obj, parsePath('type'))).toBe('TEVKIFAT');
  });

  it('reads sub-object field', () => {
    expect(readPath(obj, parsePath('sender.taxNumber'))).toBe('1234567890');
  });

  it('reads array element field', () => {
    expect(readPath(obj, parsePath('lines[0].kdvPercent'))).toBe(18);
    expect(readPath(obj, parsePath('lines[1].kdvPercent'))).toBe(0);
  });

  it('reads double-indexed field', () => {
    expect(readPath(obj, parsePath('lines[0].taxes[0].code'))).toBe('0071');
  });

  it('returns undefined for non-existent path', () => {
    expect(readPath(obj, parsePath('lines[0].withholdingTaxCode'))).toBeUndefined();
    expect(readPath(obj, parsePath('paymentMeans.iban'))).toBeUndefined();
  });

  it('returns undefined for out-of-bounds index', () => {
    expect(readPath(obj, parsePath('lines[5].name'))).toBeUndefined();
  });
});

describe('applyPathUpdate (Sprint 8h.2)', () => {
  it('updates top-level primitive (immutable)', () => {
    const input = { type: 'SATIS', profile: 'TICARIFATURA' };
    const updated = applyPathUpdate(input, parsePath('type'), 'TEVKIFAT');
    expect(updated.type).toBe('TEVKIFAT');
    expect(updated.profile).toBe('TICARIFATURA');
    expect(updated).not.toBe(input);          // new reference
    expect(input.type).toBe('SATIS');         // original unchanged
  });

  it('updates sub-object field (path-targeted clone)', () => {
    const input: any = { sender: { taxNumber: 'X', name: 'Acme' } };
    const updated = applyPathUpdate(input, parsePath('sender.taxNumber'), '1234567890');
    expect(updated.sender.taxNumber).toBe('1234567890');
    expect(updated.sender.name).toBe('Acme');
    expect(updated.sender).not.toBe(input.sender);
    expect(input.sender.taxNumber).toBe('X');
  });

  it('updates array element field (immutable)', () => {
    const input: any = { lines: [{ kdvPercent: 18 }, { kdvPercent: 8 }] };
    const updated = applyPathUpdate(input, parsePath('lines[0].kdvPercent'), 0);
    expect(updated.lines[0].kdvPercent).toBe(0);
    expect(updated.lines[1].kdvPercent).toBe(8);
    expect(updated.lines).not.toBe(input.lines);
    expect(updated.lines[0]).not.toBe(input.lines[0]);
    expect(updated.lines[1]).toBe(input.lines[1]);    // sibling unchanged reference
    expect(input.lines[0].kdvPercent).toBe(18);
  });

  it('updates double-indexed field', () => {
    const input: any = { lines: [{ taxes: [{ code: '0071', percent: 25 }] }] };
    const updated = applyPathUpdate(input, parsePath('lines[0].taxes[0].percent'), 30);
    expect(updated.lines[0].taxes[0].percent).toBe(30);
    expect(updated.lines[0].taxes[0].code).toBe('0071');
  });

  it('creates sub-object on first set (D-6)', () => {
    const input: any = { type: 'SATIS' };
    const updated = applyPathUpdate(input, parsePath('paymentMeans.meansCode'), '1');
    expect(updated.paymentMeans).toEqual({ meansCode: '1' });
    expect(updated.type).toBe('SATIS');
  });
});

describe('deepEqual (Sprint 8h.2)', () => {
  it('returns true for identical primitives', () => {
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(42, 42)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(0, '0')).toBe(false);
  });

  it('returns true for structurally equal objects', () => {
    expect(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
  });

  it('returns false for differing nested objects', () => {
    expect(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).toBe(false);
  });

  it('returns true for equal arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });
});
