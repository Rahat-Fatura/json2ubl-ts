/**
 * Biçim ve çekirdek-zorunluluk kontrolleri — simple-input katmanı.
 *
 * Bu kuralların hepsini GİB zaten reddediyor (XSD veya şematron), ama reddi
 * ÖNİZLEMEDE öğreniliyordu: kullanıcı formu doldurup önizlemeye basana kadar
 * hiçbir uyarı görmüyordu. Kaplama seferinde ölçüldü — GİB'in reddettiği 41
 * senaryonun 12'sinde portal sessizdi; aşağıdakiler o listeden.
 *
 * Hepsi "doluysa doğru olmalı" biçimindedir; boş taslak alanı hata üretmez.
 * İstisnası `uuid`: belgenin kimliğidir ve portal onu mount'ta yazar
 * (`use-stable-uuid`), boş kalması bir kusurdur.
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
/** `YYYY-MM-DDTHH:mm:ss` (saniye zorunlu, saat dilimi opsiyonel). */
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)?$/;
const VKN_TCKN_REGEX = /^(\d{10}|\d{11})$/;

function bos(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

/** UBL `PostalAddress` bu ikisini ZORUNLU kılar; eksikse `buildXml` fırlatır. */
const ADRES_ZORUNLU: ReadonlyArray<['city' | 'district', string]> = [
  ['city', 'şehir'],
  ['district', 'ilçe'],
];

function tarafKontrol(
  taraf: { taxNumber?: string; city?: string; district?: string } | undefined,
  yol: string,
  etiket: string,
): ValidationError[] {
  if (!taraf) return [];
  const out: ValidationError[] = [];

  if (!bos(taraf.taxNumber) && !VKN_TCKN_REGEX.test(String(taraf.taxNumber).trim())) {
    out.push({
      code: 'INVALID_FORMAT',
      message: `${etiket} VKN/TCKN 10 veya 11 haneli rakam olmalıdır.`,
      path: `${yol}.taxNumber`,
      expected: '10 haneli VKN veya 11 haneli TCKN',
      actual: String(taraf.taxNumber),
    });
  }
  for (const [alan, ad] of ADRES_ZORUNLU) {
    if (bos(taraf[alan])) {
      out.push({
        code: 'MISSING_FIELD',
        message: `${etiket} ${ad} bilgisi zorunludur.`,
        path: `${yol}.${alan}`,
      });
    }
  }
  return out;
}

export function validateSimpleFormats(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (bos(input.uuid)) {
    errors.push({ code: 'MISSING_FIELD', message: 'Belge ETTN (UUID) bilgisi zorunludur.', path: 'uuid' });
  } else if (!UUID_REGEX.test(String(input.uuid).trim())) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: 'Belge ETTN (UUID) biçimi geçersiz.',
      path: 'uuid',
      expected: '8-4-4-4-12 onaltılık UUID',
      actual: String(input.uuid),
    });
  }

  if (!bos(input.datetime) && !DATETIME_REGEX.test(String(input.datetime).trim())) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: 'Belge tarihi ISO biçiminde olmalıdır (YYYY-AA-GGTSS:dd:ss).',
      path: 'datetime',
      expected: 'YYYY-MM-DDTHH:mm:ss',
      actual: String(input.datetime),
    });
  }

  errors.push(...tarafKontrol(input.sender, 'sender', 'Gönderen'));
  errors.push(...tarafKontrol(input.customer, 'customer', 'Alıcı'));

  return errors;
}
