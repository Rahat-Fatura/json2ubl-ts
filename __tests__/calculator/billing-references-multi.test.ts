/**
 * ÇOKLU İADE REFERANSI (4.5.5).
 *
 * GİB bir iade faturasında BİRDEN ÇOK `cac:BillingReference` bulunmasına izin
 * verir — ölçüldü, tahmin değil:
 *
 *   • XSD  `UBL-Invoice-2.1.xsd`:
 *       <xsd:element ref="cac:BillingReference" minOccurs="0" maxOccurs="unbounded"/>
 *     `BillingReferenceType` içinde `cac:InvoiceDocumentReference` ise 0..1 →
 *     doğru şekil "N adet BillingReference, her birinde TEK referans".
 *
 *   • Şematron `IADEInvioceCheck` (UBL-TR_Common_Schematron.xml) SAYI değil ORAN
 *     denetler:
 *       count(... [DocumentTypeCode='IADE' ve 16 haneli ID]) = count(... hepsi)
 *     yani çoğul serbesttir, tek şart HER referansın kurala uymasıdır.
 *
 * Geriye uyum: tekil `billingReference` alanı KORUNUR ve `billingReferences`
 * verilmediğinde aynen eskisi gibi işlenir.
 */

import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder, InvoiceSession, SessionPaths } from '../../src';
import { resolveBillingReferences, billingReferencePath } from '../../src/calculator/simple-types';
import { validateProfileRequirements } from '../../src/validators/profile-requirement-validator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const SENDER = {
  taxNumber: '1234567890',
  name: 'Sınır Tanımaz Ticaret A.Ş.',
  taxOffice: 'Üsküdar',
  address: 'Barbaros Bulvarı No:123',
  district: 'Üsküdar',
  city: 'İstanbul',
};
const CUSTOMER = {
  taxNumber: '9876543210',
  name: 'Yeşil Alıcı Ltd. Şti.',
  taxOffice: 'Kadıköy',
  address: 'Bağdat Caddesi No:456',
  district: 'Kadıköy',
  city: 'İstanbul',
};

function iade(extra: Partial<SimpleInvoiceInput>): SimpleInvoiceInput {
  return {
    id: 'IAD2026000000001',
    uuid: 'b0000000-0001-4000-8001-000000000001',
    datetime: '2026-04-23T10:00:00',
    profile: 'TEMELFATURA',
    type: 'IADE',
    currencyCode: 'TRY',
    sender: { ...SENDER },
    customer: { ...CUSTOMER },
    lines: [{ name: 'İade Edilen Ürün', quantity: 2, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
    ...extra,
  } as SimpleInvoiceInput;
}

function buildXml(input: SimpleInvoiceInput): string {
  return new SimpleInvoiceBuilder({ prettyPrint: true, validationLevel: 'strict' }).build(input).xml;
}

/** Belgedeki tüm `cac:BillingReference/…/cbc:ID` değerleri, XML sırasıyla. */
function referansIdleri(xml: string): string[] {
  const bloklar = xml.match(/<cac:BillingReference>[\s\S]*?<\/cac:BillingReference>/g) ?? [];
  return bloklar.map(b => /<cbc:ID>([^<]*)<\/cbc:ID>/.exec(b)?.[1] ?? '');
}

const REF_A = { id: 'ABC2026000000001', issueDate: '2026-03-01' };
const REF_B = { id: 'XYZ2026000000009', issueDate: '2026-03-15' };

// ─── 1. Çoğul alan → çoklu BillingReference ─────────────────────────────────

describe('billingReferences — çoğul alan', () => {
  it('iki referans → XML iki ayrı cac:BillingReference taşır (sıra korunur)', () => {
    const xml = buildXml(iade({ billingReferences: [REF_A, REF_B] }));
    expect(referansIdleri(xml)).toEqual([REF_A.id, REF_B.id]);
  });

  it('DocumentTypeCode varsayılanı HER referansa uygulanır (IADEInvioceCheck)', () => {
    const xml = buildXml(iade({ billingReferences: [REF_A, REF_B] }));
    const kodlar = xml.match(/<cbc:DocumentTypeCode>IADE<\/cbc:DocumentTypeCode>/g) ?? [];
    expect(kodlar).toHaveLength(2);
  });

  /* IADE dışı tiplerde kod SERBEST metindir (şematron kısıtlamaz); mapper her
   * referansın kendi değerini AYRI taşımalıdır — tek bir referanstan okuyup
   * hepsine yaymamalıdır. */
  it('kullanıcının verdiği kod referans başına bağımsız taşınır', () => {
    const xml = buildXml(
      iade({
        type: 'SATIS',
        billingReferences: [
          { ...REF_A, documentTypeCode: 'SIPARIS' },
          { ...REF_B, documentTypeCode: 'ELDEN' },
        ],
      }),
    );
    expect(xml).toContain('<cbc:DocumentTypeCode>SIPARIS</cbc:DocumentTypeCode>');
    expect(xml).toContain('<cbc:DocumentTypeCode>ELDEN</cbc:DocumentTypeCode>');
  });

  /* B-31 (silent-override yasağı) çoğulda da referans BAŞINA işler: ikinci
   * referansın yanlış kodu, indeksi ile birlikte raporlanır. */
  it('IADE grubunda yanlış kod referans indeksiyle reddedilir', () => {
    let yakalanan: { path?: string; message: string }[] = [];
    try {
      buildXml(iade({ billingReferences: [REF_A, { ...REF_B, documentTypeCode: 'ELDEN' }] }));
    } catch (e) {
      yakalanan = (e as { errors: { path?: string; message: string }[] }).errors;
    }
    expect(yakalanan).toHaveLength(1);
    expect(yakalanan[0].path).toBe('billingReferences[1].invoiceDocumentReference.documentTypeCode');
  });

  it('üç referans da yazılabilir (üst sınır yok)', () => {
    const xml = buildXml(
      iade({ billingReferences: [REF_A, REF_B, { id: 'QWE2026000000123', issueDate: '2026-03-20' }] }),
    );
    expect(referansIdleri(xml)).toHaveLength(3);
  });
});

// ─── 2. GERİYE UYUM — tekil alan bozulmadı ──────────────────────────────────

describe('billingReference — tekil alan (geriye uyum)', () => {
  it('tekil alan tek başına aynen çalışır', () => {
    const xml = buildXml(iade({ billingReference: REF_A }));
    expect(referansIdleri(xml)).toEqual([REF_A.id]);
    expect(xml).toContain('<cbc:DocumentTypeCode>IADE</cbc:DocumentTypeCode>');
  });

  /* 🔒 ÇIPA: tekil girdi ile üretilen XML, aynı referansın çoğul alandan
   * verildiği XML ile BİREBİR aynı olmalıdır. Aksi hâlde "çoğula açtık ama
   * tekil yolu sessizce değişti" regresyonu görünmez kalırdı. */
  it('tekil ↔ tek elemanlı çoğul BİREBİR aynı XML üretir', () => {
    expect(buildXml(iade({ billingReference: REF_A }))).toBe(
      buildXml(iade({ billingReferences: [REF_A] })),
    );
  });

  it('hiç referans yoksa belgede cac:BillingReference bulunmaz', () => {
    expect(referansIdleri(buildXml(iade({ type: 'SATIS' })))).toEqual([]);
  });
});

// ─── 3. Öncelik kuralı ──────────────────────────────────────────────────────

describe('resolveBillingReferences — öncelik', () => {
  it('çoğul doluysa tekil YOK SAYILIR', () => {
    const input = iade({ billingReference: REF_A, billingReferences: [REF_B] });
    expect(resolveBillingReferences(input)).toEqual([REF_B]);
    expect(referansIdleri(buildXml(input))).toEqual([REF_B.id]);
  });

  it('çoğul BOŞ dizi ise tekile düşülür (eski çağıran bozulmaz)', () => {
    const input = iade({ billingReference: REF_A, billingReferences: [] });
    expect(resolveBillingReferences(input)).toEqual([REF_A]);
    expect(referansIdleri(buildXml(input))).toEqual([REF_A.id]);
  });

  it('hiçbiri yoksa boş liste', () => {
    expect(resolveBillingReferences(iade({}))).toEqual([]);
  });
});

// ─── 4. SessionPaths / update / unset ───────────────────────────────────────

describe('SessionPaths — çoğul adresleme', () => {
  it('tekil anahtarlar KORUNDU (portal bugün bunları kullanıyor)', () => {
    expect(SessionPaths.billingReferenceId).toBe('billingReference.id');
    expect(SessionPaths.billingReferenceIssueDate).toBe('billingReference.issueDate');
    expect(SessionPaths.billingReferenceDocumentTypeCode).toBe('billingReference.documentTypeCode');
  });

  it('çoğul anahtarlar indeksli yol üretir', () => {
    expect(SessionPaths.billingReferencesId(0)).toBe('billingReferences[0].id');
    expect(SessionPaths.billingReferencesIssueDate(1)).toBe('billingReferences[1].issueDate');
    expect(SessionPaths.billingReferencesDocumentTypeCode(2)).toBe(
      'billingReferences[2].documentTypeCode',
    );
  });

  it('update() ile iki referans kurulur ve XML çoğul çıkar', () => {
    const session = new InvoiceSession({ initialInput: iade({}) } as never);
    session.update(SessionPaths.billingReferencesId(0), REF_A.id);
    session.update(SessionPaths.billingReferencesIssueDate(0), REF_A.issueDate);
    session.update(SessionPaths.billingReferencesId(1), REF_B.id);
    session.update(SessionPaths.billingReferencesIssueDate(1), REF_B.issueDate);

    expect(session.input.billingReferences).toHaveLength(2);
    expect(referansIdleri(session.buildXml({ validationLevel: 'none' } as never))).toEqual([
      REF_A.id,
      REF_B.id,
    ]);
  });

  it("unset('billingReferences') diziyi temizler, tekil alana DOKUNMAZ", () => {
    const session = new InvoiceSession({
      initialInput: iade({ billingReference: REF_A, billingReferences: [REF_B] }),
    } as never);
    session.unset('billingReferences');
    expect(session.input.billingReferences).toBeUndefined();
    expect(session.input.billingReference).toEqual(REF_A);
  });

  /* Referans YOKKEN "iade referansı zorunludur" uyarısı çıkmalı; çoğul alandan
   * doldurulunca SUSMALI (uyarı kaynağı tekil alana bakıyordu — 4.5.5'te
   * etkin listeye çevrildi). */
  it('zorunluluk uyarısı çoğul alandan da susturulur', () => {
    const bos = new InvoiceSession({ initialInput: iade({}) } as never);
    const uyariVar = (s: InvoiceSession): boolean =>
      s.warnings.some(w => w.field === 'billingReference');
    expect(uyariVar(bos)).toBe(true);

    const dolu = new InvoiceSession({
      initialInput: iade({ billingReferences: [REF_A] }),
    } as never);
    expect(uyariVar(dolu)).toBe(false);
  });
});

// ─── 5. Doğrulayıcı — her referans ayrı denetlenir ──────────────────────────

describe('profile-requirement — çoklu referans deseni', () => {
  const hatalar = (input: SimpleInvoiceInput) =>
    validateProfileRequirements(input).filter(e => e.code === 'INVALID_FORMAT');

  it('ikinci referans bozuksa YALNIZ o raporlanır, yolu indekslidir', () => {
    const hs = hatalar(iade({ billingReferences: [REF_A, { id: 'KISA123', issueDate: '2026-03-15' }] }));
    expect(hs).toHaveLength(1);
    expect(hs[0].path).toBe('billingReferences[1].id');
  });

  it('iki bozuk referans → iki hata', () => {
    const hs = hatalar(
      iade({
        billingReferences: [
          { id: 'KISA1', issueDate: '2026-03-01' },
          { id: 'abc-2026-0001', issueDate: '2026-03-15' },
        ],
      }),
    );
    expect(hs.map(e => e.path)).toEqual(['billingReferences[0].id', 'billingReferences[1].id']);
  });

  it('TEKİL kullanımda hata yolu eskisi gibi billingReference.id kalır', () => {
    const hs = hatalar(iade({ billingReference: { id: 'KISA123', issueDate: '2026-03-01' } }));
    expect(hs).toHaveLength(1);
    expect(hs[0].path).toBe('billingReference.id');
  });

  it('billingReferencePath etkin alana göre yol üretir', () => {
    expect(billingReferencePath(iade({ billingReference: REF_A }), 0, 'id')).toBe(
      'billingReference.id',
    );
    expect(billingReferencePath(iade({ billingReferences: [REF_A, REF_B] }), 1, 'id')).toBe(
      'billingReferences[1].id',
    );
  });
});
