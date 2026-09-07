import { describe, it, expect } from 'vitest';
import { normalizeTime } from '../../src/utils/formatters';
import { serializePeriod } from '../../src/serializers/common-serializer';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { validateProfileRequirements } from '../../src/validators/profile-requirement-validator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

/**
 * MADDE 2 — ENERJİ/ŞARJ saat biçimi + ESURaporID tarih/GUID kontrolü.
 *
 * Kullanıcının canlı portal testinde (2026-09-07) çıkan hatalar:
 *   • «"00:00" değeri saat (hh:mm:ss) formatına uygun değil» (aynısı "00:04" için)
 *   • «"AdditionalDocumentReference" elementinin içeriği eksik. Zorunlu element(ler): IssueDate»
 *   • Şematron `EnerjiInvoicePeriodCheck` + `EnerjiESURaporIDCheck`
 *
 * Kök neden: portalın saat girişi (`<input type="time">`) saniyesiz `HH:mm` üretir;
 * değer XML'e olduğu gibi yazılıyordu. Çözüm kullanıcıyı zorlamak DEĞİL, saniyeyi
 * serileştirmede tamamlamaktır.
 */

const sarjInput: SimpleInvoiceInput = {
  id: 'ABC2026000000025',
  uuid: 'e1a2b3c4-0025-4000-8025-000000000025',
  datetime: '2026-04-23T15:00:00',
  profile: 'ENERJI',
  type: 'SARJ',
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
  // Portalın ürettiği hâl: saniyesiz saatler
  invoicePeriod: { startDate: '2026-04-01', startTime: '00:00', endDate: '2026-04-23', endTime: '00:04' },
  // Portalın ürettiği hâl: ESU rapor referansı TARİHSİZ
  additionalDocuments: [{ id: 'd4e5f6a7-b8c9-4012-8345-6789abcdef01', schemeId: 'ESURaporID' }],
  lines: [{ name: 'DC Hızlı Şarj', quantity: 45, price: 8, unitCode: 'Adet', kdvPercent: 20 }],
} as SimpleInvoiceInput;

describe('MADDE 2 — normalizeTime', () => {
  it.each([
    ['00:00', '00:00:00'],
    ['00:04', '00:04:00'],
    ['9:05', '09:05:00'],
    ['15:00:00', '15:00:00'],
    ['23:59:59', '23:59:59'],
  ])('%s → %s', (girdi, beklenen) => {
    expect(normalizeTime(girdi)).toBe(beklenen);
  });

  it('saat dilimi ve saniye kesri korunur', () => {
    expect(normalizeTime('15:00:00+03:00')).toBe('15:00:00+03:00');
    expect(normalizeTime('15:00:00.500Z')).toBe('15:00:00.500Z');
  });

  it('tanınmayan değer OLDUĞU GİBİ döner (sessizce bozulmaz, doğrulayıcı söyler)', () => {
    expect(normalizeTime('öğlen')).toBe('öğlen');
    expect(normalizeTime(undefined)).toBeUndefined();
  });
});

describe('MADDE 2 — InvoicePeriod serileştirmesi', () => {
  it('HH:mm gelen saatler XML’e HH:mm:ss yazılır', () => {
    const xml = serializePeriod({
      startDate: '2026-04-01', startTime: '00:00',
      endDate: '2026-04-23', endTime: '00:04',
    });
    expect(xml).toContain('<cbc:StartTime>00:00:00</cbc:StartTime>');
    expect(xml).toContain('<cbc:EndTime>00:04:00</cbc:EndTime>');
  });
});

describe('MADDE 2 — SARJ faturası uçtan uca (portal senaryosu)', () => {
  it('saniyesiz saat + tarihsiz ESURaporID ile bile XSD-uyumlu XML üretir', () => {
    const { xml } = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(sarjInput);

    expect(xml).toContain('<cbc:StartTime>00:00:00</cbc:StartTime>');
    expect(xml).toContain('<cbc:EndTime>00:04:00</cbc:EndTime>');
    expect(xml).not.toContain('<cbc:StartTime>00:00</cbc:StartTime>');

    // ESURaporID belgesi: schemeID + GUID + tarih (fatura tarihine düşmüş)
    const esu = /<cac:AdditionalDocumentReference>([\s\S]*?)<\/cac:AdditionalDocumentReference>/.exec(xml)![1];
    expect(esu).toContain('schemeID="ESURaporID"');
    expect(esu).toContain('<cbc:IssueDate>2026-04-23</cbc:IssueDate>');
  });
});

describe('MADDE 2 — ESURaporID biçim denetimi (GİB’e gitmeden)', () => {
  function esuHatalari(doc: Record<string, unknown>) {
    return validateProfileRequirements({
      ...sarjInput,
      additionalDocuments: [doc],
    } as SimpleInvoiceInput).filter(e => (e.path ?? '').startsWith('additionalDocuments'));
  }

  it('geçerli GUID + tarih → hata yok', () => {
    expect(esuHatalari({
      id: 'd4e5f6a7-b8c9-4012-8345-6789abcdef01',
      schemeId: 'ESURaporID',
      issueDate: '2026-04-23',
    })).toHaveLength(0);
  });

  it('GUID olmayan ID → INVALID_FORMAT', () => {
    const hatalar = esuHatalari({ id: 'ESU-2026-0001', schemeId: 'ESURaporID' });
    expect(hatalar).toHaveLength(1);
    expect(hatalar[0].code).toBe('INVALID_FORMAT');
    expect(hatalar[0].path).toBe('additionalDocuments[0].id');
  });

  it('bozuk tarih → INVALID_FORMAT', () => {
    const hatalar = esuHatalari({
      id: 'd4e5f6a7-b8c9-4012-8345-6789abcdef01',
      schemeId: 'ESURaporID',
      issueDate: '23.04.2026',
    });
    expect(hatalar).toHaveLength(1);
    expect(hatalar[0].path).toBe('additionalDocuments[0].issueDate');
  });

  it('BOŞ tarih hata DEĞİLDİR — mapper belge tarihine düşer', () => {
    expect(esuHatalari({
      id: 'd4e5f6a7-b8c9-4012-8345-6789abcdef01',
      schemeId: 'ESURaporID',
    })).toHaveLength(0);
  });
});
