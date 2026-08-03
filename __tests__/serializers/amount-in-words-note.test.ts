/**
 * v3.0.0 — `#YAZIYLA:...#` notunun serializer'a bağlanması.
 *
 * Sözleşme:
 * - Not KOŞULSUZ eklenir (opsiyon yok)
 * - Kaynak `LegalMonetaryTotal/PayableAmount`
 * - Notların İLKİdir; tüketici notları sırasını koruyarak arkadan gelir
 * - Tüketicinin elle yazdığı yazıyla-notları atılır (çelişki olmasın)
 * - `cbc:Note` konumu XSD sırasında değişmez (InvoiceTypeCode → Note → DocumentCurrencyCode)
 */

import { describe, it, expect } from 'vitest';
import { serializeInvoice } from '../../src/serializers/invoice-serializer';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

function baseInput(overrides: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: InvoiceTypeCode.SATIS,
    issueDate: '2024-01-15',
    currencyCode: 'TRY',
    supplier: {
      vknTckn: '1234567890',
      taxIdType: 'VKN',
      name: 'Test Firma A.Ş.',
      streetName: 'Atatürk Caddesi',
      citySubdivisionName: 'Çankaya',
      cityName: 'Ankara',
      country: 'Türkiye',
      taxOffice: 'Çankaya VD',
    },
    customer: {
      vknTckn: '12345678901',
      taxIdType: 'TCKN',
      firstName: 'Ahmet',
      familyName: 'Yılmaz',
      streetName: 'İstiklal Caddesi',
      citySubdivisionName: 'Beyoğlu',
      cityName: 'İstanbul',
      country: 'Türkiye',
    },
    taxTotals: [
      {
        taxAmount: 18,
        taxSubtotals: [
          {
            taxableAmount: 100,
            taxAmount: 18,
            percent: 18,
            taxTypeCode: '0015',
            taxTypeName: 'KDV',
          },
        ],
      },
    ],
    legalMonetaryTotal: {
      lineExtensionAmount: 100,
      taxExclusiveAmount: 100,
      taxInclusiveAmount: 118,
      payableAmount: 182.2,
    },
    lines: [
      {
        id: '1',
        invoicedQuantity: 2,
        unitCode: 'C62',
        lineExtensionAmount: 100,
        taxTotal: {
          taxAmount: 18,
          taxSubtotals: [
            {
              taxableAmount: 100,
              taxAmount: 18,
              percent: 18,
              taxTypeCode: '0015',
              taxTypeName: 'KDV',
            },
          ],
        },
        item: { name: 'Bilgisayar Kasası' },
        price: { priceAmount: 50 },
      },
    ],
    ...overrides,
  };
}

/** Belge seviyesindeki (satır dışı) cbc:Note içeriklerini sırasıyla döner. */
function documentNotes(xml: string): string[] {
  const head = xml.split('<cac:InvoiceLine>')[0]!;
  return [...head.matchAll(/<cbc:Note>([\s\S]*?)<\/cbc:Note>/g)].map(m => m[1]!);
}

describe('v3.0.0 — yazıyla notu KOŞULSUZ eklenir', () => {
  it('hiç not verilmese bile #YAZIYLA:...# yazılır', () => {
    const xml = serializeInvoice(baseInput());
    expect(documentNotes(xml)).toEqual(['#YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#']);
  });

  it('notes: [] verildiğinde de yazılır', () => {
    const xml = serializeInvoice(baseInput({ notes: [] }));
    expect(documentNotes(xml)).toEqual(['#YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#']);
  });

  it('kaynak PayableAmount — TaxInclusiveAmount DEĞİL', () => {
    const xml = serializeInvoice(
      baseInput({
        legalMonetaryTotal: {
          lineExtensionAmount: 100,
          taxExclusiveAmount: 100,
          taxInclusiveAmount: 118,
          payableAmount: 90.5,
        },
      }),
    );
    expect(documentNotes(xml)[0]).toBe('#YAZIYLA:DOKSAN LİRA 50 KURUŞ#');
  });
});

describe('v3.0.0 — not, notların İLKİdir', () => {
  it('tüketici notları sırasını koruyarak arkadan gelir', () => {
    const xml = serializeInvoice(
      baseInput({ notes: ['Sicil No: 0606', 'İF NO:709'] }),
    );
    expect(documentNotes(xml)).toEqual([
      '#YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#',
      'Sicil No: 0606',
      'İF NO:709',
    ]);
  });
});

describe('v3.0.0 — elle yazılmış yazıyla-notu atılır (çelişki olmasın)', () => {
  it('tüketicinin YAZIYLA notu kütüphanenin notuyla değiştirilir', () => {
    const xml = serializeInvoice(
      baseInput({
        notes: ['YAZIYLA: ON DÖRT BİN BEŞ YÜZ ELLİ TÜRK LİRASI', 'Sicil No: 0606'],
      }),
    );
    expect(documentNotes(xml)).toEqual([
      '#YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#',
      'Sicil No: 0606',
    ]);
  });

  it('GİB/Mimsoft varyantı (YAZIYLA:#...#) da atılır', () => {
    const xml = serializeInvoice(
      baseInput({ notes: ['YAZIYLA:#BİR TÜRK LIRASI YİRMİ KURUŞ#'] }),
    );
    expect(documentNotes(xml)).toEqual(['#YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#']);
  });

  it('belgede asla iki yazıyla-notu bulunmaz', () => {
    const xml = serializeInvoice(
      baseInput({ notes: ['#YAZIYLA:ESKİ NOT#', '#YAZIYLA:BAŞKA ESKİ NOT#'] }),
    );
    const yaziyla = documentNotes(xml).filter(n => n.includes('YAZIYLA'));
    expect(yaziyla).toHaveLength(1);
  });
});

describe('v3.0.0 — para birimi notu şekillendirir', () => {
  it('USD faturada DOLAR/SENT yazılır', () => {
    const xml = serializeInvoice(baseInput({ currencyCode: 'USD' }));
    expect(documentNotes(xml)[0]).toBe('#YAZIYLA:YÜZ SEKSEN İKİ DOLAR 20 SENT#');
  });

  it('EUR faturada EURO/SENT yazılır', () => {
    const xml = serializeInvoice(baseInput({ currencyCode: 'EUR' }));
    expect(documentNotes(xml)[0]).toBe('#YAZIYLA:YÜZ SEKSEN İKİ EURO 20 SENT#');
  });
});

describe('v3.0.0 — XSD sırası ve XML bütünlüğü korunur', () => {
  it('Note, InvoiceTypeCode ile DocumentCurrencyCode ARASINDA kalır', () => {
    const xml = serializeInvoice(baseInput({ notes: ['Sicil No: 0606'] }));
    const typeIdx = xml.indexOf('<cbc:InvoiceTypeCode>');
    const firstNoteIdx = xml.indexOf('<cbc:Note>');
    const lastNoteIdx = xml.lastIndexOf('<cbc:Note>Sicil No: 0606</cbc:Note>');
    const currencyIdx = xml.indexOf('<cbc:DocumentCurrencyCode>');
    expect(typeIdx).toBeLessThan(firstNoteIdx);
    expect(firstNoteIdx).toBeLessThan(lastNoteIdx);
    expect(lastNoteIdx).toBeLessThan(currencyIdx);
  });

  it('not içeriği XML-özel karakter içermez (escape gerekmez)', () => {
    const xml = serializeInvoice(baseInput());
    const note = documentNotes(xml)[0]!;
    expect(note).not.toMatch(/[&<>]/);
  });

  it('satır notları (InvoiceLine/cbc:Note) etkilenmez', () => {
    const input = baseInput();
    input.lines[0]!.notes = ['Satır notu'];
    const xml = serializeInvoice(input);
    const lineBlock = xml.split('<cac:InvoiceLine>')[1]!;
    expect(lineBlock).toContain('<cbc:Note>Satır notu</cbc:Note>');
    expect(lineBlock).not.toContain('YAZIYLA');
  });
});

describe('v3.0.0 — okunamayan tutarda not yazılmaz, serializer patlamaz', () => {
  it('payableAmount NaN → not yok, XML üretilir', () => {
    const input = baseInput();
    (input.legalMonetaryTotal as { payableAmount: number }).payableAmount = NaN;
    const xml = serializeInvoice(input);
    expect(documentNotes(xml)).toEqual([]);
    expect(xml).toContain('</Invoice>');
  });

  it('payableAmount undefined ise (buildUnsafe yolu) not yok, XML üretilir', () => {
    const input = baseInput();
    delete (input.legalMonetaryTotal as Partial<InvoiceInput['legalMonetaryTotal']>)
      .payableAmount;
    const xml = serializeInvoice(input);
    expect(documentNotes(xml)).toEqual([]);
    expect(xml).toContain('</Invoice>');
  });

  it('legalMonetaryTotal hiç yoksa yazıyla adımı hata KAYNAĞI değildir', () => {
    // Not: eksik legalMonetaryTotal'da serializeLegalMonetaryTotal zaten
    // (v3.0.0 öncesinden beri) patlar — yazıyla adımı bu yolu bozmamalıdır.
    const input = baseInput();
    delete (input as Partial<InvoiceInput>).legalMonetaryTotal;
    expect(() => serializeInvoice(input)).toThrow(/lineExtensionAmount/);
  });
});
