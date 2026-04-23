import { describe, it, expect } from 'vitest';
import { serializeAddress } from '../../src/serializers/delivery-serializer';
import type { AddressInput } from '../../src/types/common';

function baseAddress(): AddressInput {
  return {
    citySubdivisionName: 'Çankaya',
    cityName: 'Ankara',
    postalZone: '06100',
  };
}

describe('Address — B-98 BlockName/District/Postbox emit', () => {
  it('blockName emit edilir (ADDRESS_SEQ: StreetName < BlockName < BuildingName)', () => {
    const addr: AddressInput = { ...baseAddress(), streetName: 'Atatürk Cad.', blockName: 'A Blok', buildingName: 'Ofis Kompleksi' };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    expect(xml).toContain('<cbc:BlockName>A Blok</cbc:BlockName>');
    const streetIdx = xml.indexOf('<cbc:StreetName>');
    const blockIdx = xml.indexOf('<cbc:BlockName>');
    const buildingIdx = xml.indexOf('<cbc:BuildingName>');
    expect(streetIdx).toBeLessThan(blockIdx);
    expect(blockIdx).toBeLessThan(buildingIdx);
  });

  it('postbox emit edilir (ADDRESS_SEQ en başta)', () => {
    const addr: AddressInput = { ...baseAddress(), postbox: 'PK 42', streetName: 'Atatürk Cad.' };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    expect(xml).toContain('<cbc:Postbox>PK 42</cbc:Postbox>');
    const postboxIdx = xml.indexOf('<cbc:Postbox>');
    const streetIdx = xml.indexOf('<cbc:StreetName>');
    expect(postboxIdx).toBeLessThan(streetIdx);
  });

  it('district emit edilir (ADDRESS_SEQ: Region < District < Country)', () => {
    const addr: AddressInput = { ...baseAddress(), region: 'İç Anadolu', district: 'Kızılay', country: 'Türkiye' };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    expect(xml).toContain('<cbc:District>Kızılay</cbc:District>');
    const regionIdx = xml.indexOf('<cbc:Region>');
    const districtIdx = xml.indexOf('<cbc:District>');
    const countryIdx = xml.indexOf('<cac:Country>');
    expect(regionIdx).toBeLessThan(districtIdx);
    expect(districtIdx).toBeLessThan(countryIdx);
  });

  it('hiçbir yeni alan verilmezse baseline korunur', () => {
    const addr: AddressInput = { ...baseAddress(), country: 'Türkiye' };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    expect(xml).not.toContain('<cbc:BlockName>');
    expect(xml).not.toContain('<cbc:Postbox>');
    expect(xml).not.toContain('<cbc:District>');
  });
});

describe('Address — B-100 Country IdentificationCode + Name', () => {
  it('countryCode sadece IdentificationCode emit eder', () => {
    const addr: AddressInput = { ...baseAddress(), countryCode: 'TR' };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    expect(xml).toContain('<cac:Country>');
    expect(xml).toContain('<cbc:IdentificationCode>TR</cbc:IdentificationCode>');
    expect(xml).not.toContain('<cbc:Name>');
  });

  it('countryCode + country her ikisi emit edilir (XSD sırası: IdentificationCode < Name)', () => {
    const addr: AddressInput = { ...baseAddress(), countryCode: 'DE', country: 'Almanya' };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    const idIdx = xml.indexOf('<cbc:IdentificationCode>');
    const nameIdx = xml.indexOf('<cbc:Name>Almanya</cbc:Name>');
    expect(idIdx).toBeGreaterThan(-1);
    expect(nameIdx).toBeGreaterThan(-1);
    expect(idIdx).toBeLessThan(nameIdx);
  });

  it('sadece country string verilirse eski davranış (Name only)', () => {
    const addr: AddressInput = { ...baseAddress(), country: 'Türkiye' };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    expect(xml).toContain('<cac:Country>');
    expect(xml).toContain('<cbc:Name>Türkiye</cbc:Name>');
    expect(xml).not.toContain('<cbc:IdentificationCode>');
  });

  it('ikisi de yoksa cac:Country hiç emit edilmez', () => {
    const addr: AddressInput = { ...baseAddress() };
    const xml = serializeAddress(addr, 'DeliveryAddress');
    expect(xml).not.toContain('<cac:Country>');
  });
});
