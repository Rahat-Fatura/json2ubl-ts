import { describe, it, expect } from 'vitest';
import {
  serializeBuyerCustomerParty,
  serializeTaxRepresentativeParty,
} from '../../src/serializers/party-serializer';
import type { BuyerCustomerInput, TaxRepresentativeInput } from '../../src/types/common';

describe('serializeBuyerCustomerParty — B-36 PostalAddress + PartyTaxScheme + Contact', () => {
  it('PostalAddress emit edilir', () => {
    const buyer: BuyerCustomerInput = {
      partyType: 'EXPORT',
      party: {
        vknTckn: '1234567890',
        taxIdType: 'VKN',
        name: 'Alıcı Firma',
        citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul',
        country: 'Türkiye',
      },
    };
    const xml = serializeBuyerCustomerParty(buyer);
    expect(xml).toContain('<cac:PostalAddress>');
    expect(xml).toContain('<cbc:CityName>İstanbul</cbc:CityName>');
    expect(xml).toContain('<cac:Country>');
  });

  it('PartyTaxScheme emit edilir (taxOffice varsa)', () => {
    const buyer: BuyerCustomerInput = {
      partyType: 'EXPORT',
      party: {
        vknTckn: '1234567890',
        taxIdType: 'VKN',
        name: 'Alıcı',
        taxOffice: 'Kadıköy V.D.',
        citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul',
      },
    };
    const xml = serializeBuyerCustomerParty(buyer);
    expect(xml).toContain('<cac:PartyTaxScheme>');
    expect(xml).toContain('<cbc:Name>Kadıköy V.D.</cbc:Name>');
  });

  it('Contact emit edilir (telephone/email varsa)', () => {
    const buyer: BuyerCustomerInput = {
      partyType: 'EXPORT',
      party: {
        vknTckn: '1234567890',
        taxIdType: 'VKN',
        name: 'Alıcı',
        telephone: '+90 212 555 0000',
        email: 'info@test.com',
        citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul',
      },
    };
    const xml = serializeBuyerCustomerParty(buyer);
    expect(xml).toContain('<cac:Contact>');
    expect(xml).toContain('<cbc:Telephone>+90 212 555 0000</cbc:Telephone>');
    expect(xml).toContain('<cbc:ElectronicMail>info@test.com</cbc:ElectronicMail>');
  });

  it('alt alanlar yoksa baseline korunur (sadece zorunlu emit)', () => {
    const buyer: BuyerCustomerInput = {
      partyType: 'EXPORT',
      party: {
        vknTckn: '1234567890',
        taxIdType: 'VKN',
        name: 'Alıcı',
      },
    };
    const xml = serializeBuyerCustomerParty(buyer);
    expect(xml).toContain('<cac:PartyName>');
    expect(xml).not.toContain('<cac:PostalAddress>');
    expect(xml).not.toContain('<cac:PartyTaxScheme>');
    expect(xml).not.toContain('<cac:Contact>');
  });
});

describe('serializeTaxRepresentativeParty — B-37 PartyName + PostalAddress', () => {
  it('PartyName emit edilir (name varsa)', () => {
    const trp: TaxRepresentativeInput = {
      intermediaryVknTckn: '1234567890',
      intermediaryLabel: 'ARACIKURUM',
      name: 'Aracı Kurum A.Ş.',
    };
    const xml = serializeTaxRepresentativeParty(trp);
    expect(xml).toContain('<cac:PartyName>');
    expect(xml).toContain('<cbc:Name>Aracı Kurum A.Ş.</cbc:Name>');
  });

  it('PostalAddress emit edilir (postalAddress varsa)', () => {
    const trp: TaxRepresentativeInput = {
      intermediaryVknTckn: '1234567890',
      intermediaryLabel: 'ARACIKURUM',
      name: 'Aracı',
      postalAddress: {
        citySubdivisionName: 'Beşiktaş',
        cityName: 'İstanbul',
        postalZone: '34000',
        country: 'Türkiye',
      },
    };
    const xml = serializeTaxRepresentativeParty(trp);
    expect(xml).toContain('<cac:PostalAddress>');
    expect(xml).toContain('<cbc:CityName>İstanbul</cbc:CityName>');
    expect(xml).toContain('<cac:Country>');
  });

  it('sadece eski alanlar verilirse baseline korunur (name + adres yok)', () => {
    const trp: TaxRepresentativeInput = {
      intermediaryVknTckn: '1234567890',
      intermediaryLabel: 'ARACIKURUM',
    };
    const xml = serializeTaxRepresentativeParty(trp);
    expect(xml).toContain('<cac:PartyIdentification>');
    expect(xml).not.toContain('<cac:PartyName>');
    expect(xml).not.toContain('<cac:PostalAddress>');
  });
});
