import type { BuilderOptions } from '../../types/builder-options';
import type { ValidationError } from '../../errors/ubl-build-error';
import type { SelfEmployedVoucherInput } from './input';
import { validateSelfEmployedVoucher } from './rules';
import { serializeSelfEmployedVoucher } from './shape';
import { UblDocumentBuilder } from '../shared/builder-base';

/**
 * e-SMM (Serbest Meslek Makbuzu) XML oluşturucu — HAM girdi yolu.
 *
 * Gövde ORTAK (`UblDocumentBuilder`): seçenek birleştirme, `validationLevel`
 * dalı, `UblBuildError` fırlatma ve `buildUnsafe` davranışının tamamı orada
 * yaşar. Burada kalan iki satır belgeye ÖZGÜ olanlardır — hangi doğrulayıcı,
 * hangi serileştirici.
 *
 * @example
 * ```ts
 * const xml = new SelfEmployedVoucherBuilder().build(voucherInput);
 * ```
 */
export class SelfEmployedVoucherBuilder extends UblDocumentBuilder<SelfEmployedVoucherInput> {
  constructor(options?: BuilderOptions) {
    super(options);
  }

  protected serialize(input: SelfEmployedVoucherInput): string {
    return serializeSelfEmployedVoucher(
      input,
      this.options.prettyPrint,
      this.options.includeUblExtensions,
    );
  }

  protected runValidation(input: SelfEmployedVoucherInput): ValidationError[] {
    return validateSelfEmployedVoucher(input);
  }
}
