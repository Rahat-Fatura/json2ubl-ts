/**
 * `update()` yol kapıları — 4 katman, BELGE TİPİNDEN BAĞIMSIZ.
 *
 * ── 🔴 SAF: BU DOSYA EMIT ETMEZ ─────────────────────────────────────────────
 * Kapılar veri döndürür, olayı ÇAĞIRAN yayar. Gerekçe: oturumun olay SIRASI
 * portalın `useSyncExternalStore` köprüsüne kadar uzanan bir sözleşmedir
 * (`field-changed` → `line-field-changed` → `field-activated/deactivated` →
 * `ui-state-changed` → `changed` → …). Kapılar kendi başına emit etseydi bu sıra
 * çıkarma sırasında sessizce kayardı ve hiçbir tip hatası bunu yakalamazdı.
 *
 * ── KATMANLAR ───────────────────────────────────────────────────────────────
 *   1. Sözdizimi  — `parsePath` (`INVALID_PATH`)
 *   2. Salt-okuma — yapıcıda kilitlenmiş yollar (`READ_ONLY_PATH`)
 *   3. Bilinen yol — üretilmiş şablon kümesi (`UNKNOWN_PATH`)
 *   4. Dizi sınırı — seyrek dizi / taşan indeks (`INDEX_OUT_OF_BOUNDS`)
 *
 * Katman 2 ve 3'ün VERİSİ tipe özeldir (üretilmiş `*_KNOWN_PATH_TEMPLATES` /
 * `*_READ_ONLY_PATHS`) ama MEKANİZMASI ortaktır → veri parametre olarak gelir,
 * import EDİLMEZ. Böylece aynı kapı her belge tipinde aynı şekilde koşar.
 */
import { parsePath, tokensToTemplate, PathParseError } from '../calculator/session-path-utils';
import type { SessionPathErrorPayload } from './path-error';

/** `parsePath` çıktısı — ayrı bir tip adı vermemek için köken tipten türetilir. */
export type PathTokens = ReturnType<typeof parsePath>;

export interface PathGateContext {
  /** Üretilmiş şablon kümesi (`KNOWN_PATH_TEMPLATES` muadili). */
  readonly knownPathTemplates: ReadonlySet<string>;
  /** Yapıcıda kilitlenmiş yollar (`READ_ONLY_PATHS` muadili). */
  readonly readOnlyPaths: ReadonlySet<string>;
  /** Dizi sınırı kontrolünün üzerinde yürüyeceği girdi nesnesi. */
  readonly root: unknown;
}

export type PathGateResult =
  | { ok: true; tokens: PathTokens }
  | { ok: false; error: SessionPathErrorPayload };

/**
 * Dört katmanı SIRAYLA koşar; ilk ihlalde durur.
 *
 * Başarıda çözümlenmiş `tokens` döner — çağıran onu yeniden parse ETMEZ
 * (parse iki kez koşarsa `PathParseError` iki farklı yerde doğar ve hata
 * mesajı tekilliğini kaybederiz).
 */
export function runPathGates(
  path: string,
  value: unknown,
  ctx: PathGateContext,
): PathGateResult {
  // Katman 1 — sözdizimi.
  let tokens: PathTokens;
  try {
    tokens = parsePath(path);
  } catch (err) {
    if (err instanceof PathParseError) {
      return {
        ok: false,
        error: { code: 'INVALID_PATH', path, reason: err.message, requestedValue: value },
      };
    }
    // Beklenmeyen istisna YUTULMAZ — kapı yalnız kendi hatasını tanır.
    throw err;
  }

  // Katman 2 — salt-okuma yolu.
  if (ctx.readOnlyPaths.has(path)) {
    return {
      ok: false,
      error: {
        code: 'READ_ONLY_PATH',
        path,
        reason: `'${path}' is constructor-only and immutable`,
        requestedValue: value,
      },
    };
  }

  // Katman 3 — üretilmiş yol haritasında var mı?
  const template = tokensToTemplate(tokens);
  if (!ctx.knownPathTemplates.has(template)) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN_PATH',
        path,
        reason: `path not in SessionPaths map (template: ${template})`,
        requestedValue: value,
      },
    };
  }

  // Katman 4 — dizi sınırı. 🔴 `requestedValue` TAŞIMAZ (bkz. path-error.ts notu).
  const indexError = checkIndexBounds(ctx.root, tokens, path);
  if (indexError) return { ok: false, error: indexError };

  return { ok: true, tokens };
}

/**
 * Katman 4: dizi indeksi sınırı.
 *
 * Dizi CRUD'u yol-tabanlı DEĞİLDİR; indeksle yeni eleman YARATILMAZ. `taxes[0]` ile
 * seyrek dizi oluşturma engellenir: üst dizi tanımsızsa örtük `length=0` sayılır.
 *
 * İki bilinçli gevşeme (ikisi de canlı davranış, korunmalı):
 *   * üst dizi tanımsız + `index === 0` → REDDEDİLMEZ. Uygulayıcı (`applyPathUpdate`)
 *     diziyi kendisi yaratır; opsiyonel dizi yolları (taraf kimlikleri vb.) böylece
 *     ilk kez yazılabilir.
 *   * `index === length` → REDDEDİLMEZ (sona ekleme). Yalnız `> length` seyrek
 *     atlama ihtimali taşıdığı için reddedilir.
 */
export function checkIndexBounds(
  root: unknown,
  tokens: PathTokens,
  path: string,
): SessionPathErrorPayload | null {
  let current: unknown = root;
  for (const token of tokens) {
    if (token.kind === 'index') {
      if (current === undefined || current === null) {
        if (token.value === 0) return null;
        return {
          code: 'INDEX_OUT_OF_BOUNDS',
          path,
          reason: `parent array is undefined (implicit length=0), cannot access index ${token.value}`,
        };
      }
      // Tip uyuşmazlığı Katman 3'ün işiydi; burada sessizce geçilir.
      if (!Array.isArray(current)) return null;
      if (token.value > current.length) {
        return {
          code: 'INDEX_OUT_OF_BOUNDS',
          path,
          reason: `index ${token.value} but length=${current.length}`,
        };
      }
    }
    current =
      token.kind === 'index'
        ? (current as unknown[])[token.value]
        : ((current ?? {}) as Record<string, unknown>)[token.value];
  }
  return null;
}
