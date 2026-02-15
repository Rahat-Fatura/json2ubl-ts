import type { InvoiceInput } from '../types/invoice-input';
import type { BuilderOptions } from '../types/builder-options';
import type { ValidationError } from '../errors/ubl-build-error';
import { UblBuildError } from '../errors/ubl-build-error';
import { validateCommon } from '../validators/common-validators';
import { validateByType } from '../validators/type-validators';
import { validateByProfile } from '../validators/profile-validators';
import { validateCrossMatrix } from '../validators/cross-validators';
import { serializeInvoice } from '../serializers/invoice-serializer';

/** Varsayılan builder seçenekleri */
const DEFAULT_OPTIONS: Required<BuilderOptions> = {
  prettyPrint: true,
  indentSize: 2,
  validationLevel: 'basic',
  xmlDeclaration: true,
};

/**
 * UBL-TR Invoice XML oluşturucu
 *
 * @example
 * ```ts
 * const builder = new InvoiceBuilder();
 * const xml = builder.build(invoiceData);
 * ```
 */
export class InvoiceBuilder {
  private readonly options: Required<BuilderOptions>;

  constructor(options?: BuilderOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Invoice verisinden UBL-TR XML string oluşturur
   * @throws {UblBuildError} Validasyon hataları varsa
   */
  build(input: InvoiceInput): string {
    // Validasyon
    const errors = this.validate(input);
    if (errors.length > 0) {
      throw new UblBuildError(errors);
    }

    // Serialize
    return serializeInvoice(input, this.options.prettyPrint);
  }

  /**
   * Invoice verisini validasyondan geçirir (XML oluşturmadan)
   * @returns Validasyon hataları listesi (boş ise geçerli)
   */
  validate(input: InvoiceInput): ValidationError[] {
    const level = this.options.validationLevel;

    if (level === 'none') {
      return [];
    }

    const errors: ValidationError[] = [];

    // §1 Ortak validasyon (basic ve strict)
    errors.push(...validateCommon(input));

    if (level === 'strict') {
      // §4 Çapraz matris kontrolü
      errors.push(...validateCrossMatrix(input));

      // §2 Tip-bazlı validasyon
      errors.push(...validateByType(input));

      // §3 Profil-bazlı validasyon
      errors.push(...validateByProfile(input));
    }

    return errors;
  }

  /**
   * Validasyon yapmadan doğrudan XML oluşturur
   * Dikkat: Geçersiz veri ile hatalı XML oluşabilir
   */
  buildUnsafe(input: InvoiceInput): string {
    return serializeInvoice(input, this.options.prettyPrint);
  }
}
