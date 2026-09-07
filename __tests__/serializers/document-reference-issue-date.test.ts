import { describe, it, expect } from 'vitest';
import {
  serializeAdditionalDocument,
  serializeContractReference,
} from '../../src/serializers/reference-serializer';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

/**
 * MADDE 1 — `DocumentReference` bloklarında `cbc:IssueDate`.
 *
 * UBL-TR şeması `DocumentReferenceType/cbc:IssueDate`'i 1..1'e daraltır (standart
 * UBL'de 0..1'dir). Tarih düşünce GİB doğrulayıcısı iki farklı mesaj veriyordu ve
 * ikisi de canlı portal testinde görüldü (2026-09-07, xslt-service :8081):
 *
 *   • ardından eleman VARSA  → «"DocumentTypeCode" elementi bu konumda geçersiz.
 *     Bu noktada beklenen: IssueDate.»   (SGK'nın üç ek belgesi — SIRA hatası GİBİ
 *     okunur, gerçekte EKSİK ELEMAN hatasıdır)
 *   • ardından eleman YOKSA  → «"AdditionalDocumentReference" elementinin içeriği
 *     eksik. Zorunlu element(ler): IssueDate.»   (SARJ'ın ESURaporID belgesi)
 *
 * Bu yüzden testler hem TARİHİN VARLIĞINI hem de SIRASINI (IssueDate,
 * DocumentTypeCode'dan ÖNCE) doğrular.
 */

const sender = {
  taxNumber: '1234567890',
  name: 'Sınır Tanımaz A.Ş.',
  taxOffice: 'Üsküdar',
  address: 'Barbaros Bulvarı No:123',
  district: 'Üsküdar',
  city: 'İstanbul',
};

const customer = {
  taxNumber: '7750409379',
  name: 'Sosyal Güvenlik Kurumu',
  address: 'Ziyabey Cad. No:6',
  district: 'Balgat',
  city: 'Ankara',
};

/** `<cbc:X>` etiketlerinin XML'deki görülme sırasını döndürür. */
function tagOrder(xml: string): string[] {
  return [...xml.matchAll(/<cbc:([A-Za-z]+)[ >]/g)].map(m => m[1]);
}

describe('MADDE 1 — AdditionalDocumentReference IssueDate', () => {
  it('tarih verilmediyse belge tarihi yedeğe düşer', () => {
    const xml = serializeAdditionalDocument(
      { id: '.', documentTypeCode: 'DOSYA_NO' },
      '',
      '2026-04-23',
    );
    expect(xml).toContain('<cbc:IssueDate>2026-04-23</cbc:IssueDate>');
  });

  it('IssueDate, DocumentTypeCode’dan ÖNCE yazılır (XSD sırası)', () => {
    const xml = serializeAdditionalDocument(
      { id: '.', issueDate: '2026-04-23', documentTypeCode: 'DOSYA_NO', documentType: 'X' },
      '',
    );
    expect(tagOrder(xml)).toEqual(['ID', 'IssueDate', 'DocumentTypeCode', 'DocumentType']);
  });

  it('belgenin kendi tarihi yedeği EZER', () => {
    const xml = serializeAdditionalDocument(
      { id: '.', issueDate: '2026-01-01' },
      '',
      '2026-04-23',
    );
    expect(xml).toContain('<cbc:IssueDate>2026-01-01</cbc:IssueDate>');
    expect(xml).not.toContain('2026-04-23');
  });

  it('ne tarih ne yedek varsa FIRLATIR (sessizce şema-geçersiz XML üretmez)', () => {
    expect(() => serializeAdditionalDocument({ id: '.' })).toThrow(/IssueDate/);
  });
});

describe('MADDE 1 — ContractDocumentReference IssueDate (YTB)', () => {
  it('ytbIssueDate yoksa belge tarihine düşer', () => {
    const xml = serializeContractReference({ id: '123456', schemeId: 'YTBNO' }, '', '2026-04-23');
    expect(xml).toContain('<cbc:ID schemeID="YTBNO">123456</cbc:ID>');
    expect(xml).toContain('<cbc:IssueDate>2026-04-23</cbc:IssueDate>');
  });

  it('ne tarih ne yedek varsa FIRLATIR', () => {
    expect(() => serializeContractReference({ id: '123456' })).toThrow(/IssueDate/);
  });
});

describe('MADDE 1 — SGK faturası uçtan uca (portal senaryosu)', () => {
  /* Kullanıcının canlı testindeki girdi: `datetime` YOK. Eski kod ek belge tarihini
   * `simple.datetime?.substring(0,10)` ile türettiği için üç ek belge de tarihsiz
   * çıkıyor ve GİB üç ayrı XSD hatası veriyordu. */
  const sgkInput: SimpleInvoiceInput = {
    id: 'ABC2026000000008',
    uuid: 'e1a2b3c4-0008-4000-8008-000000000008',
    profile: 'TEMELFATURA',
    type: 'SGK',
    currencyCode: 'TRY',
    sender,
    customer,
    sgk: {
      type: 'SAGLIK_ECZ',
      documentNo: 'SGK-ECZ-2026-000042',
      companyName: 'Yeşil Eczane A.Ş.',
      companyCode: 'SGK-COMP-0042',
    },
    lines: [{ name: 'İlaç', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 10 }],
  } as SimpleInvoiceInput;

  it('datetime verilmese de üç SGK ek belgesinin HEPSİ IssueDate taşır', () => {
    const { xml } = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(sgkInput);
    const bloklar = [...xml.matchAll(
      /<cac:AdditionalDocumentReference>([\s\S]*?)<\/cac:AdditionalDocumentReference>/g,
    )].map(m => m[1]);

    expect(bloklar).toHaveLength(3);
    for (const blok of bloklar) {
      expect(blok).toMatch(/<cbc:IssueDate>\d{4}-\d{2}-\d{2}<\/cbc:IssueDate>/);
      expect(tagOrder(blok)).toEqual([
        'ID', 'IssueDate', 'DocumentTypeCode', 'DocumentType', 'DocumentDescription',
      ]);
    }
  });
});
