import type { BuilderOptions } from '../../types/builder-options';
import type { ValidationError } from '../../errors/ubl-build-error';
import type { ProducerReceiptInput } from './input';
import { validateProducerReceipt } from './rules';
import { serializeProducerReceipt } from './shape';
import { UblDocumentBuilder } from '../shared/builder-base';

/**
 * e-MM (Müstahsil Makbuzu) XML oluşturucu — HAM girdi yolu.
 *
 * Gövde ORTAK (`UblDocumentBuilder`): seçenek birleştirme, `validationLevel`
 * dalı, `UblBuildError` fırlatma ve `buildUnsafe` davranışı orada yaşar. Burada
 * kalan iki satır belgeye ÖZGÜ olanlardır.
 *
 * @example
 * ```ts
 * const xml = new ProducerReceiptBuilder().build(receiptInput);
 * ```
 */
export class ProducerReceiptBuilder extends UblDocumentBuilder<ProducerReceiptInput> {
  constructor(options?: BuilderOptions) {
    super(options);
  }

  protected serialize(input: ProducerReceiptInput): string {
    return serializeProducerReceipt(
      input,
      this.options.prettyPrint,
      this.options.includeUblExtensions,
    );
  }

  protected runValidation(input: ProducerReceiptInput): ValidationError[] {
    return validateProducerReceipt(input);
  }
}
