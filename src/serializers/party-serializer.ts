import type { PartyInput, BuyerCustomerInput, TaxRepresentativeInput, SignatureInput } from '../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import {
  ADDRESS_SEQ,
  CONTACT_SEQ,
  PARTY_LEGAL_ENTITY_SEQ,
  PARTY_SEQ,
  PARTY_TAX_SCHEME_SEQ,
  PERSON_SEQ,
  emitInOrder,
} from './xsd-sequence';

/** Party → XML fragment (cac:Party içeriği) */
export function serializeParty(party: PartyInput, indent: string = ''): string {
  return serializePartyAs(party, 'Party', indent);
}

/**
 * PartyType içeriğini istenen cac etiketiyle sarmalar.
 *
 * B-101: `cac:CarrierParty` XSD'de `PartyType`'tır — içinde ayrıca `<cac:Party>`
 * sarmalı YOKTUR, alt elemanlar (PartyIdentification/PartyName/PostalAddress…)
 * doğrudan gelir. Bkz. GİB UBL-TR `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd`
 * `<xsd:element name="CarrierParty" type="PartyType"/>` ve `Irsaliye-Ornek1.xml` §175-189.
 * Aynı gerekçe `DeliveryParty`, `NotifyParty` gibi diğer PartyType alanları için de geçerli.
 */
export function serializePartyAs(party: PartyInput, tagName: string, indent: string = ''): string {
  const i = indent;
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  const inner = emitInOrder(PARTY_SEQ, {
    WebsiteURI: () => (isNonEmpty(party.websiteUri) ? `${i2}${cbcOptionalTag('WebsiteURI', party.websiteUri)}` : ''),

    // PartyIdentification (VKN/TCKN + ek tanımlayıcılar)
    //
    // ⚠️ İlk sarmalayıcı KOŞULSUZ yazılır — `vknTckn` boş olsa bile
    // `<cac:PartyIdentification/>` çifti çıkar (yerleşik davranış).
    PartyIdentification: () =>
      joinLines([
        ...partyIdentificationBlock(party.vknTckn, party.taxIdType, i2, i3),
        ...(party.additionalIdentifiers ?? []).flatMap(aid =>
          partyIdentificationBlock(aid.value, aid.schemeId, i2, i3),
        ),
      ]),

    // PartyName (VKN ise)
    PartyName: () =>
      isNonEmpty(party.name)
        ? joinLines([
            `${i2}<cac:PartyName>`,
            `${i3}${cbcOptionalTag('Name', party.name)}`,
            `${i2}</cac:PartyName>`,
          ])
        : '',

    PostalAddress: () => joinLines(serializePostalAddress(party, i2)),

    PartyTaxScheme: () => serializePartyTaxScheme(party.taxOffice, i2),

    PartyLegalEntity: () => serializePartyLegalEntity(party.registrationName, i2),

    Contact: () => serializeContact(party, i2),

    // Person (TCKN ise) — B-20 fix: PERSON_SEQ (FirstName → FamilyName → Title → MiddleName → NameSuffix → NationalityID)
    Person: () =>
      party.taxIdType === 'TCKN'
        ? serializePersonBlock(
            {
              firstName: party.firstName,
              familyName: party.familyName,
              middleName: party.middleName,
              nationalityId: party.nationalityId,
              passportId: party.passportId,
            },
            i2,
          )
        : '',
  });

  return joinLines([`${i}<cac:${tagName}>`, ...inner, `${i}</cac:${tagName}>`]);
}

/** Tek `cac:PartyIdentification` sarmalayıcısı (3 satır). */
function partyIdentificationBlock(
  id: string | undefined,
  schemeId: string,
  indent: string,
  childIndent: string,
): string[] {
  return [
    `${indent}<cac:PartyIdentification>`,
    `${childIndent}${cbcOptionalTag('ID', id, { schemeID: schemeId })}`,
    `${indent}</cac:PartyIdentification>`,
  ];
}

/**
 * `cac:PartyTaxScheme` — vergi dairesi adı. Sequence: PARTY_TAX_SCHEME_SEQ.
 * Ad yoksa hiç yazılmaz (boş `PartyTaxScheme` şema-geçersizdir).
 */
function serializePartyTaxScheme(taxOffice: string | undefined, indent: string): string {
  if (!isNonEmpty(taxOffice)) return '';
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const inner = emitInOrder(PARTY_TAX_SCHEME_SEQ, {
    TaxScheme: () =>
      joinLines([`${i2}<cac:TaxScheme>`, `${i3}${cbcOptionalTag('Name', taxOffice)}`, `${i2}</cac:TaxScheme>`]),
  });
  return joinLines([`${indent}<cac:PartyTaxScheme>`, ...inner, `${indent}</cac:PartyTaxScheme>`]);
}

/** `cac:PartyLegalEntity` — ünvan. Sequence: PARTY_LEGAL_ENTITY_SEQ. */
function serializePartyLegalEntity(registrationName: string | undefined, indent: string): string {
  if (!isNonEmpty(registrationName)) return '';
  const i2 = indent + '  ';
  const inner = emitInOrder(PARTY_LEGAL_ENTITY_SEQ, {
    RegistrationName: () => cbcOptionalTag('RegistrationName', registrationName),
  });
  return joinLines([
    `${indent}<cac:PartyLegalEntity>`,
    ...inner.map(s => i2 + s),
    `${indent}</cac:PartyLegalEntity>`,
  ]);
}

/**
 * `cac:Contact` — telefon/faks/e-posta. Sequence: CONTACT_SEQ.
 * Üçü de boşsa hiç yazılmaz (çocuksuz `Contact` şema-geçersizdir).
 */
function serializeContact(
  party: Pick<PartyInput, 'telephone' | 'telefax' | 'email'>,
  indent: string,
): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(CONTACT_SEQ, {
    Telephone: () => cbcOptionalTag('Telephone', party.telephone),
    Telefax: () => cbcOptionalTag('Telefax', party.telefax),
    ElectronicMail: () => cbcOptionalTag('ElectronicMail', party.email),
  });
  if (inner.length === 0) return '';
  return joinLines([`${indent}<cac:Contact>`, ...inner.map(s => i2 + s), `${indent}</cac:Contact>`]);
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
 *
 * 🔴 İÇİ BOŞ `<cac:Person>` ASLA YAZILMAZ — `''` döner, `joinLines` boş satırı
 * eler. UBL `PersonType` `cbc:FirstName`i ZORUNLU kılar, dolayısıyla çocuksuz
 * bir Person düğümü HER ZAMAN XSD-geçersizdir; yazmak GİB'den «"Person"
 * elementinin içeriği eksik» reddi demektir (canlı ölçüldü: ihracat alıcısı
 * `taxIdType` yanlışlıkla TCKN olduğunda tam bu oluyordu).
 *
 * ⚠️ Bu bir SAVUNMA katmanıdır, veri UYDURMAZ: eksik ad burada uydurulmaz,
 * yalnız geçersiz düğüm yazılmaz. Gerçekten zorunlu olduğu yerde eksiği
 * `common-validators` (`TCKN sahibi için Person/FirstName zorunludur`) açık
 * hata olarak bildirir.
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
  if (body === '') return '';
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
  const p1 = i2 + '  '; // Party çocukları (cac)
  const p2 = i2 + '    '; // onların cbc çocukları
  const party = buyer.party;

  const inner = emitInOrder(PARTY_SEQ, {
    PartyIdentification: () =>
      joinLines([
        // PARTYTYPE (sadece IHRACAT/YOLCU için)
        ...(buyer.partyType ? partyIdentificationBlock(buyer.partyType, 'PARTYTYPE', p1, p2) : []),
        // VKN/TCKN
        ...(isNonEmpty(party.vknTckn)
          ? partyIdentificationBlock(party.vknTckn, party.taxIdType, p1, p2)
          : []),
        // B-83: additionalIdentifiers emit — KAMU aracı kurum MUSTERINO/MERSISNO vb.
        ...(party.additionalIdentifiers ?? []).flatMap(aid =>
          partyIdentificationBlock(aid.value, aid.schemeId, p1, p2),
        ),
      ]),

    PartyName: () =>
      isNonEmpty(party.name)
        ? joinLines([`${p1}<cac:PartyName>`, `${p2}${cbcOptionalTag('Name', party.name)}`, `${p1}</cac:PartyName>`])
        : '',

    // B-36: PostalAddress — citySubdivisionName+cityName varsa emit
    PostalAddress: () =>
      isNonEmpty(party.citySubdivisionName) && isNonEmpty(party.cityName)
        ? joinLines(serializePostalAddress(party, p1))
        : '',

    // B-36: PartyTaxScheme (VKN için)
    PartyTaxScheme: () => serializePartyTaxScheme(party.taxOffice, p1),

    PartyLegalEntity: () => serializePartyLegalEntity(party.registrationName, p1),

    // B-36: Contact
    Contact: () => serializeContact(party, p1),

    // Person (TAXFREE için) — B-20 fix: PERSON_SEQ
    Person: () =>
      party.taxIdType === 'TCKN' || isNonEmpty(party.firstName) || isNonEmpty(party.nationalityId)
        ? serializePersonBlock(
            {
              firstName: party.firstName,
              familyName: party.familyName,
              middleName: party.middleName,
              nationalityId: party.nationalityId,
              passportId: party.passportId,
            },
            p1,
          )
        : '',
  });

  return joinLines([
    `${indent}<cac:BuyerCustomerParty>`,
    `${i2}<cac:Party>`,
    ...inner,
    `${i2}</cac:Party>`,
    `${indent}</cac:BuyerCustomerParty>`,
  ]);
}

/** TaxRepresentativeParty → XML (§3.4 YOLCU). Sequence: PARTY_SEQ. */
export function serializeTaxRepresentativeParty(trp: TaxRepresentativeInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  const inner = emitInOrder(PARTY_SEQ, {
    PartyIdentification: () =>
      joinLines([
        ...partyIdentificationBlock(trp.intermediaryVknTckn, 'ARACIKURUMVKN', i2, i3),
        ...partyIdentificationBlock(trp.intermediaryLabel, 'ARACIKURUMETIKET', i2, i3),
        ...(trp.additionalIdentifiers ?? []).flatMap(aid =>
          partyIdentificationBlock(aid.value, aid.schemeId, i2, i3),
        ),
      ]),

    // B-37: PartyName
    PartyName: () =>
      isNonEmpty(trp.name)
        ? joinLines([`${i2}<cac:PartyName>`, `${i3}${cbcOptionalTag('Name', trp.name)}`, `${i2}</cac:PartyName>`])
        : '',

    // B-37: PostalAddress
    PostalAddress: () => {
      if (!trp.postalAddress) return '';
      // AddressInput → PartyInput compat (vknTckn/taxIdType dummy, sadece adres alanları okunur)
      const addrAsParty = { ...trp.postalAddress, vknTckn: '', taxIdType: 'VKN' } as PartyInput;
      return joinLines(serializePostalAddress(addrAsParty, i2));
    },
  });

  return joinLines([
    `${indent}<cac:TaxRepresentativeParty>`,
    ...inner,
    `${indent}</cac:TaxRepresentativeParty>`,
  ]);
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
