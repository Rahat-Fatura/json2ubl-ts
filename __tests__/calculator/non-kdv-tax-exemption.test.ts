/**
 * KDV dışı vergilerde istisna kodu: ÖTV (101–108, 151) ve konaklama vergisi (001).
 *
 * T-KOD-2 ilk turunda 101–108 ve 001 kütüphaneye eklendi, ama yalnız KDV alt
 * toplamına (0015) yazılabiliyordu: `kdvExemptionCode` tek giriş yoluydu ve
 * KDV seçicisi (`availableExemptions`) bu kodları da sunuyordu. Kullanıcı 301
 * yerine 101'i seçerse KDV alt toplamı ÖTV koduyla çıkıyordu.
 *
 * GİB pratiği: "fatura tipi olarak İSTİSNA seçilip ÖTV 0 geçilir ve ilgili ÖTV
 * istisna kodu seçilir" (gib-forum-bilgi e-fatura/25, bug 28107/26888).
 *
 * Kural:
 *   • kalem vergisine yeni isteğe bağlı `exemptionCode` alanı — ÖTV
 *     (0071, 0073–0077) %0 alt toplamında 101–108 ya da 151, konaklama vergisi
 *     (0059) %0 alt toplamında 001; kod o verginin belge ve satır alt toplamına
 *     yazılır;
 *   • ÖTV/konaklama kodu KDV alt toplamına yazılamaz (151 hariç: 5.2.0'dan beri
 *     KDV'de kabul ediliyordu, geriye uyum), KDV kodu ÖTV/konaklama alt
 *     toplamına yazılamaz;
 *   • `getAvailableExemptions(tip, vergiTürü)`: varsayılan (KDV) liste 5.2.0 ile
 *     aynı + 501; ÖTV ve konaklama kodları kendi türleriyle istenir.
 */

import { describe, it, expect } from 'vitest';
import { calculateDocument } from '../../src/calculator/document-calculator';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import { getAvailableExemptions } from '../../src/calculator/invoice-rules';
import { UblBuildError } from '../../src/errors/ubl-build-error';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';
import { probeValidator, validateLive } from '../support/validator';

function invoice(type: string, lines: SimpleLineInput[], kdvExemptionCode?: string): SimpleInvoiceInput {
  const input: SimpleInvoiceInput = {
    id: 'TST2026000000071',
    uuid: 'a1b2c3d4-0071-4000-8071-000000000071',
    datetime: '2026-04-23T14:00:00',
    profile: 'TEMELFATURA',
    type: type as SimpleInvoiceInput['type'],
    currencyCode: 'TRY',
    sender: {
      taxNumber: '1234567890', name: 'Sınır Tanımaz Ticaret A.Ş.', taxOffice: 'Üsküdar',
      address: 'Barbaros Bulvarı No:123', district: 'Üsküdar', city: 'İstanbul', zipCode: '34664',
    },
    customer: {
      taxNumber: '9876543210', name: 'Yeşil Alıcı Ltd. Şti.', taxOffice: 'Kadıköy',
      address: 'Bağdat Caddesi No:456', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710',
    },
    lines,
  };
  if (kdvExemptionCode) input.kdvExemptionCode = kdvExemptionCode;
  return input;
}

/** ÖTV istisnalı ihracat kalemi: KDV %0 (301) + ÖTV 0071 %0 (101). */
const otvExportLine = (otvCode = '101'): SimpleLineInput => ({
  name: 'Akaryakıt', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '301',
  taxes: [{ code: '0071', percent: 0, exemptionCode: otvCode }],
});

/** Diplomatik konaklama: KDV %0 (310) + konaklama vergisi 0059 %0 (001). */
const diplomaticStayLine = (): SimpleLineInput => ({
  name: 'Konaklama', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '310',
  taxes: [{ code: '0059', percent: 0, exemptionCode: '001' }],
});

/** XML'de `TaxTypeCode` verilen alt toplamların istisna kod/gerekçe ikilileri, sırasıyla. */
function exemptionsOf(xml: string, taxTypeCode: string): Array<[string | undefined, string | undefined]> {
  const out: Array<[string | undefined, string | undefined]> = [];
  for (const m of xml.matchAll(/<cac:TaxSubtotal>([\s\S]*?)<\/cac:TaxSubtotal>/g)) {
    const body = m[1];
    if (!body.includes(`<cbc:TaxTypeCode>${taxTypeCode}</cbc:TaxTypeCode>`)) continue;
    out.push([
      /<cbc:TaxExemptionReasonCode>([^<]*)</.exec(body)?.[1],
      /<cbc:TaxExemptionReason>([^<]*)</.exec(body)?.[1],
    ]);
  }
  return out;
}

function errorCodes(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    if (e instanceof UblBuildError) return e.errors.map(x => x.code);
    throw e;
  }
  return [];
}

const strict = (input: SimpleInvoiceInput) => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input).xml;

describe('ÖTV %0 alt toplamında ÖTV istisna kodu (101)', () => {
  it('hesap motoru kodu kalem ve belge ÖTV alt toplamında taşır', () => {
    const calc = calculateDocument(invoice('ISTISNA', [otvExportLine()]));
    const lineOtv = calc.calculatedLines[0].taxes.taxSubtotals.find(t => t.code === '0071');
    expect(lineOtv?.exemptionCode).toBe('101');
    const docOtv = calc.taxes.taxSubtotals.find(t => t.code === '0071');
    expect(docOtv?.exemptionCode).toBe('101');
  });

  it('katı kurulum: ÖTV alt toplamı 101 + adı, KDV alt toplamı 301 (belge ve satır)', () => {
    const xml = strict(invoice('ISTISNA', [otvExportLine()]));
    expect(exemptionsOf(xml, '0071')).toEqual([['101', 'İhracat İstisnası'], ['101', 'İhracat İstisnası']]);
    expect(exemptionsOf(xml, '0015').map(([c]) => c)).toEqual(['301', '301']);
  });

  it('farklı ÖTV istisna kodlu iki kalem belge özetinde ayrı alt toplam olur', () => {
    const xml = strict(invoice('ISTISNA', [otvExportLine('101'), otvExportLine('102')]));
    const doc = xml.slice(0, xml.indexOf('<cac:InvoiceLine>'));
    expect(exemptionsOf(doc, '0071').map(([c]) => c)).toEqual(['101', '102']);
  });

  it('151 (ÖTV — istisna olmayan diğer) SATIŞ\'ta ÖTV %0 alt toplamına yazılır', () => {
    const xml = strict(invoice('SATIS', [{
      name: 'Masa', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20,
      taxes: [{ code: '0074', percent: 0, exemptionCode: '151' }],
    }]));
    expect(exemptionsOf(xml, '0074').map(([c]) => c)).toEqual(['151', '151']);
  });

  it('oturum: SessionPaths.lineTaxExemptionCode ile alan yazılır', () => {
    const line = { ...otvExportLine(), taxes: [{ code: '0071', percent: 0 }] };
    const session = new InvoiceSession({ initialInput: invoice('ISTISNA', [line]), autoCalculate: true });
    session.update(SessionPaths.lineTaxExemptionCode(0, 0), '101');
    expect(exemptionsOf(session.buildXml({ validationLevel: 'strict' }), '0071').map(([c]) => c)).toEqual(['101', '101']);
  });

  it('oturum aynı XML\'i üretir', () => {
    const input = invoice('ISTISNA', [otvExportLine()]);
    const session = new InvoiceSession({ initialInput: input, autoCalculate: true });
    expect(session.buildXml({ validationLevel: 'strict' })).toBe(strict(invoice('ISTISNA', [otvExportLine()])));
  });
});

describe('konaklama vergisi %0 alt toplamında 001', () => {
  it('İSTİSNA: 0059 alt toplamı 001 + "Diplomatik İstisna", KDV alt toplamı 310', () => {
    const xml = strict(invoice('ISTISNA', [diplomaticStayLine()]));
    expect(exemptionsOf(xml, '0059')).toEqual([['001', 'Diplomatik İstisna'], ['001', 'Diplomatik İstisna']]);
    expect(exemptionsOf(xml, '0015').map(([c]) => c)).toEqual(['310', '310']);
  });

  it('KONAKLAMAVERGISI tipinde 001 reddedilir (şematron TaxExemptionReasonCodeCheck)', () => {
    const input = invoice('KONAKLAMAVERGISI', [{
      name: 'Konaklama', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
      taxes: [{ code: '0059', percent: 0, exemptionCode: '001' }],
    }]);
    expect(errorCodes(() => strict(input))).toContain('INVALID_EXEMPTION_FOR_TYPE');
  });
});

describe('kod ↔ vergi türü uyuşmazlığı reddedilir', () => {
  const cases: Array<{ label: string; input: () => SimpleInvoiceInput; code: string }> = [
    {
      label: 'ÖTV kodu (101) KDV alt toplamına',
      input: () => invoice('ISTISNA', [{ name: 'A', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '101' }]),
      code: 'EXEMPTION_TAX_TYPE_MISMATCH',
    },
    {
      label: 'konaklama kodu (001) KDV alt toplamına',
      input: () => invoice('ISTISNA', [{ name: 'A', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0 }], '001'),
      code: 'EXEMPTION_TAX_TYPE_MISMATCH',
    },
    {
      label: 'KDV kodu (301) ÖTV alt toplamına',
      input: () => invoice('ISTISNA', [otvExportLine('301')]),
      code: 'EXEMPTION_TAX_TYPE_MISMATCH',
    },
    {
      label: 'ÖTV kodu (101) konaklama alt toplamına',
      input: () => invoice('ISTISNA', [{ ...diplomaticStayLine(), taxes: [{ code: '0059', percent: 0, exemptionCode: '101' }] }]),
      code: 'EXEMPTION_TAX_TYPE_MISMATCH',
    },
    {
      label: 'konaklama kodu (001) ÖTV alt toplamına',
      input: () => invoice('ISTISNA', [otvExportLine('001')]),
      code: 'EXEMPTION_TAX_TYPE_MISMATCH',
    },
    {
      label: 'istisna kodu olmayan vergiye (damga 1047) kod',
      input: () => invoice('ISTISNA', [{ ...otvExportLine(), taxes: [{ code: '1047', percent: 0, exemptionCode: '101' }] }]),
      code: 'EXEMPTION_TAX_TYPE_MISMATCH',
    },
    {
      label: 'oranı 0 olmayan vergide istisna kodu',
      input: () => invoice('ISTISNA', [{ ...otvExportLine(), taxes: [{ code: '0071', percent: 10, exemptionCode: '101' }] }]),
      code: 'TAX_EXEMPTION_REQUIRES_ZERO_PERCENT',
    },
    {
      label: 'bilinmeyen kod',
      input: () => invoice('ISTISNA', [otvExportLine('999')]),
      code: 'UNKNOWN_EXEMPTION_CODE',
    },
    {
      label: 'ÖTV istisna kodu SATIŞ tipinde',
      input: () => invoice('SATIS', [{
        name: 'A', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20,
        taxes: [{ code: '0071', percent: 0, exemptionCode: '101' }],
      }]),
      code: 'INVALID_EXEMPTION_FOR_TYPE',
    },
  ];
  for (const c of cases) {
    it(`${c.label} → ${c.code} (katı, temel, oturum)`, () => {
      expect(errorCodes(() => strict(c.input()))).toContain(c.code);
      expect(errorCodes(() => new SimpleInvoiceBuilder({ validationLevel: 'basic' }).build(c.input()))).toContain(c.code);
      const warnings = new InvoiceSession({ initialInput: c.input(), autoCalculate: true }).validate();
      expect(warnings.map(w => w.code)).toContain(c.code);
    });
  }

  it('geriye uyum: 151 KDV alt toplamında 5.2.0\'daki gibi kabul edilir', () => {
    const xml = strict(invoice('SATIS', [{ name: 'A', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '151' }]));
    expect(exemptionsOf(xml, '0015').map(([c]) => c)).toEqual(['151', '151']);
  });
});

describe('getAvailableExemptions — vergi türüne göre', () => {
  const codes = (xs: Array<{ code: string }>) => xs.map(x => x.code);

  it('varsayılan KDV: KDV alt toplamında kabul edilen kodlar — ÖTV/konaklama kodu yok, 5.2.0 listeleri korunur', () => {
    for (const type of ['ISTISNA', 'SATIS', 'IHRACKAYITLI', 'OZELMATRAH', 'IADE', 'SGK', 'YTBISTISNA']) {
      const list = getAvailableExemptions(type);
      expect(list.length).toBeGreaterThan(0);
      expect(list.some(d => d.type === 'KONAKLAMA' || (d.type === 'OTV' && d.code !== '151'))).toBe(false);
      expect(getAvailableExemptions(type, 'KDV')).toEqual(list);
    }
    expect(codes(getAvailableExemptions('ISTISNA'))).toContain('301');
    expect(codes(getAvailableExemptions('ISTISNA'))).not.toContain('101');
    expect(codes(getAvailableExemptions('ISTISNA'))).not.toContain('001');
    // 151 ve SGK sembolik kodları KDV alt toplamında 5.2.0'daki gibi kabul edilir → seçicide kalır.
    expect(codes(getAvailableExemptions('SATIS'))).toContain('151');
    expect(codes(getAvailableExemptions('SGK'))).toContain('SAGLIK_ECZ');
  });

  it('ÖTV: İSTİSNA\'da 101–108, SATIŞ\'ta 151', () => {
    expect(codes(getAvailableExemptions('ISTISNA', 'OTV'))).toEqual(['101', '102', '103', '104', '105', '106', '107', '108']);
    expect(codes(getAvailableExemptions('SATIS', 'OTV'))).toEqual(['151']);
  });

  it('konaklama: İSTİSNA\'da 001, KONAKLAMAVERGISI\'nde yok', () => {
    expect(codes(getAvailableExemptions('ISTISNA', 'KONAKLAMA'))).toEqual(['001']);
    expect(getAvailableExemptions('KONAKLAMAVERGISI', 'KONAKLAMA')).toEqual([]);
  });

  it('SGK açık süzgeci yalnız sembolik kodları döndürür: getAvailableExemptions("SGK", "SGK")', () => {
    expect(codes(getAvailableExemptions('SGK', 'SGK'))).toEqual(
      ['SAGLIK_ECZ', 'SAGLIK_HAS', 'SAGLIK_OPT', 'SAGLIK_MED', 'ABONELIK', 'MAL_HIZMET', 'DIGER'],
    );
  });

  it('oturum: uiState.availableExemptions KDV listesi, getAvailableExemptions(vergiTürü) süzer', () => {
    const session = new InvoiceSession({ initialInput: invoice('ISTISNA', [otvExportLine()]) });
    expect(session.uiState.availableExemptions).toEqual(getAvailableExemptions('ISTISNA'));
    expect(session.getAvailableExemptions('OTV')).toEqual(getAvailableExemptions('ISTISNA', 'OTV'));
  });
});

// ─── Canlı GİB şematronu (24.08.2026) ─────────────────────────────────────────

const validator = await probeValidator();
const liveIt = it.skipIf(!validator.up);

describe('canlı GİB şematronu', () => {
  liveIt('İSTİSNA + KDV %0 (301) + ÖTV 0071 %0 (101) geçer', async () => {
    const result = await validateLive(strict(invoice('ISTISNA', [otvExportLine()])), 'efatura');
    expect(result.schematronValidationErrors ?? []).toEqual([]);
    expect(result.validSchematron).toBe(true);
  });

  liveIt('İSTİSNA + KDV %0 (310) + konaklama 0059 %0 (001) geçer', async () => {
    const result = await validateLive(strict(invoice('ISTISNA', [diplomaticStayLine()])), 'efatura');
    expect(result.schematronValidationErrors ?? []).toEqual([]);
    expect(result.validSchematron).toBe(true);
  });

  liveIt('KONAKLAMAVERGISI + 0059 %0 (001): şematron "Uyumsuz fatura tipi" ile reddeder', async () => {
    const input = invoice('KONAKLAMAVERGISI', [{
      name: 'Konaklama', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
      taxes: [{ code: '0059', percent: 0, exemptionCode: '001' }],
    }]);
    const xml = new SimpleInvoiceBuilder({ validationLevel: 'none' }).build(input).xml;
    const result = await validateLive(xml, 'efatura');
    expect(result.validSchematron).toBe(false);
    const messages = (result.schematronValidationErrors ?? []).map(e => e.message);
    expect(messages.some(m => m.includes("Uyumsuz fatura tipi: 'KONAKLAMAVERGISI'") && m.includes("'001'"))).toBe(true);
  });
});
