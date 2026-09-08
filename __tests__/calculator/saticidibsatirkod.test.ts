/**
 * 4.5.1 — `SATICIDIBSATIRKOD` alanı (İhraç Kayıtlı satıcı DİB satır kodu).
 *
 * ## Neden bu dosya var
 * Şematron `IhracKayitliPartyIdentificationIDTypeCheck` (Common satır 462) İKİ schemeID'ye
 * izin verir: `,SATICIDIBSATIRKOD,ALICIDIBSATIRKOD,` (Codelist satır 66). Kural OLUMSUZ
 * kurulmuştur — "bu ikisi dışında schemeID olmasın" — yani satıcı kodu İZİNLİ, zorunlu
 * DEĞİL. Kütüphanede 4.5.0'a kadar bu alanın karşılığı hiç yoktu: kullanıcı GİB'in kabul
 * ettiği bir beyanı yapamıyordu.
 *
 * Zorunluluk yalnız `ALICIDIBSATIRKOD`'a aittir (`TaxExemptionReasonCodeCheck`, Common
 * satır 326: 11 hane + 12 hane GTİP). Bu testler o ayrımın korunduğunu da kanıtlar.
 */

import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { mapSimpleToInvoiceInput } from '../../src/calculator/simple-invoice-mapper';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import { validateIhrackayitli702 } from '../../src/validators/ihrackayitli-validator';
import type { SimpleInvoiceInput, SimpleLineDeliveryInput } from '../../src/calculator/simple-types';

const ALICI = '12345678901'; // 11 hane — 702 kuralının şart koştuğu uzunluk
const SATICI = 'STC-0042';   // şematronda uzunluk/biçim şartı YOK, bilerek 11 hane değil

function makeInput(delivery: Partial<SimpleLineDeliveryInput>): SimpleInvoiceInput {
  return {
    id: 'TST2026000000001',
    uuid: 'a1b2c3d4-0451-4000-8451-000000000451',
    datetime: '2026-04-23T14:00:00',
    profile: 'TEMELFATURA',
    type: 'IHRACKAYITLI',
    currencyCode: 'TRY',
    kdvExemptionCode: '702',
    sender: {
      taxNumber: '1234567890',
      name: 'Sınır Tanımaz Ticaret A.Ş.',
      taxOffice: 'Üsküdar',
      address: 'Barbaros Bulvarı No:123',
      district: 'Üsküdar',
      city: 'İstanbul',
      zipCode: '34664',
    },
    customer: {
      taxNumber: '9876543210',
      name: 'İhracat Aracı Kurumu A.Ş.',
      taxOffice: 'Kadıköy',
      address: 'Bağdat Caddesi No:456',
      district: 'Kadıköy',
      city: 'İstanbul',
      zipCode: '34710',
    },
    lines: [
      {
        name: 'İhraç Kayıtlı Tekstil Ürünü',
        quantity: 10,
        price: 10,
        unitCode: 'Adet',
        kdvPercent: 0,
        delivery: {
          gtipNo: '620342000010',
          deliveryAddress: {
            address: 'İhracat Serbest Bölgesi Gümrük Kapısı',
            district: 'Ambarlı',
            city: 'İstanbul',
            country: 'Türkiye',
          },
          ...delivery,
        },
      },
    ],
  };
}

/**
 * `validationLevel` parametresi ŞART: ALICI kodu olmayan senaryolar kütüphane
 * doğrulamasından (`IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD`) geçemez. XML
 * ŞEKLİNİ ölçmek için o kapıyı bilerek 'none' ile açıyoruz — kapının kendisi
 * ayrıca test ediliyor (aşağıdaki "702 zorunluluğu GEVŞETİLMEDİ" bloğu).
 */
function buildXml(
  delivery: Partial<SimpleLineDeliveryInput>,
  validationLevel: 'none' | 'basic' | 'strict' = 'basic',
): string {
  return new SimpleInvoiceBuilder({ validationLevel }).build(makeInput(delivery)).xml;
}

/** `<cbc:ID schemeID="…">` niteliklerini görülme sırasına göre çıkarır. */
function schemeIdsOf(xml: string): string[] {
  return Array.from(xml.matchAll(/schemeID="((?:ALICI|SATICI)DIBSATIRKOD)"/g)).map(m => m[1]);
}

/**
 * `cac:CustomsDeclaration` bloğunu izole eder. Belge genelinde
 * `cac:PartyIdentification` gönderici/alıcı VKN'leri için de üretilir; sayım
 * yapmadan önce kapsamı daraltmak ŞART.
 */
function customsDeclarationBlock(xml: string): string {
  const m = /<cac:CustomsDeclaration>[\s\S]*?<\/cac:CustomsDeclaration>/.exec(xml);
  return m?.[0] ?? '';
}

function customsPartyIdCount(xml: string): number {
  return customsDeclarationBlock(xml).match(/<cac:PartyIdentification>/g)?.length ?? 0;
}

describe('SATICIDIBSATIRKOD — PartyIdentification üretimi (4.5.1)', () => {
  it('yalnız ALICI: tek PartyIdentification (mevcut davranış bit-bire korunur)', () => {
    const xml = buildXml({ alicidibsatirkod: ALICI });

    expect(schemeIdsOf(xml)).toEqual(['ALICIDIBSATIRKOD']);
    expect(xml).toContain(`schemeID="ALICIDIBSATIRKOD">${ALICI}<`);
    expect(xml).not.toContain('SATICIDIBSATIRKOD');
    // Tek beyanname, tek kimlik
    expect(customsPartyIdCount(xml)).toBe(1);
  });

  it('İKİSİ BİRDEN: aynı IssuerParty altında İKİ PartyIdentification, sıra ALICI → SATICI', () => {
    const xml = buildXml({ alicidibsatirkod: ALICI, saticidibsatirkod: SATICI });

    expect(schemeIdsOf(xml)).toEqual(['ALICIDIBSATIRKOD', 'SATICIDIBSATIRKOD']);
    expect(xml).toContain(`schemeID="ALICIDIBSATIRKOD">${ALICI}<`);
    expect(xml).toContain(`schemeID="SATICIDIBSATIRKOD">${SATICI}<`);
    // İki kimlik TEK beyannameye (CustomsDeclaration) ve TEK IssuerParty'ye yazılır
    expect(customsPartyIdCount(xml)).toBe(2);
    expect(xml.match(/<cac:CustomsDeclaration>/g)).toHaveLength(1);
    expect(xml.match(/<cac:IssuerParty>/g)).toHaveLength(1);
  });

  it('yalnız SATICI: tek PartyIdentification üretilir (702 zorunluluğu AYRI konudur)', () => {
    const xml = buildXml({ saticidibsatirkod: SATICI }, 'none');

    expect(schemeIdsOf(xml)).toEqual(['SATICIDIBSATIRKOD']);
    expect(xml).toContain(`schemeID="SATICIDIBSATIRKOD">${SATICI}<`);
    expect(xml).not.toContain('ALICIDIBSATIRKOD');
    // Beyanname ağacı (CustomsDeclaration + zorunlu cbc:ID) yalnız satıcı koduyla da doğar
    expect(xml).toContain('<cac:CustomsDeclaration>');
  });

  it('İKİSİ DE BOŞ: CustomsDeclaration hiç üretilmez (boş kabuk eleman GİB\'e gitmez)', () => {
    const xml = buildXml({}, 'none');

    expect(schemeIdsOf(xml)).toEqual([]);
    expect(xml).not.toContain('<cac:CustomsDeclaration>');
    expect(xml).not.toContain('<cac:IssuerParty>');
  });

  it('boş dizgi atlanır: saticidibsatirkod="" ikinci kimliği DOĞURMAZ', () => {
    const xml = buildXml({ alicidibsatirkod: ALICI, saticidibsatirkod: '' });

    expect(schemeIdsOf(xml)).toEqual(['ALICIDIBSATIRKOD']);
    expect(customsPartyIdCount(xml)).toBe(1);
  });

  it('mapper katmanı: partyIdentifications dizisi iki girdiyi taşır', () => {
    const mapped = mapSimpleToInvoiceInput(
      makeInput({ alicidibsatirkod: ALICI, saticidibsatirkod: SATICI }),
    );
    const ids = mapped.lines[0].delivery?.shipment?.transportHandlingUnits?.[0]
      ?.customsDeclarations?.[0]?.issuerParty?.partyIdentifications;

    expect(ids).toEqual([
      { id: ALICI, schemeID: 'ALICIDIBSATIRKOD' },
      { id: SATICI, schemeID: 'SATICIDIBSATIRKOD' },
    ]);
  });
});

describe('SATICIDIBSATIRKOD — 702 zorunluluğu GEVŞETİLMEDİ', () => {
  it('yalnız SATICI verilirse validator hâlâ ALICIDIBSATIRKOD ister', () => {
    const mapped = mapSimpleToInvoiceInput(makeInput({ saticidibsatirkod: SATICI }));
    const codes = validateIhrackayitli702(mapped).map(e => e.code);

    expect(codes).toContain('IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD');
    // Whitelist ihlali YOK: SATICIDIBSATIRKOD kod listesinde geçerli bir schemeID
    expect(codes).not.toContain('IHRACKAYITLI_INVALID_SCHEME_ID');
  });

  it('ikisi birden verilirse hiç hata kalmaz', () => {
    const mapped = mapSimpleToInvoiceInput(
      makeInput({ alicidibsatirkod: ALICI, saticidibsatirkod: SATICI }),
    );
    expect(validateIhrackayitli702(mapped)).toEqual([]);
  });

  it('satıcı koduna UZUNLUK dayatılmaz (şematronda böyle bir şart YOK)', () => {
    const mapped = mapSimpleToInvoiceInput(
      makeInput({ alicidibsatirkod: ALICI, saticidibsatirkod: 'X' }),
    );
    expect(validateIhrackayitli702(mapped)).toEqual([]);
  });
});

describe('SATICIDIBSATIRKOD — SessionPaths / oturum yolu', () => {
  it('SessionPaths.lineDeliverySaticidibsatirkod doğru yolu üretir', () => {
    expect(SessionPaths.lineDeliverySaticidibsatirkod(0))
      .toBe('lines[0].delivery.saticidibsatirkod');
    expect(SessionPaths.lineDeliverySaticidibsatirkod(2))
      .toBe('lines[2].delivery.saticidibsatirkod');
  });

  it('oturumda update() ile yazılır ve XML\'e taşınır', () => {
    const session = new InvoiceSession({ initialInput: makeInput({ alicidibsatirkod: ALICI }) });
    session.update(SessionPaths.lineDeliverySaticidibsatirkod(0), SATICI);

    expect(session.input.lines[0].delivery?.saticidibsatirkod).toBe(SATICI);
    expect(schemeIdsOf(session.buildXml())).toEqual(['ALICIDIBSATIRKOD', 'SATICIDIBSATIRKOD']);
  });
});
