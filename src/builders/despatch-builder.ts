import type { DespatchInput } from '../types/despatch-input';
import type { BuilderOptions } from '../types/builder-options';
import type { ValidationError } from '../errors/ubl-build-error';
import { UblBuildError } from '../errors/ubl-build-error';
import { validateDespatch } from '../validators/despatch-validators';
import { serializeDespatch } from '../serializers/despatch-serializer';

/** Varsayılan builder seçenekleri */
const DEFAULT_OPTIONS: Required<BuilderOptions> = {
  prettyPrint: true,
  indentSize: 2,
  validationLevel: 'basic',
  xmlDeclaration: true,
};

/**
 * UBL-TR DespatchAdvice XML oluşturucu
 *
 * @example
 * ```ts
 * const builder = new DespatchBuilder();
 * const xml = builder.build(despatchData);
 * ```
 */
export class DespatchBuilder {
  private readonly options: Required<BuilderOptions>;

  constructor(options?: BuilderOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * DespatchAdvice verisinden UBL-TR XML string oluşturur
   * @throws {UblBuildError} Validasyon hataları varsa
   */
  build(input: DespatchInput): string {
    const errors = this.validate(input);
    if (errors.length > 0) {
      throw new UblBuildError(errors);
    }
    return serializeDespatch(input, this.options.prettyPrint);
  }

  /**
   * DespatchAdvice verisini validasyondan geçirir
   * @returns Validasyon hataları listesi (boş ise geçerli)
   */
  validate(input: DespatchInput): ValidationError[] {
    if (this.options.validationLevel === 'none') {
      return [];
    }
    return validateDespatch(input);
  }

  /**
   * Validasyon yapmadan doğrudan XML oluşturur
   */
  buildUnsafe(input: DespatchInput): string {
    return serializeDespatch(input, this.options.prettyPrint);
  }
}
