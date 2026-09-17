import type {
  PartyInput,
  BuyerCustomerInput,
  TaxRepresentativeInput,
  SignatureInput,
  AddressFields,
} from '../../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines } from '../primitives/xml-helpers';
import { isNonEmpty } from '../../utils/formatters';
import { serializeAddress } from './address';
import {
  CONTACT_SEQ,
  CUSTOMER_PARTY_SEQ,
  PARTY_IDENTIFICATION_SEQ,
  PARTY_LEGAL_ENTITY_SEQ,
  PARTY_NAME_SEQ,
  PARTY_SEQ,
  PARTY_TAX_SCHEME_SEQ,
  PERSON_SEQ,
  SIGNATURE_SEQ,
  SUPPLIER_PARTY_SEQ,
  DOCUMENT_REFERENCE_SEQ,
  emitInOrder,
} from '../sequences/xsd-sequence';

// ═══════════════════════════════════════════════════════════════════════════
// ORTAK `PartyType` GÖVDESİ
//
// UBL'de `PartyType` TEK tiptir ve pek çok eleman adıyla çıkar: `cac:Party`,
// `cac:CarrierParty`, `cac:TaxRepresentativeParty`, `cac:SignatoryParty`,
// `cac:IssuerParty`, `cac:DeliveryParty`, `cac:NotifyParty`…
//
// S2b öncesinde bu gövdenin DÖRT elle yazılmış üreticisi vardı ve hiçbiri
// diğeriyle aynı davranmıyordu. Bunun BEDELİ ÖLÇÜLMÜŞTÜR: `cac:CarrierParty`
// elle yazıldığı için `cac:PostalAddress` hiç basılmıyordu (UBL-TR'de 1..1) ve
// şoförsüz irsaliye GİB kapısında HER ZAMAN reddediliyordu; TCKN taşıyıcının
// `cac:Person` bloğu da sessizce kayboluyordu.
//
// Artık tek gövde var: `emitPartyBody`. Çağıranlar XML ŞEKLİ üretmez, yalnız
// `PartyBodyModel`i doldurur — hangi kimlik yazılacağı, adresin/kişinin var
// olup olmadığı ÇAĞIRANIN kararıdır, sıra ve yapı tabloya aittir.
//
// ⚠️ UBL'de KALITIM YOKTUR (%100 kompozisyon): `SupplierPartyType` ve
// `CustomerPartyType` `PartyType`'tan TÜREMEZ, İÇİNDE bir `cac:Party` TAŞIR.
// Sarmalayıcılar bu yüzden ayrı tablolardan (`SUPPLIER_PARTY_SEQ` /
// `CUSTOMER_PARTY_SEQ`) yazılır.
// ═══════════════════════════════════════════════════════════════════════════

/** Tek bir `cac:PartyIdentification` girdisi. */
export interface PartyIdentifierModel {
  value?: string;
  schemeId?: string;
  /**
   * Değer boş olsa da sarmalayıcı yazılsın mı.
   *
   * ⚠️ YERLEŞİK DAVRANIŞ: `cac:Party`nin İLK `PartyIdentification`ı `vknTckn`
   * boşken bile `<cac:PartyIdentification/>` çifti üretir. Şema-geçerli
   * değildir (`PartyIdentificationType/cbc:ID` 1..1) ama çıktıyı değiştirmemek
   * için korunur; bayrak bunun BİLİNÇLİ olduğunu görünür kılar.
   */
  emitWhenEmpty?: boolean;
}

/** `cac:Person` alanları. */
export interface PersonModel {
  firstName?: string;
  familyName?: string;
  middleName?: string;
  nationalityId?: string;
  passportId?: string;
  /** Pasaportun verildiği tarih — `cac:IdentityDocumentReference/cbc:IssueDate` (1..1). */
  passportIssueDate?: string;
}

/** `cac:Contact` alanları. */
export interface ContactModel {
  telephone?: string;
  telefax?: string;
  email?: string;
}

/** Bir `PartyType` gövdesinin çözülmüş modeli — her slot çağıranca karara bağlanmıştır. */
export interface PartyBodyModel {
  websiteUri?: string;
  identifiers?: readonly PartyIdentifierModel[];
  name?: string;
  /** `undefined` → `cac:PostalAddress` HİÇ yazılmaz. Verilirse il/ilçe emit anında zorunludur. */
  address?: AddressFields;
  taxOffice?: string;
  registrationName?: string;
  contact?: ContactModel;
  /** `undefined` → `cac:Person` HİÇ yazılmaz. */
  person?: PersonModel;
}

/**
 * `PartyType` gövdesini istenen `cac` etiketiyle sarmalar. TEK üretici.
 *
 * B-101: `cac:CarrierParty` XSD'de `PartyType`'tır — içinde ayrıca `<cac:Party>`
 * sarmalı YOKTUR, alt elemanlar doğrudan gelir. Bkz. GİB UBL-TR
 * `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd`
 * `<xsd:element name="CarrierParty" type="PartyType"/>` ve `Irsaliye-Ornek1.xml` §175-189.
 */
export function serializePartyBody(model: PartyBodyModel, tagName: string, indent: string = ''): string {
  return joinLines([`${indent}<cac:${tagName}>`, ...emitPartyBody(model, indent + '  '), `${indent}</cac:${tagName}>`]);
}

/** `PARTY_SEQ` sırasında gövde satırları (sarmalayıcı etiket HARİÇ). */
function emitPartyBody(model: PartyBodyModel, indent: string): string[] {
  return emitInOrder(PARTY_SEQ, {
    WebsiteURI: () => (isNonEmpty(model.websiteUri) ? `${indent}${cbcOptionalTag('WebsiteURI', model.websiteUri)}` : ''),

    PartyIdentification: () =>
      joinLines((model.identifiers ?? []).map(id => partyIdentificationBlock(id, indent))),

    PartyName: () => serializePartyName(model.name, indent),

    PostalAddress: () => (model.address ? serializeAddress(model.address, 'PostalAddress', indent) : ''),

    PartyTaxScheme: () => serializePartyTaxScheme(model.taxOffice, indent),

    PartyLegalEntity: () => serializePartyLegalEntity(model.registrationName, indent),

    Contact: () => serializeContact(model.contact, indent),

    Person: () => (model.person ? serializePersonBlock(model.person, indent) : ''),
  });
}

/**
 * `PartyInput` → `PartyBodyModel` — yerleşik taraf politikası.
 *
 * · İlk kimlik VKN/TCKN'dir ve boşken bile sarmalayıcısı yazılır (yerleşik).
 * · `cac:PostalAddress` HER ZAMAN denenir: UBL-TR'de 1..1'dir, bu yüzden
 *   eksik il/ilçe sessizce atlanmaz, `cbcRequiredTag` ile AÇIK hata verir.
 * · `cac:Person` yalnız TCKN dalında yazılır.
 */
function partyInputToModel(party: PartyInput): PartyBodyModel {
  return {
    websiteUri: party.websiteUri,
    identifiers: [
      { value: party.vknTckn, schemeId: party.taxIdType, emitWhenEmpty: true },
      ...(party.additionalIdentifiers ?? []).map(aid => ({ value: aid.value, schemeId: aid.schemeId })),
    ],
    name: party.name,
    address: party,
    taxOffice: party.taxOffice,
    registrationName: party.registrationName,
    contact: party,
    person: party.taxIdType === 'TCKN' ? personFieldsOf(party) : undefined,
  };
}

/** `PartyInput`in kişi alanları — üç çağıran da aynı altılıyı okur. */
function personFieldsOf(party: PartyInput): PersonModel {
  return {
    firstName: party.firstName,
    familyName: party.familyName,
    middleName: party.middleName,
    nationalityId: party.nationalityId,
    passportId: party.passportId,
    passportIssueDate: party.passportIssueDate,
  };
}

/** Party → XML fragment (cac:Party içeriği) */
export function serializeParty(party: PartyInput, indent: string = ''): string {
  return serializePartyAs(party, 'Party', indent);
}

/** `PartyType` içeriğini istenen `cac` etiketiyle yazar (CarrierParty, SignatoryParty, DeliveryParty…). */
export function serializePartyAs(party: PartyInput, tagName: string, indent: string = ''): string {
  return serializePartyBody(partyInputToModel(party), tagName, indent);
}

/** Tek `cac:PartyIdentification` sarmalayıcısı. Sıra: `PARTY_IDENTIFICATION_SEQ`. */
function partyIdentificationBlock(id: PartyIdentifierModel, indent: string): string {
  if (!isNonEmpty(id.value) && !id.emitWhenEmpty) return '';
  const inner = emitInOrder(PARTY_IDENTIFICATION_SEQ, {
    ID: () => cbcOptionalTag('ID', id.value, id.schemeId ? { schemeID: id.schemeId } : undefined),
  });
  return joinLines([
    `${indent}<cac:PartyIdentification>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:PartyIdentification>`,
  ]);
}

/** `cac:PartyName` — sıra: `PARTY_NAME_SEQ`. Ad yoksa hiç yazılmaz. */
function serializePartyName(name: string | undefined, indent: string): string {
  if (!isNonEmpty(name)) return '';
  const inner = emitInOrder(PARTY_NAME_SEQ, {
    Name: () => cbcOptionalTag('Name', name),
  });
  return joinLines([
    `${indent}<cac:PartyName>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:PartyName>`,
  ]);
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
function serializeContact(contact: ContactModel | undefined, indent: string): string {
  if (!contact) return '';
  const i2 = indent + '  ';
  const inner = emitInOrder(CONTACT_SEQ, {
    Telephone: () => cbcOptionalTag('Telephone', contact.telephone),
    Telefax: () => cbcOptionalTag('Telefax', contact.telefax),
    ElectronicMail: () => cbcOptionalTag('ElectronicMail', contact.email),
  });
  if (inner.length === 0) return '';
  return joinLines([`${indent}<cac:Contact>`, ...inner.map(s => i2 + s), `${indent}</cac:Contact>`]);
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
function serializePersonBlock(p: PersonModel, indent: string): string {
  const i2 = indent + '  ';

  const inner = emitInOrder(PERSON_SEQ, {
    FirstName: () => cbcOptionalTag('FirstName', p.firstName),
    FamilyName: () => cbcOptionalTag('FamilyName', p.familyName),
    MiddleName: () => cbcOptionalTag('MiddleName', p.middleName),
    NationalityID: () => cbcOptionalTag('NationalityID', p.nationalityId),
    IdentityDocumentReference: () =>
      serializeIdentityDocumentReference(p.passportId, p.passportIssueDate, i2),
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  if (body === '') return '';
  return [`${indent}<cac:Person>`, body, `${indent}</cac:Person>`].join('\n');
}

/**
 * `cac:IdentityDocumentReference` — pasaport. Sıra: `DOCUMENT_REFERENCE_SEQ`.
 *
 * Belge referansının diğer üreticileriyle (`reference-serializer`) aynı tabloyu
 * kullanır; `cbc:IssueDate`in UBL-TR'de 1..1 olduğu oradan da bilinir.
 *
 * 🔴 `cbc:IssueDate` EMİT ANINDA ZORUNLUDUR (`cbcRequiredTag`) — adres
 * gövdesindeki `CityName`/`CitySubdivisionName` ile AYNI doktrin: zorunluluk
 * tipte değil emit anında uygulanır, böylece ham katmanı doğrudan çağıran da
 * (doğrulayıcıyı atlayarak) sessizce geçersiz XML üretemez. Tarih pasaportun
 * VERİLDİĞİ tarihtir; kılavuz yazılamadığı durumda `2005-01-01` sabitine izin
 * verir (Gümrük İşlemleri Kılavuzu V1.8 §4.2.1) — o sabiti KÜTÜPHANE KOYMAZ,
 * veri uydurmak olurdu; çağıran bilerek verir.
 */
function serializeIdentityDocumentReference(
  passportId: string | undefined,
  passportIssueDate: string | undefined,
  indent: string,
): string {
  if (!isNonEmpty(passportId)) return '';
  const inner = emitInOrder(DOCUMENT_REFERENCE_SEQ, {
    ID: () => cbcRequiredTag('ID', passportId, 'IdentityDocumentReference'),
    IssueDate: () => cbcRequiredTag('IssueDate', passportIssueDate, 'IdentityDocumentReference'),
  });
  return joinLines([
    `${indent}<cac:IdentityDocumentReference>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:IdentityDocumentReference>`,
  ]);
}

// ─── SupplierPartyType / CustomerPartyType sarmalayıcıları ────────────────
//
// ⚠️ Bunlar `PartyType` DEĞİLDİR. UBL'de kalıtım yoktur: her ikisi de İÇİNDE
// bir `cac:Party` TAŞIR ve kendi sekans tabloları vardır.

/** `SupplierPartyType` sarmalayıcısı — `cac:Party` → `cac:DespatchContact`. */
export function serializeSupplierPartyContainer(
  tagName: string,
  party: PartyInput,
  indent: string = '',
  despatchContactName?: string,
): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(SUPPLIER_PARTY_SEQ, {
    Party: () => serializeParty(party, i2),
    // B-19: UBL-TR §5.4 "Teslim Eden" — `DespatchSupplierParty/DespatchContact/Name`
    DespatchContact: () => serializeNamedContact('DespatchContact', despatchContactName, i2),
  });
  return joinLines([`${indent}<cac:${tagName}>`, ...inner, `${indent}</cac:${tagName}>`]);
}

/** `CustomerPartyType` sarmalayıcısı — `cac:Party` → `cac:DeliveryContact`. */
export function serializeCustomerPartyContainer(
  tagName: string,
  partyXml: string,
  indent: string = '',
  deliveryContactName?: string,
): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(CUSTOMER_PARTY_SEQ, {
    Party: () => partyXml,
    DeliveryContact: () => serializeNamedContact('DeliveryContact', deliveryContactName, i2),
  });
  return joinLines([`${indent}<cac:${tagName}>`, ...inner, `${indent}</cac:${tagName}>`]);
}

/** `ContactType` sarmalayıcısı — yalnız `cbc:Name` taşıyan hâli. Sıra: `CONTACT_SEQ`. */
function serializeNamedContact(tagName: string, name: string | undefined, indent: string): string {
  if (!isNonEmpty(name)) return '';
  const inner = emitInOrder(CONTACT_SEQ, {
    Name: () => cbcOptionalTag('Name', name),
  });
  return joinLines([
    `${indent}<cac:${tagName}>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:${tagName}>`,
  ]);
}

/** AccountingSupplierParty → XML */
export function serializeAccountingSupplierParty(party: PartyInput, indent: string = ''): string {
  return serializeSupplierPartyContainer('AccountingSupplierParty', party, indent);
}

/** AccountingCustomerParty → XML */
export function serializeAccountingCustomerParty(party: PartyInput, indent: string = ''): string {
  return serializeCustomerPartyContainer('AccountingCustomerParty', serializeParty(party, indent + '  '), indent);
}

/**
 * BuyerCustomerParty → XML (§3.3 IHRACAT / §3.4 YOLCU / §3.6 KAMU).
 *
 * `CustomerPartyType` sarmalayıcısı + ORTAK `PartyType` gövdesi. Üç politika
 * farkı BİLEREK korunur (hepsi bu profillerin gerçeğidir):
 *   · `PARTYTYPE` kimliği VKN/TCKN'den ÖNCE gelir (IHRACAT=EXPORT, YOLCU=TAXFREE);
 *   · VKN/TCKN boşsa sarmalayıcı yazılmaz (yerleşik taraftaki koşulsuz
 *     davranışın AKSİNE — alıcı kimliksiz olabilir);
 *   · `cac:PostalAddress` yalnız il+ilçe doluyken yazılır (KAMU aracı kurumunun
 *     adresi olmayabilir), `cac:Person` ise TCKN'e ek olarak ad veya uyruk
 *     verildiğinde de yazılır (YOLCUBERABER pasaportlu turist).
 */
export function serializeBuyerCustomerParty(buyer: BuyerCustomerInput, indent: string = ''): string {
  const party = buyer.party;
  const model: PartyBodyModel = {
    identifiers: [
      ...(buyer.partyType ? [{ value: buyer.partyType, schemeId: 'PARTYTYPE' }] : []),
      { value: party.vknTckn, schemeId: party.taxIdType },
      // B-83: KAMU aracı kurum MUSTERINO/MERSISNO vb.
      ...(party.additionalIdentifiers ?? []).map(aid => ({ value: aid.value, schemeId: aid.schemeId })),
    ],
    name: party.name,
    // B-36: il+ilçe doluysa adres yaz
    address: isNonEmpty(party.citySubdivisionName) && isNonEmpty(party.cityName) ? party : undefined,
    taxOffice: party.taxOffice,
    registrationName: party.registrationName,
    contact: party,
    person:
      party.taxIdType === 'TCKN' || isNonEmpty(party.firstName) || isNonEmpty(party.nationalityId)
        ? personFieldsOf(party)
        : undefined,
  };

  return serializeCustomerPartyContainer(
    'BuyerCustomerParty',
    serializePartyBody(model, 'Party', indent + '  '),
    indent,
  );
}

/**
 * TaxRepresentativeParty → XML (§3.4 YOLCU).
 *
 * `PartyType`tır — sarmalayıcı `cac:Party` YOKTUR. Ortak gövdeden geçer.
 */
export function serializeTaxRepresentativeParty(trp: TaxRepresentativeInput, indent: string = ''): string {
  const model: PartyBodyModel = {
    identifiers: [
      { value: trp.intermediaryVknTckn, schemeId: 'ARACIKURUMVKN', emitWhenEmpty: true },
      { value: trp.intermediaryLabel, schemeId: 'ARACIKURUMETIKET', emitWhenEmpty: true },
      ...(trp.additionalIdentifiers ?? []).map(aid => ({ value: aid.value, schemeId: aid.schemeId })),
    ],
    // B-37
    name: trp.name,
    address: trp.postalAddress,
  };
  return serializePartyBody(model, 'TaxRepresentativeParty', indent);
}

/**
 * `cac:Signature` → XML. Sıra: `SIGNATURE_SEQ`.
 *
 * 🔴 `cac:SignatoryParty` de `PartyType`'tır. Eskiden burada `serializeParty`
 * çağrılıp çıktıdaki `<cac:Party>` etiketleri STRING FİLTRESİYLE ayıklanıyordu;
 * `CarrierParty` vakasının aynı sınıftan bir ikiziydi. Artık ortak
 * `serializePartyAs` doğrudan doğru etiketi yazar (girinti de bir seviye
 * düzeldi: `SignatoryParty` çocukları artık iki değil BİR seviye içeride).
 */
export function serializeSignature(sig: SignatureInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  const inner = emitInOrder(SIGNATURE_SEQ, {
    ID: () => `${i2}${cbcOptionalTag('ID', sig.id, { schemeID: 'VKN_TCKN' })}`,
    SignatoryParty: () => (sig.signatoryParty ? serializePartyAs(sig.signatoryParty, 'SignatoryParty', i2) : ''),
    DigitalSignatureAttachment: () =>
      isNonEmpty(sig.digitalSignatureUri)
        ? joinLines([
            `${i2}<cac:DigitalSignatureAttachment>`,
            `${i3}<cac:ExternalReference>`,
            `${i3}  ${cbcOptionalTag('URI', sig.digitalSignatureUri)}`,
            `${i3}</cac:ExternalReference>`,
            `${i2}</cac:DigitalSignatureAttachment>`,
          ])
        : '',
  });

  return joinLines([`${indent}<cac:Signature>`, ...inner, `${indent}</cac:Signature>`]);
}
