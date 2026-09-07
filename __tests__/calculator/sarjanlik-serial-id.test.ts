import { describe, it, expect } from 'vitest';
import { deriveLineFieldVisibility } from '../../src/calculator/line-field-visibility';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

/**
 * MADDE 3 — SARJANLIK kalem seri numarası.
 *
 * Şematron `EnerjiItemInstanceSerialIDCheck` şunu ister:
 *   `inv:Invoice/cac:InvoiceLine/cac:Item/cac:ItemInstance/cbc:SerialID` (boş olamaz)
 *
 * Kütüphane bu kuralı zaten UYARIYORDU ("Şarj anlık faturalarında her kalemde seri
 * numarası zorunludur") ama `showSerialId` görünürlük bayrağı yalnız YATIRIMTESVIK'i
 * kapsadığı için portalda doldurulacak alan HİÇ görünmüyordu — kullanıcı çıkmazdaydı.
 *
 * Portalın dolduracağı yol: `SessionPaths.lineSerialId(i)` → `lines[i].serialId`.
 */

function makeLine(over: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return {
    name: 'Anlık Şarj',
    quantity: 12,
    price: 9,
    unitCode: 'Adet',
    kdvPercent: 20,
    ...over,
  } as SimpleLineInput;
}

const sarjanlik: SimpleInvoiceInput = {
  id: 'ABC2026000000026',
  uuid: 'e1a2b3c4-0026-4000-8026-000000000026',
  datetime: '2026-04-23T15:00:00',
  profile: 'ENERJI',
  type: 'SARJANLIK',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Şarj Operatörü A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123',
    district: 'Üsküdar',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '12345678901',
    name: 'Mustafa Kaya',
    address: 'Çamlıca Mah. No:15',
    district: 'Üsküdar',
    city: 'İstanbul',
    identifications: [{ schemeId: 'PLAKA', value: '34ABC123' }],
  },
  invoicePeriod: { startDate: '2026-04-01', startTime: '00:00', endDate: '2026-04-23', endTime: '00:04' },
  lines: [makeLine({ serialId: 'ESU-SN-0001' })],
} as SimpleInvoiceInput;

describe('MADDE 3 — showSerialId görünürlüğü', () => {
  it('SARJANLIK: harcama tipi olmadan da seri no alanı AÇIK', () => {
    const v = deriveLineFieldVisibility(makeLine(), { type: 'SARJANLIK', profile: 'ENERJI' }, 0);
    expect(v.showSerialId).toBe(true);
  });

  it('SARJ (anlık olmayan): kapalı — şematron kuralı yalnız SARJANLIK’ta', () => {
    const v = deriveLineFieldVisibility(makeLine(), { type: 'SARJ', profile: 'ENERJI' }, 0);
    expect(v.showSerialId).toBe(false);
  });

  it('YATIRIMTESVIK regresyonu: yalnız harcama tipi 01 kaleminde açık', () => {
    const acik = deriveLineFieldVisibility(
      makeLine({ itemClassificationCode: '01' }), { type: 'SATIS', profile: 'YATIRIMTESVIK' }, 0,
    );
    const kapali = deriveLineFieldVisibility(
      makeLine({ itemClassificationCode: '02' }), { type: 'SATIS', profile: 'YATIRIMTESVIK' }, 1,
    );
    expect(acik.showSerialId).toBe(true);
    expect(kapali.showSerialId).toBe(false);
  });

  it('SATIS: kapalı', () => {
    const v = deriveLineFieldVisibility(makeLine(), { type: 'SATIS', profile: 'TICARIFATURA' }, 0);
    expect(v.showSerialId).toBe(false);
  });
});

describe('MADDE 3 — portalın dolduracağı yol', () => {
  it('SessionPaths.lineSerialId → lines[i].serialId', () => {
    expect(SessionPaths.lineSerialId(0)).toBe('lines[0].serialId');
  });

  it('oturum bu yolu yazabiliyor', () => {
    const session = new InvoiceSession(sarjanlik);
    session.update(SessionPaths.lineSerialId(0), 'ESU-SN-9999');
    expect(session.input.lines[0].serialId).toBe('ESU-SN-9999');
  });
});

describe('MADDE 3 — XML çıktısı', () => {
  it('serialId → cac:Item/cac:ItemInstance/cbc:SerialID', () => {
    const { xml } = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(sarjanlik);
    expect(xml).toMatch(
      /<cac:ItemInstance>\s*<cbc:SerialID>ESU-SN-0001<\/cbc:SerialID>\s*<\/cac:ItemInstance>/,
    );
  });

  it('seri no boşken doğrulama hâlâ uyarıyor (kural gevşetilmedi)', () => {
    const eksik = { ...sarjanlik, lines: [makeLine()] } as SimpleInvoiceInput;
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(eksik))
      .toThrow(/seri numarası/i);
  });
});
