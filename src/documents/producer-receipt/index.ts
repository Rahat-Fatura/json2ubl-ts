/**
 * e-MM (Müstahsil Makbuzu) katmanı — KATMAN 3 belge tanımı.
 *
 * Bağımlılık TEK YÖNLÜ: `documents/producer-receipt → documents/shared →
 * ubltr/ → ubl/`. Kardeş belge türleri (`documents/invoice`,
 * `documents/despatch-advice`, `documents/self-employed-voucher`) BURADAN
 * GÖRÜNMEZ ve buradan onlara import edilmez — katman bekçisi
 * (`__tests__/layering.test.ts`) bunu ölçer.
 *
 * 🔴 e-SMM ile AYNI İSKELET, AYRI KATMAN. Kararın gerekçesi kök farkıdır:
 * e-SMM `Invoice`, e-MM `CreditNote` köklüdür; sekans, satır elemanı ve toplam
 * zinciri bu yüzden farklıdır. Ayrılık "iki kopya" demek DEĞİLDİR — ortak olan
 * her şey (oturum gövdesi, builder gövdesi, kur/kalem kuralları, e-Arşiv eşleme
 * yardımcıları, satır tabanı aritmetiği) aşağı katmanlarda TEK kopyadır.
 */

export type {
  ProducerReceiptInput,
  ProducerReceiptLineInput,
  ProducerReceiptTaxTotalInput,
  ProducerReceiptTaxSubtotalInput,
  ProducerReceiptTaxTypeCode,
} from './input';
export {
  PRODUCER_RECEIPT_TAX_TYPE_CODES,
  INCOME_TAX_WITHHOLDING_CODE,
  PASTURE_FUND_CODE,
  EXCHANGE_REGISTRATION_FEE_CODE,
  SOCIAL_SECURITY_PREMIUM_CODE,
} from './input';

export type {
  SimpleProducerReceiptInput,
  SimpleProducerReceiptLineInput,
  ProducerReceiptSendMethod,
} from './simple-input';

export { serializeProducerReceipt } from './shape';

export type { ProducerReceiptValidationStage } from './bindings';
export { producerReceiptHeaderBindings } from './bindings';

export type { ProducerReceiptValidateOptions } from './rules';
export { validateProducerReceipt } from './rules';

export type { ProducerReceiptAmountChain, ProducerReceiptTotals } from './totals';
export { producerReceiptTotals } from './totals';

export type {
  CalculatedProducerReceipt,
  CalculatedProducerReceiptLine,
  CalculatedDeduction,
} from './mapper';
export {
  calculateProducerReceipt,
  mapSimpleToProducerReceiptInput,
  SEND_METHOD_DOCUMENT_TYPE_CODE,
} from './mapper';

export { ProducerReceiptBuilder } from './builder';
export { SimpleProducerReceiptBuilder } from './simple-builder';
export type {
  SimpleProducerReceiptBuilderOptions,
  SimpleProducerReceiptBuildResult,
} from './simple-builder';

export { ProducerReceiptSession } from './session';
export type {
  ProducerReceiptSessionEvents,
  ProducerReceiptSessionEventName,
  ProducerReceiptSessionOptions,
  ProducerReceiptUnsetScope,
  ProducerReceiptIdentificationParty,
  ProducerReceiptPathErrorCode,
  ProducerReceiptPathErrorPayload,
  ProducerReceiptFieldChangedPayload,
  ProducerReceiptLineFieldChangedPayload,
} from './session';

export {
  ProducerReceiptSessionPaths,
  PRODUCER_RECEIPT_KNOWN_PATH_TEMPLATES,
  PRODUCER_RECEIPT_READ_ONLY_PATHS,
} from './session-paths.generated';
export type {
  ProducerReceiptSessionPathMap,
  ProducerReceiptSessionUpdateOverloads,
} from './session-paths.generated';
