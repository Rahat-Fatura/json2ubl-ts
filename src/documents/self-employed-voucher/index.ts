/**
 * e-SMM (Serbest Meslek Makbuzu) katmanı — KATMAN 3 belge tanımı.
 *
 * Bağımlılık TEK YÖNLÜ: `documents/self-employed-voucher → ubltr/ → ubl/`.
 * Kardeş belge türleri (`documents/invoice`, `documents/despatch-advice`)
 * BURADAN GÖRÜNMEZ ve buradan onlara import edilmez — katman bekçisi
 * (`__tests__/layering.test.ts`) bunu ölçer.
 */

export type {
  SelfEmployedVoucherInput,
  SelfEmployedVoucherLineInput,
  SelfEmployedVoucherTaxTotalInput,
  SelfEmployedVoucherTaxSubtotalInput,
  SelfEmployedVoucherTaxTypeCode,
} from './input';
export {
  SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES,
  INCOME_TAX_WITHHOLDING_CODE,
  VAT_CODE,
  VAT_WITHHOLDING_CODE,
} from './input';

export type {
  SimpleSelfEmployedVoucherInput,
  SimpleSelfEmployedVoucherLineInput,
  SelfEmployedVoucherSendMethod,
} from './simple-input';

export { serializeSelfEmployedVoucher } from './shape';

export type { SelfEmployedVoucherValidationStage } from './bindings';
export { selfEmployedVoucherHeaderBindings } from './bindings';

export type { SelfEmployedVoucherValidateOptions } from './rules';
export { validateSelfEmployedVoucher } from './rules';

export type {
  SelfEmployedVoucherAmountChain,
  SelfEmployedVoucherTotals,
} from './totals';
export { selfEmployedVoucherTotals } from './totals';

export type { CalculatedSelfEmployedVoucher } from './mapper';
export {
  calculateSelfEmployedVoucher,
  mapSimpleToSelfEmployedVoucherInput,
  SEND_METHOD_DOCUMENT_TYPE_CODE,
} from './mapper';

export { SelfEmployedVoucherBuilder } from './builder';
export { SimpleSelfEmployedVoucherBuilder } from './simple-builder';
export type {
  SimpleSelfEmployedVoucherBuilderOptions,
  SimpleSelfEmployedVoucherBuildResult,
} from './simple-builder';

export { SelfEmployedVoucherSession } from './session';
export type {
  SelfEmployedVoucherSessionEvents,
  SelfEmployedVoucherSessionEventName,
  SelfEmployedVoucherSessionOptions,
  SelfEmployedVoucherUnsetScope,
  SelfEmployedVoucherIdentificationParty,
  SelfEmployedVoucherPathErrorCode,
  SelfEmployedVoucherPathErrorPayload,
  SelfEmployedVoucherFieldChangedPayload,
  SelfEmployedVoucherLineFieldChangedPayload,
} from './session';

export {
  SelfEmployedVoucherSessionPaths,
  SELF_EMPLOYED_VOUCHER_KNOWN_PATH_TEMPLATES,
  SELF_EMPLOYED_VOUCHER_READ_ONLY_PATHS,
} from './session-paths.generated';
export type {
  SelfEmployedVoucherSessionPathMap,
  SelfEmployedVoucherSessionUpdateOverloads,
} from './session-paths.generated';
