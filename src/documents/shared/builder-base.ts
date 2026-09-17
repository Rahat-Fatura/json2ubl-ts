/**
 * `UblDocumentBuilder` — belge üreticilerinin ORTAK GÖVDESİ.
 *
 * ── NİYE VAR ───────────────────────────────────────────────────────────────
 * `SelfEmployedVoucherBuilder` ve `ProducerReceiptBuilder` üç metodu da
 * (`build` / `validate` / `buildUnsafe`) BİREBİR aynı akışla yürütüyordu:
 * seçenekleri birleştir → doğrula → hata varsa `UblBuildError` fırlat →
 * serileştir. Aradaki tek fark hangi serileştirici ve hangi doğrulayıcı
 * çağrıldığıdır; ikisi de alt sınıfın TEK SATIRLIK cevabıdır.
 *
 * Kopyalanmış hâlde en pahalı kusur `validationLevel: 'none'` dalında çıkardı:
 * o dal doğrulamayı ATLAR, ve iki kopyadan birinde atlamayı unutmak "doğrulama
 * kapalıyken de fırlatan" bir üretici demektir — tam da `buildUnsafe`in
 * varlık sebebini yok eden kusur.
 *
 * ── KATMAN ─────────────────────────────────────────────────────────────────
 * `documents/shared/` belge katmanının ALTINDADIR (bekçide rank 2.5): belge
 * türleri buradan okur, burası HİÇBİR belge türünü göremez. Kardeş kuralı
 * (`documents/invoice ⊥ documents/producer-receipt`) bozulmaz çünkü paylaşılan
 * parça yukarıda değil AŞAĞIDA durur.
 */

import type { BuilderOptions } from '../../types/builder-options';
import type { ValidationError } from '../../errors/ubl-build-error';
import { UblBuildError } from '../../errors/ubl-build-error';

/**
 * Varsayılan üretici seçenekleri.
 *
 * `allowReducedKdvRate` fatura DIŞI belgelerde ANLAMSIZDIR (o kapı
 * `TaxExemptionReasonCode` 555'e özgü bir FATURA kuralıdır) — `false`
 * sabitlenir; seçenek yüzeyi ortak `BuilderOptions` olduğu için alan duruyor,
 * davranışı yok.
 */
export const DEFAULT_DOCUMENT_BUILDER_OPTIONS: Required<BuilderOptions> = {
  prettyPrint: true,
  indentSize: 2,
  validationLevel: 'basic',
  xmlDeclaration: true,
  allowReducedKdvRate: false,
  includeUblExtensions: false,
};

/**
 * Ham girdiden UBL XML üreten belge üreticilerinin temel sınıfı.
 *
 * @typeParam TInput Belgenin HAM girdi tipi (`*Input`).
 */
export abstract class UblDocumentBuilder<TInput> {
  protected readonly options: Required<BuilderOptions>;

  constructor(options?: BuilderOptions) {
    this.options = { ...DEFAULT_DOCUMENT_BUILDER_OPTIONS, ...options };
  }

  /**
   * Belge verisinden UBL XML üretir.
   * @throws {UblBuildError} Doğrulama hataları varsa.
   */
  build(input: TInput): string {
    const errors = this.validate(input);
    if (errors.length > 0) {
      throw new UblBuildError(errors);
    }
    return this.serialize(input);
  }

  /** Doğrulama hatalarını döner (boşsa geçerli). */
  validate(input: TInput): ValidationError[] {
    if (this.options.validationLevel === 'none') {
      return [];
    }
    return this.runValidation(input);
  }

  /** Doğrulamadan XML üretir. */
  buildUnsafe(input: TInput): string {
    return this.serialize(input);
  }

  /** Belgeye ÖZGÜ serileştirici — alt sınıfın tek satırlık cevabı. */
  protected abstract serialize(input: TInput): string;

  /** Belgeye ÖZGÜ doğrulayıcı — alt sınıfın tek satırlık cevabı. */
  protected abstract runValidation(input: TInput): ValidationError[];
}
