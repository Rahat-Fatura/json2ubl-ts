import { describe, it, expect } from 'vitest';
import { runPathGates, checkIndexBounds } from '../../src/session';
import { parsePath } from '../../src/calculator/session-path-utils';

/**
 * ORTAK yol kapıları — belge tipinden bağımsız çekirdek.
 *
 * Bu testler `InvoiceSession`'dan ÇIKARILAN davranışı kendi evinde çivilar; fatura
 * tarafındaki 2580 test zaten regresyon ağıdır, burası ise `DespatchSession` ve
 * gelecek tipler için sözleşmedir.
 */
const ctx = (root: unknown, known: string[] = [], readOnly: string[] = []) => ({
  knownPathTemplates: new Set(known),
  readOnlyPaths: new Set(readOnly),
  root,
});

describe('runPathGates — dört katman sırayla', () => {
  it('Katman 1: bozuk sözdizimi → INVALID_PATH + requestedValue taşır', () => {
    const r = runPathGates('lines[', 42, ctx({}));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_PATH');
    expect(r.error.requestedValue).toBe(42);
  });

  it('Katman 2: salt-okuma yolu → READ_ONLY_PATH (Katman 3 hiç sorulmaz)', () => {
    // `isExport` bilinen şablonlarda YOK; yine de READ_ONLY dönmeli → sıra kanıtı.
    const r = runPathGates('isExport', true, ctx({}, [], ['isExport']));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('READ_ONLY_PATH');
    expect(r.error.requestedValue).toBe(true);
  });

  it('Katman 3: haritada olmayan yol → UNKNOWN_PATH, şablon gerekçede', () => {
    const r = runPathGates('lines[0].foo', 'x', ctx({ lines: [{}] }, ['lines[*].bar']));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('UNKNOWN_PATH');
    expect(r.error.reason).toContain('lines[*].foo');
  });

  /* 🔴 ASİMETRİ ÇİVİSİ: 1-3 `requestedValue` taşır, 4 TAŞIMAZ — hata değerde
     değil yolun kendisindedir. Canlı fatura davranışı budur. */
  it('Katman 4: dizi sınırı → INDEX_OUT_OF_BOUNDS ve requestedValue TAŞIMAZ', () => {
    const r = runPathGates('lines[5].id', 'x', ctx({ lines: [{}] }, ['lines[*].id']));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INDEX_OUT_OF_BOUNDS');
    expect(r.error).not.toHaveProperty('requestedValue');
  });

  it('geçerli yol → tokens döner (çağıran yeniden parse ETMEZ)', () => {
    const r = runPathGates('lines[0].id', 'x', ctx({ lines: [{}] }, ['lines[*].id']));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tokens).toEqual(parsePath('lines[0].id'));
  });

  /* Kapı yalnız KENDİ hatasını tanır; beklenmeyen istisna yutulmaz. */
  it('PathParseError DIŞINDAKİ istisna yutulmaz', () => {
    const exploding = {
      has() {
        throw new Error('patlayan küme');
      },
    } as unknown as ReadonlySet<string>;
    expect(() =>
      runPathGates('a', 1, { knownPathTemplates: exploding, readOnlyPaths: new Set(), root: {} }),
    ).toThrow('patlayan küme');
  });
});

describe('checkIndexBounds — iki bilinçli gevşeme', () => {
  it('üst dizi tanımsız + index 0 → REDDEDİLMEZ (uygulayıcı diziyi yaratır)', () => {
    expect(checkIndexBounds({}, parsePath('tags[0].id'), 'tags[0].id')).toBeNull();
  });

  it('üst dizi tanımsız + index > 0 → örtük length=0 → RED', () => {
    const e = checkIndexBounds({}, parsePath('tags[2].id'), 'tags[2].id');
    expect(e?.code).toBe('INDEX_OUT_OF_BOUNDS');
    expect(e?.reason).toContain('implicit length=0');
  });

  it('index === length → REDDEDİLMEZ (sona ekleme)', () => {
    expect(checkIndexBounds({ tags: [{}] }, parsePath('tags[1].id'), 'tags[1].id')).toBeNull();
  });

  it('index > length → RED (seyrek atlama)', () => {
    const e = checkIndexBounds({ tags: [{}] }, parsePath('tags[3].id'), 'tags[3].id');
    expect(e?.reason).toContain('length=1');
  });

  it('dizi olmayan düğümde sessizce geçer (tip uyuşmazlığı Katman 3’ün işi)', () => {
    expect(checkIndexBounds({ tags: 'metin' }, parsePath('tags[0]'), 'tags[0]')).toBeNull();
  });

  it('indekssiz yol her zaman geçer', () => {
    expect(checkIndexBounds({}, parsePath('a.b.c'), 'a.b.c')).toBeNull();
  });
});
