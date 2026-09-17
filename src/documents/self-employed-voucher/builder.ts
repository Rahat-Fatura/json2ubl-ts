import type { BuilderOptions } from '../../types/builder-options';
import type { ValidationError } from '../../errors/ubl-build-error';
import { UblBuildError } from '../../errors/ubl-build-error';
import type { SelfEmployedVoucherInput } from './input';
import { validateSelfEmployedVoucher } from './rules';
import { serializeSelfEmployedVoucher } from './shape';

/**
 * Varsayılan builder seçenekleri.
 *
 * `allowReducedKdvRate` e-SMM'de ANLAMSIZDIR (o kapı `TaxExemptionReasonCode`
 * 555'e özgü bir FATURA kuralıdır) — `DespatchBuilder` ile aynı gerekçeyle
 * `false` sabitlenir; seçenek yüzeyi ortak `BuilderOptions` olduğu için alan
 * duruyor, davranışı yok.
 */
const DEFAULT_OPTIONS: Required<BuilderOptions> = {
  prettyPrint: true,
  indentSize: 2,
  validationLevel: 'basic',
  xmlDeclaration: true,
  allowReducedKdvRate: false,
  includeUblExtensions: false,
};

/**
 * e-SMM (Serbest Meslek Makbuzu) XML oluşturucu — HAM girdi yolu.
 *
 * @example
 * ```ts
 * const xml = new SelfEmployedVoucherBuilder().build(voucherInput);
 * ```
 */
export class SelfEmployedVoucherBuilder {
  private readonly options: Required<BuilderOptions>;

  constructor(options?: BuilderOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * e-SMM verisinden UBL XML üretir.
   * @throws {UblBuildError} Doğrulama hataları varsa.
   */
  build(input: SelfEmployedVoucherInput): string {
    const errors = this.validate(input);
    if (errors.length > 0) {
      throw new UblBuildError(errors);
    }
    return serializeSelfEmployedVoucher(
      input,
      this.options.prettyPrint,
      this.options.includeUblExtensions,
    );
  }

  /** Doğrulama hatalarını döner (boşsa geçerli). */
  validate(input: SelfEmployedVoucherInput): ValidationError[] {
    if (this.options.validationLevel === 'none') {
      return [];
    }
    return validateSelfEmployedVoucher(input);
  }

  /** Doğrulamadan XML üretir. */
  buildUnsafe(input: SelfEmployedVoucherInput): string {
    return serializeSelfEmployedVoucher(
      input,
      this.options.prettyPrint,
      this.options.includeUblExtensions,
    );
  }
}
