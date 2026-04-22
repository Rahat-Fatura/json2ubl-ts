import { describe, it, expect } from 'vitest';
import { emitInOrder, PERSON_SEQ, TAX_CATEGORY_SEQ } from '../../src/serializers/xsd-sequence';

describe('emitInOrder (xsd-sequence)', () => {
  it('seq sırasında emit fonksiyonlarını çağırır', () => {
    const out = emitInOrder(PERSON_SEQ, {
      FirstName: () => '<cbc:FirstName>Ali</cbc:FirstName>',
      FamilyName: () => '<cbc:FamilyName>Yılmaz</cbc:FamilyName>',
      NationalityID: () => '<cbc:NationalityID>TR</cbc:NationalityID>',
    });
    expect(out).toEqual([
      '<cbc:FirstName>Ali</cbc:FirstName>',
      '<cbc:FamilyName>Yılmaz</cbc:FamilyName>',
      '<cbc:NationalityID>TR</cbc:NationalityID>',
    ]);
  });

  it('sırada olmayan field atlanır (emitter map içinde bile olsa seq dışı key işlenmez)', () => {
    // @ts-expect-error: "UnknownField" PERSON_SEQ'te yok
    const out = emitInOrder(PERSON_SEQ, {
      FirstName: () => '<cbc:FirstName>Ali</cbc:FirstName>',
      UnknownField: () => '<cbc:Unknown/>',
    });
    expect(out).toEqual(['<cbc:FirstName>Ali</cbc:FirstName>']);
  });

  it("emitter '' dönerse atlanır (skip)", () => {
    const out = emitInOrder(PERSON_SEQ, {
      FirstName: () => '<cbc:FirstName>Ali</cbc:FirstName>',
      MiddleName: () => '',
      FamilyName: () => '<cbc:FamilyName>Y</cbc:FamilyName>',
    });
    expect(out).toEqual([
      '<cbc:FirstName>Ali</cbc:FirstName>',
      '<cbc:FamilyName>Y</cbc:FamilyName>',
    ]);
  });

  it('emitter tanımlı değilse field atlanır', () => {
    const out = emitInOrder(TAX_CATEGORY_SEQ, {
      TaxExemptionReasonCode: () => '<cbc:TaxExemptionReasonCode>301</cbc:TaxExemptionReasonCode>',
      TaxScheme: () => '<cac:TaxScheme/>',
    });
    expect(out).toEqual([
      '<cbc:TaxExemptionReasonCode>301</cbc:TaxExemptionReasonCode>',
      '<cac:TaxScheme/>',
    ]);
  });

  it('hepsi boş ise boş array döner', () => {
    const out = emitInOrder(PERSON_SEQ, {
      FirstName: () => '',
      FamilyName: () => '',
    });
    expect(out).toEqual([]);
  });

  it('emitter throw ederse hata propagate olur', () => {
    expect(() =>
      emitInOrder(PERSON_SEQ, {
        FirstName: () => {
          throw new Error('required missing');
        },
      }),
    ).toThrow('required missing');
  });
});
