/**
 * SGK tipi için simple-input katmanı validator (B-NEW-08, B-NEW-09, B-NEW-10).
 *
 * TS literal union `SimpleSgkType` compile-time darlatma sağlar; bu validator
 * runtime'da ek kontroller uygular (kullanıcı `any`/bilinmeyen string geçirebilir).
 *
 * Kurallar:
 * - B-NEW-08: `type === 'SGK'` ama `sgk` obje eksik → `TYPE_REQUIRES_SGK`
 * - B-NEW-09: `sgk.type` SGK_WHITELIST dışı → `INVALID_VALUE`
 * - B-NEW-10: `sgk.documentNo`, `sgk.companyName`, `sgk.companyCode` boş/eksik → `MISSING_FIELD`
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';

const SGK_TYPE_WHITELIST: ReadonlySet<string> = new Set([
  'SAGLIK_ECZ',
  'SAGLIK_HAS',
  'SAGLIK_OPT',
  'SAGLIK_MED',
  'ABONELIK',
  'MAL_HIZMET',
  'DIGER',
]);

export function validateSgkInput(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // B-NEW-08: type=SGK ise sgk obje zorunlu
  if (input.type === 'SGK') {
    if (!input.sgk) {
      errors.push({
        code: 'TYPE_REQUIRES_SGK',
        message: 'SGK tipinde belge seviyesi sgk bilgisi zorunlu',
        path: 'sgk',
      });
      return errors; // Erken dön — sgk olmadan alt alan kontrolleri anlamsız
    }
  }

  if (!input.sgk) {
    return errors;
  }

  const sgk = input.sgk;

  // B-NEW-09: sgk.type whitelist kontrolü
  if (!SGK_TYPE_WHITELIST.has(sgk.type)) {
    errors.push({
      code: 'INVALID_VALUE',
      message: `sgk.type geçersiz. İzinli: ${Array.from(SGK_TYPE_WHITELIST).join(' | ')}`,
      path: 'sgk.type',
      expected: Array.from(SGK_TYPE_WHITELIST).join(' | '),
      actual: String(sgk.type),
    });
  }

  // B-NEW-10: sgk.documentNo + sgk.companyName + sgk.companyCode boş-olmama
  if (!sgk.documentNo || sgk.documentNo.trim() === '') {
    errors.push({
      code: 'MISSING_FIELD',
      message: 'SGK belge numarası (sgk.documentNo) boş olamaz',
      path: 'sgk.documentNo',
    });
  }
  if (!sgk.companyName || sgk.companyName.trim() === '') {
    errors.push({
      code: 'MISSING_FIELD',
      message: 'SGK firma adı (sgk.companyName) boş olamaz',
      path: 'sgk.companyName',
    });
  }
  if (!sgk.companyCode || sgk.companyCode.trim() === '') {
    errors.push({
      code: 'MISSING_FIELD',
      message: 'SGK firma sicil kodu (sgk.companyCode) boş olamaz',
      path: 'sgk.companyCode',
    });
  }

  return errors;
}
