import type { PartyInput, BuyerCustomerInput, TaxRepresentativeInput, SignatureInput } from '../types/common';
import { cbcTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';

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
    lines.push(`${i2}${cbcTag('WebsiteURI', party.websiteUri)}`);
  }

  // PartyIdentification (VKN/TCKN + ek tanımlayıcılar)
  lines.push(`${i2}<cac:PartyIdentification>`);
  lines.push(`${i3}${cbcTag('ID', party.vknTckn, { schemeID: party.taxIdType })}`);
  lines.push(`${i2}</cac:PartyIdentification>`);

  if (party.additionalIdentifiers) {
    for (const aid of party.additionalIdentifiers) {
      lines.push(`${i2}<cac:PartyIdentification>`);
      lines.push(`${i3}${cbcTag('ID', aid.value, { schemeID: aid.schemeId })}`);
      lines.push(`${i2}</cac:PartyIdentification>`);
    }
  }

  // PartyName (VKN ise)
  if (isNonEmpty(party.name)) {
    lines.push(`${i2}<cac:PartyName>`);
    lines.push(`${i3}${cbcTag('Name', party.name)}`);
    lines.push(`${i2}</cac:PartyName>`);
  }

  // PostalAddress
  lines.push(...serializePostalAddress(party, i2));

  // PartyTaxScheme
  if (isNonEmpty(party.taxOffice)) {
    lines.push(`${i2}<cac:PartyTaxScheme>`);
    lines.push(`${i3}<cac:TaxScheme>`);
    lines.push(`${i4}${cbcTag('Name', party.taxOffice)}`);
    lines.push(`${i3}</cac:TaxScheme>`);
    lines.push(`${i2}</cac:PartyTaxScheme>`);
  }

  // PartyLegalEntity
  if (isNonEmpty(party.registrationName)) {
    lines.push(`${i2}<cac:PartyLegalEntity>`);
    lines.push(`${i3}${cbcTag('RegistrationName', party.registrationName)}`);
    lines.push(`${i2}</cac:PartyLegalEntity>`);
  }

  // Contact
  if (isNonEmpty(party.telephone) || isNonEmpty(party.telefax) || isNonEmpty(party.email)) {
    lines.push(`${i2}<cac:Contact>`);
    if (isNonEmpty(party.telephone)) lines.push(`${i3}${cbcTag('Telephone', party.telephone)}`);
    if (isNonEmpty(party.telefax)) lines.push(`${i3}${cbcTag('Telefax', party.telefax)}`);
    if (isNonEmpty(party.email)) lines.push(`${i3}${cbcTag('ElectronicMail', party.email)}`);
    lines.push(`${i2}</cac:Contact>`);
  }

  // Person (TCKN ise)
  if (party.taxIdType === 'TCKN') {
    lines.push(`${i2}<cac:Person>`);
    if (isNonEmpty(party.firstName)) lines.push(`${i3}${cbcTag('FirstName', party.firstName)}`);
    if (isNonEmpty(party.middleName)) lines.push(`${i3}${cbcTag('MiddleName', party.middleName)}`);
    if (isNonEmpty(party.familyName)) lines.push(`${i3}${cbcTag('FamilyName', party.familyName)}`);
    if (isNonEmpty(party.nationalityId)) lines.push(`${i3}${cbcTag('NationalityID', party.nationalityId)}`);
    if (isNonEmpty(party.passportId)) {
      lines.push(`${i3}<cac:IdentityDocumentReference>`);
      lines.push(`${i4}${cbcTag('ID', party.passportId)}`);
      lines.push(`${i3}</cac:IdentityDocumentReference>`);
    }
    lines.push(`${i2}</cac:Person>`);
  }

  lines.push(`${i}</cac:Party>`);
  return joinLines(lines);
}

/** PostalAddress → XML fragment */
function serializePostalAddress(party: PartyInput, indent: string): string[] {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const lines: string[] = [];

  const hasAddress = isNonEmpty(party.room) || isNonEmpty(party.streetName) ||
    isNonEmpty(party.buildingName) || isNonEmpty(party.buildingNumber) ||
    isNonEmpty(party.citySubdivisionName) || isNonEmpty(party.cityName) ||
    isNonEmpty(party.postalZone) || isNonEmpty(party.region) || isNonEmpty(party.country);

  if (!hasAddress) return lines;

  lines.push(`${indent}<cac:PostalAddress>`);
  if (isNonEmpty(party.room)) lines.push(`${i2}${cbcTag('Room', party.room)}`);
  if (isNonEmpty(party.streetName)) lines.push(`${i2}${cbcTag('StreetName', party.streetName)}`);
  if (isNonEmpty(party.buildingName)) lines.push(`${i2}${cbcTag('BuildingName', party.buildingName)}`);
  if (isNonEmpty(party.buildingNumber)) lines.push(`${i2}${cbcTag('BuildingNumber', party.buildingNumber)}`);
  if (isNonEmpty(party.citySubdivisionName)) lines.push(`${i2}${cbcTag('CitySubdivisionName', party.citySubdivisionName)}`);
  if (isNonEmpty(party.cityName)) lines.push(`${i2}${cbcTag('CityName', party.cityName)}`);
  if (isNonEmpty(party.postalZone)) lines.push(`${i2}${cbcTag('PostalZone', party.postalZone)}`);
  if (isNonEmpty(party.region)) lines.push(`${i2}${cbcTag('Region', party.region)}`);
  if (isNonEmpty(party.country)) {
    lines.push(`${i2}<cac:Country>`);
    lines.push(`${i3}${cbcTag('Name', party.country)}`);
    lines.push(`${i2}</cac:Country>`);
  }
  lines.push(`${indent}</cac:PostalAddress>`);
  return lines;
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
    lines.push(`${i2}    ${cbcTag('ID', buyer.partyType, { schemeID: 'PARTYTYPE' })}`);
    lines.push(`${i2}  </cac:PartyIdentification>`);
  }

  // Party içeriği (PartyIdentification hariç, zaten yukarda)
  const party = buyer.party;

  // VKN/TCKN
  if (isNonEmpty(party.vknTckn)) {
    lines.push(`${i2}  <cac:PartyIdentification>`);
    lines.push(`${i2}    ${cbcTag('ID', party.vknTckn, { schemeID: party.taxIdType })}`);
    lines.push(`${i2}  </cac:PartyIdentification>`);
  }

  if (isNonEmpty(party.name)) {
    lines.push(`${i2}  <cac:PartyName>`);
    lines.push(`${i2}    ${cbcTag('Name', party.name)}`);
    lines.push(`${i2}  </cac:PartyName>`);
  }

  // PartyLegalEntity
  if (isNonEmpty(party.registrationName)) {
    lines.push(`${i2}  <cac:PartyLegalEntity>`);
    lines.push(`${i2}    ${cbcTag('RegistrationName', party.registrationName)}`);
    lines.push(`${i2}  </cac:PartyLegalEntity>`);
  }

  // Person (TAXFREE için)
  if (party.taxIdType === 'TCKN' || isNonEmpty(party.firstName) || isNonEmpty(party.nationalityId)) {
    lines.push(`${i2}  <cac:Person>`);
    if (isNonEmpty(party.firstName)) lines.push(`${i2}    ${cbcTag('FirstName', party.firstName)}`);
    if (isNonEmpty(party.familyName)) lines.push(`${i2}    ${cbcTag('FamilyName', party.familyName)}`);
    if (isNonEmpty(party.nationalityId)) lines.push(`${i2}    ${cbcTag('NationalityID', party.nationalityId)}`);
    if (isNonEmpty(party.passportId)) {
      lines.push(`${i2}    <cac:IdentityDocumentReference>`);
      lines.push(`${i2}      ${cbcTag('ID', party.passportId)}`);
      lines.push(`${i2}    </cac:IdentityDocumentReference>`);
    }
    lines.push(`${i2}  </cac:Person>`);
  }

  lines.push(`${i2}</cac:Party>`);
  lines.push(`${indent}</cac:BuyerCustomerParty>`);
  return joinLines(lines);
}

/** TaxRepresentativeParty → XML (§3.4 YOLCU) */
export function serializeTaxRepresentativeParty(trp: TaxRepresentativeInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:TaxRepresentativeParty>`);
  lines.push(`${i2}<cac:PartyIdentification>`);
  lines.push(`${i2}  ${cbcTag('ID', trp.intermediaryVknTckn, { schemeID: 'ARACIKURUMVKN' })}`);
  lines.push(`${i2}</cac:PartyIdentification>`);
  lines.push(`${i2}<cac:PartyIdentification>`);
  lines.push(`${i2}  ${cbcTag('ID', trp.intermediaryLabel, { schemeID: 'ARACIKURUMETIKET' })}`);
  lines.push(`${i2}</cac:PartyIdentification>`);

  if (trp.additionalIdentifiers) {
    for (const aid of trp.additionalIdentifiers) {
      lines.push(`${i2}<cac:PartyIdentification>`);
      lines.push(`${i2}  ${cbcTag('ID', aid.value, { schemeID: aid.schemeId })}`);
      lines.push(`${i2}</cac:PartyIdentification>`);
    }
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
  lines.push(`${i2}${cbcTag('ID', sig.id, { schemeID: 'VKN_TCKN' })}`);

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
    lines.push(`${i3}  ${cbcTag('URI', sig.digitalSignatureUri)}`);
    lines.push(`${i3}</cac:ExternalReference>`);
    lines.push(`${i2}</cac:DigitalSignatureAttachment>`);
  }

  lines.push(`${indent}</cac:Signature>`);
  return joinLines(lines);
}
