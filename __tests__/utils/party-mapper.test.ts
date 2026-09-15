/**
 * Ortak taraf eşleyicisi testleri.
 *
 * Fonksiyon fatura mapper'ından ÇIKARILDI; buradaki iddiaların hepsi eskiden
 * `simple-invoice-mapper.ts` içinde yaşayan davranışın AYNISIDIR. Amaç: ders
 * (posta kodu uydurulmaz · VKN/TCKN ad yerleşimi) tip başına yeniden
 * kaybedilmesin diye ortak katmanı kendi başına çıpalamak.
 */

import { describe, it, expect } from 'vitest';
import { mapSimpleParty, splitPersonName } from '../../src/utils/party-mapper';
import type { SimplePartyInput } from '../../src/calculator/simple-types';

function party(overrides: Partial<SimplePartyInput> = {}): SimplePartyInput {
  return {
    taxNumber: '1234567890',
    name: 'Örnek Firma A.Ş.',
    address: 'Barbaros Bulvarı No:1',
    district: 'Üsküdar',
    city: 'İstanbul',
    ...overrides,
  };
}

describe('splitPersonName', () => {
  it('son kelimeyi soyad, kalanını ad sayar', () => {
    expect(splitPersonName('Ayşe Nur Yılmaz')).toEqual({
      firstName: 'Ayşe Nur',
      familyName: 'Yılmaz',
    });
  });

  it('tek kelimelik adda soyadı "." yazar (GİB XSD FamilyName zorunlu)', () => {
    expect(splitPersonName('Madonna')).toEqual({ firstName: 'Madonna', familyName: '.' });
  });

  it('baş/son boşlukları kelime sayımını bozmaz', () => {
    expect(splitPersonName('  Ali  Veli  ')).toEqual({ firstName: 'Ali', familyName: 'Veli' });
  });
});

describe('mapSimpleParty', () => {
  it('VKN tarafında adı cbc:PartyName alanına yazar', () => {
    const result = mapSimpleParty(party());
    expect(result.taxIdType).toBe('VKN');
    expect(result.name).toBe('Örnek Firma A.Ş.');
    expect(result.firstName).toBeUndefined();
    expect(result.familyName).toBeUndefined();
  });

  it('TCKN tarafında adı firstName/familyName ikilisine böler', () => {
    const result = mapSimpleParty(party({ taxNumber: '12345678901', name: 'Ali Veli' }));
    expect(result.taxIdType).toBe('TCKN');
    expect(result.name).toBeUndefined();
    expect(result.firstName).toBe('Ali');
    expect(result.familyName).toBe('Veli');
  });

  it('🔴 POSTA KODU UYDURULMAZ — verilmezse alan undefined kalır', () => {
    // Eskiden `'00000'` yazılıyordu; `00000` geçerli bir TR posta kodu DEĞİL ve
    // VUK 227/3 belgedeki verinin gerçeği yansıtmasını arar.
    const result = mapSimpleParty(party({ zipCode: undefined }));
    expect(result.postalZone).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('00000');
  });

  it('verilen posta kodunu aynen taşır', () => {
    expect(mapSimpleParty(party({ zipCode: '34664' })).postalZone).toBe('34664');
  });

  it('ülke verilmezse "Türkiye" varsayar', () => {
    expect(mapSimpleParty(party()).country).toBe('Türkiye');
    expect(mapSimpleParty(party({ country: 'Almanya' })).country).toBe('Almanya');
  });

  it('🔴 11 KARAKTER ≠ TCKN — harf içeren yabancı vergi numarası VKN sayılır', () => {
    // 4.5.5 dersi: `"DE123456789"` tam 11 karakterdir; uzunluk kuralı onu gerçek
    // kişi sanıp `cac:Person` düğümü açtırıyor ve GİB belgeyi reddediyordu.
    const result = mapSimpleParty(party({ taxNumber: 'DE123456789', name: 'Muster GmbH' }));
    expect(result.taxIdType).toBe('VKN');
    expect(result.name).toBe('Muster GmbH');
    expect(result.firstName).toBeUndefined();
  });

  it('ek taraf kimliklerini taşır', () => {
    const result = mapSimpleParty(party({
      identifications: [{ schemeId: 'MERSISNO', value: '0123456789012345' }],
    }));
    expect(result.additionalIdentifiers).toEqual([
      { schemeId: 'MERSISNO', value: '0123456789012345' },
    ]);
  });

  it('kimlik verilmezse additionalIdentifiers alanı hiç açılmaz', () => {
    expect(mapSimpleParty(party()).additionalIdentifiers).toBeUndefined();
    expect(mapSimpleParty(party({ identifications: [] })).additionalIdentifiers).toBeUndefined();
  });
});
