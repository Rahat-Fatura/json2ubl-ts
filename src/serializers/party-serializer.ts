import type { PartyInput, BuyerCustomerInput, TaxRepresentativeInput, SignatureInput } from '../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { ADDRESS_SEQ, PERSON_SEQ, emitInOrder } from './xsd-sequence';

/** Party → XML fragment (cac:Party içeriği) */
export function serializeParty(party: PartyInput, indent: string = ''): string {
  const i = indent;
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';
  const lines: string[] = [];

  lines.push(`${i}<cac:Party>`);

  // WebsiteURI
  if (isNonEmpty(party.websiteUri)) {
    lines.push(`${i2}${cbcOptionalTag('WebsiteURI', party.websiteUri)}`);
  }

  // PartyIdentification (VKN/TCKN + ek tanımlayıcılar)
  lines.push(`${i2}<cac:PartyIdentification>`);
  lines.push(`${i3}${cbcOptionalTag('ID', party.vknTckn, { schemeID: party.taxIdType })}`);
  lines.push(`${i2}</cac:PartyIdentification>`);

  if (party.additionalIdentifiers) {
    for (const aid of party.additionalIdentifiers) {
      lines.push(`${i2}<cac:PartyIdentification>`);
      lines.push(`${i3}${cbcOptionalTag('ID', aid.value, { schemeID: aid.schemeId })}`);
      lines.push(`${i2}</cac:PartyIdentification>`);
    }
  }

  // PartyName (VKN ise)
  if (isNonEmpty(party.name)) {
    lines.push(`${i2}<cac:PartyName>`);
    lines.push(`${i3}${cbcOptionalTag('Name', party.name)}`);
    lines.push(`${i2}</cac:PartyName>`);
  }

  // PostalAddress
  lines.push(...serializePostalAddress(party, i2));

  // PartyTaxScheme
  if (isNonEmpty(party.taxOffice)) {
    lines.push(`${i2}<cac:PartyTaxScheme>`);
    lines.push(`${i3}<cac:TaxScheme>`);
    lines.push(`${i4}${cbcOptionalTag('Name', party.taxOffice)}`);
    lines.push(`${i3}</cac:TaxScheme>`);
    lines.push(`${i2}</cac:PartyTaxScheme>`);
  }

  // PartyLegalEntity
  if (isNonEmpty(party.registrationName)) {
    lines.push(`${i2}<cac:PartyLegalEntity>`);
    lines.push(`${i3}${cbcOptionalTag('RegistrationName', party.registrationName)}`);
    lines.push(`${i2}</cac:PartyLegalEntity>`);
  }

  // Contact
  if (isNonEmpty(party.telephone) || isNonEmpty(party.telefax) || isNonEmpty(party.email)) {
    lines.push(`${i2}<cac:Contact>`);
    if (isNonEmpty(party.telephone)) lines.push(`${i3}${cbcOptionalTag('Telephone', party.telephone)}`);
    if (isNonEmpty(party.telefax)) lines.push(`${i3}${cbcOptionalTag('Telefax', party.telefax)}`);
    if (isNonEmpty(party.email)) lines.push(`${i3}${cbcOptionalTag('ElectronicMail', party.email)}`);
    lines.push(`${i2}</cac:Contact>`);
  }

  // Person (TCKN ise) — B-20 fix: PERSON_SEQ (FirstName → FamilyName → Title → MiddleName → NameSuffix → NationalityID)
  if (party.taxIdType === 'TCKN') {
    lines.push(serializePersonBlock(
      {
        firstName: party.firstName,
        familyName: party.familyName,
        middleName: party.middleName,
        nationalityId: party.nationalityId,
        passportId: party.passportId,
      },
      i2,
    ));
  }

  lines.push(`${i}</cac:Party>`);
  return joinLines(lines);
}

/**
 * PostalAddress → XML fragment.
 * Sequence: ADDRESS_SEQ. B-34 fix: Party verildiyse her zaman emit (hasAddress flag kaldırıldı).
 * B-35 fix: CityName + CitySubdivisionName runtime required.
 */
function serializePostalAddress(party: PartyInput, indent: string): string[] {
  const inner = emitInOrder(ADDRESS_SEQ, {
    Postbox: () => cbcOptionalTag('Postbox', party.postbox),
    Room: () => cbcOptionalTag('Room', party.room),
    StreetName: () => cbcOptionalTag('StreetName', party.streetName),
    BlockName: () => cbcOptionalTag('BlockName', party.blockName),
    BuildingName: () => cbcOptionalTag('BuildingName', party.buildingName),
    BuildingNumber: () => cbcOptionalTag('BuildingNumber', party.buildingNumber),
    CitySubdivisionName: () => cbcRequiredTag('CitySubdivisionName', party.citySubdivisionName, 'PostalAddress'),
    CityName: () => cbcRequiredTag('CityName', party.cityName, 'PostalAddress'),
    PostalZone: () => cbcOptionalTag('PostalZone', party.postalZone),
    Region: () => cbcOptionalTag('Region', party.region),
    District: () => cbcOptionalTag('District', party.district),
    Country: () => serializeCountry(party.countryCode, party.country, indent + '  '),
  });
  const body = joinLines(inner.map(s => (s.startsWith(indent + '  ') ? s : indent + '  ' + s)));
  return [
    `${indent}<cac:PostalAddress>`,
    body,
    `${indent}</cac:PostalAddress>`,
  ];
}

/** cac:Country bloğu — B-100 IdentificationCode + Name (XSD sırası) */
function serializeCountry(
  countryCode: string | undefined,
  countryName: string | undefined,
  indent: string,
): string {
  if (!isNonEmpty(countryCode) && !isNonEmpty(countryName)) return '';
  const inner: string[] = [];
  if (isNonEmpty(countryCode)) {
    inner.push(`${indent}  ${cbcOptionalTag('IdentificationCode', countryCode)}`);
  }
  if (isNonEmpty(countryName)) {
    inner.push(`${indent}  ${cbcOptionalTag('Name', countryName)}`);
  }
  return [`${indent}<cac:Country>`, ...inner, `${indent}</cac:Country>`].join('\n');
}

/**
 * Person bloğu → XML. B-20 fix: PERSON_SEQ sırası (FirstName → FamilyName → Title → MiddleName → ...).
 */
function serializePersonBlock(
  p: { firstName?: string; familyName?: string; middleName?: string; nationalityId?: string; passportId?: string },
  indent: string,
): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const identityRefXml = isNonEmpty(p.passportId)
    ? [
        `${i2}<cac:IdentityDocumentReference>`,
        `${i3}${cbcRequiredTag('ID', p.passportId, 'IdentityDocumentReference')}`,
        `${i2}</cac:IdentityDocumentReference>`,
      ].join('\n')
    : '';

  const inner = emitInOrder(PERSON_SEQ, {
    FirstName: () => cbcOptionalTag('FirstName', p.firstName),
    FamilyName: () => cbcOptionalTag('FamilyName', p.familyName),
    MiddleName: () => cbcOptionalTag('MiddleName', p.middleName),
    NationalityID: () => cbcOptionalTag('NationalityID', p.nationalityId),
    IdentityDocumentReference: () => identityRefXml,
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Person>`, body, `${indent}</cac:Person>`].join('\n');
}

/** AccountingSupplierParty → XML */
export function serializeAccountingSupplierParty(party: PartyInput, indent: string = ''): string {
  return joinLines([
    `${indent}<cac:AccountingSupplierParty>`,
    serializeParty(party, indent + '  '),
    `${indent}</cac:AccountingSupplierParty>`,
  ]);
}

/** AccountingCustomerParty → XML */
export function serializeAccountingCustomerParty(party: PartyInput, indent: string = ''): string {
  return joinLines([
    `${indent}<cac:AccountingCustomerParty>`,
    serializeParty(party, indent + '  '),
    `${indent}</cac:AccountingCustomerParty>`,
  ]);
}

/** BuyerCustomerParty → XML (§3.3 IHRACAT / §3.4 YOLCU / §3.6 KAMU) */
export function serializeBuyerCustomerParty(buyer: BuyerCustomerInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:BuyerCustomerParty>`);
  lines.push(`${i2}<cac:Party>`);

  // PartyIdentification ile PARTYTYPE (sadece IHRACAT/YOLCU için)
  if (buyer.partyType) {
    lines.push(`${i2}  <cac:PartyIdentification>`);
    lines.push(`${i2}    ${cbcOptionalTag('ID', buyer.partyType, { schemeID: 'PARTYTYPE' })}`);
    lines.push(`${i2}  </cac:PartyIdentification>`);
  }

  // Party içeriği (PartyIdentification hariç, zaten yukarda)
  const party = buyer.party;

  // VKN/TCKN
  if (isNonEmpty(party.vknTckn)) {
    lines.push(`${i2}  <cac:PartyIdentification>`);
    lines.push(`${i2}    ${cbcOptionalTag('ID', party.vknTckn, { schemeID: party.taxIdType })}`);
    lines.push(`${i2}  </cac:PartyIdentification>`);
  }

  if (isNonEmpty(party.name)) {
    lines.push(`${i2}  <cac:PartyName>`);
    lines.push(`${i2}    ${cbcOptionalTag('Name', party.name)}`);
    lines.push(`${i2}  </cac:PartyName>`);
  }

  // B-36: PostalAddress — citySubdivisionName+cityName varsa emit
  if (isNonEmpty(party.citySubdivisionName) && isNonEmpty(party.cityName)) {
    lines.push(...serializePostalAddress(party, i2 + '  '));
  }

  // B-36: PartyTaxScheme (VKN için)
  if (isNonEmpty(party.taxOffice)) {
    lines.push(`${i2}  <cac:PartyTaxScheme>`);
    lines.push(`${i2}    <cac:TaxScheme>`);
    lines.push(`${i2}      ${cbcOptionalTag('Name', party.taxOffice)}`);
    lines.push(`${i2}    </cac:TaxScheme>`);
    lines.push(`${i2}  </cac:PartyTaxScheme>`);
  }

  // PartyLegalEntity
  if (isNonEmpty(party.registrationName)) {
    lines.push(`${i2}  <cac:PartyLegalEntity>`);
    lines.push(`${i2}    ${cbcOptionalTag('RegistrationName', party.registrationName)}`);
    lines.push(`${i2}  </cac:PartyLegalEntity>`);
  }

  // B-36: Contact
  if (isNonEmpty(party.telephone) || isNonEmpty(party.telefax) || isNonEmpty(party.email)) {
    lines.push(`${i2}  <cac:Contact>`);
    if (isNonEmpty(party.telephone)) lines.push(`${i2}    ${cbcOptionalTag('Telephone', party.telephone)}`);
    if (isNonEmpty(party.telefax)) lines.push(`${i2}    ${cbcOptionalTag('Telefax', party.telefax)}`);
    if (isNonEmpty(party.email)) lines.push(`${i2}    ${cbcOptionalTag('ElectronicMail', party.email)}`);
    lines.push(`${i2}  </cac:Contact>`);
  }

  // Person (TAXFREE için) — B-20 fix: PERSON_SEQ
  if (party.taxIdType === 'TCKN' || isNonEmpty(party.firstName) || isNonEmpty(party.nationalityId)) {
    lines.push(serializePersonBlock(
      {
        firstName: party.firstName,
        familyName: party.familyName,
        middleName: party.middleName,
        nationalityId: party.nationalityId,
        passportId: party.passportId,
      },
      i2 + '  ',
    ));
  }

  lines.push(`${i2}</cac:Party>`);
  lines.push(`${indent}</cac:BuyerCustomerParty>`);
  return joinLines(lines);
}

/** TaxRepresentativeParty → XML (§3.4 YOLCU) */
export function serializeTaxRepresentativeParty(trp: TaxRepresentativeInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:TaxRepresentativeParty>`);
  lines.push(`${i2}<cac:PartyIdentification>`);
  lines.push(`${i2}  ${cbcOptionalTag('ID', trp.intermediaryVknTckn, { schemeID: 'ARACIKURUMVKN' })}`);
  lines.push(`${i2}</cac:PartyIdentification>`);
  lines.push(`${i2}<cac:PartyIdentification>`);
  lines.push(`${i2}  ${cbcOptionalTag('ID', trp.intermediaryLabel, { schemeID: 'ARACIKURUMETIKET' })}`);
  lines.push(`${i2}</cac:PartyIdentification>`);

  if (trp.additionalIdentifiers) {
    for (const aid of trp.additionalIdentifiers) {
      lines.push(`${i2}<cac:PartyIdentification>`);
      lines.push(`${i2}  ${cbcOptionalTag('ID', aid.value, { schemeID: aid.schemeId })}`);
      lines.push(`${i2}</cac:PartyIdentification>`);
    }
  }

  // B-37: PartyName
  if (isNonEmpty(trp.name)) {
    lines.push(`${i2}<cac:PartyName>`);
    lines.push(`${i3}${cbcOptionalTag('Name', trp.name)}`);
    lines.push(`${i2}</cac:PartyName>`);
  }

  // B-37: PostalAddress
  if (trp.postalAddress) {
    // AddressInput → PartyInput compat (vknTckn/taxIdType dummy, sadece adres alanları okunur)
    const addrAsParty = { ...trp.postalAddress, vknTckn: '', taxIdType: 'VKN' } as PartyInput;
    lines.push(...serializePostalAddress(addrAsParty, i2));
  }

  lines.push(`${indent}</cac:TaxRepresentativeParty>`);
  return joinLines(lines);
}

/** cac:Signature → XML */
export function serializeSignature(sig: SignatureInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:Signature>`);
  lines.push(`${i2}${cbcOptionalTag('ID', sig.id, { schemeID: 'VKN_TCKN' })}`);

  if (sig.signatoryParty) {
    lines.push(`${i2}<cac:SignatoryParty>`);
    lines.push(serializeParty(sig.signatoryParty, i3).split('\n').filter(l => {
      const trimmed = l.trim();
      return trimmed !== '<cac:Party>' && trimmed !== '</cac:Party>';
    }).join('\n'));
    lines.push(`${i2}</cac:SignatoryParty>`);
  }

  if (isNonEmpty(sig.digitalSignatureUri)) {
    lines.push(`${i2}<cac:DigitalSignatureAttachment>`);
    lines.push(`${i3}<cac:ExternalReference>`);
    lines.push(`${i3}  ${cbcOptionalTag('URI', sig.digitalSignatureUri)}`);
    lines.push(`${i3}</cac:ExternalReference>`);
    lines.push(`${i2}</cac:DigitalSignatureAttachment>`);
  }

  lines.push(`${indent}</cac:Signature>`);
  return joinLines(lines);
}
