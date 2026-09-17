/**
 * S3 — YÜKLEM katmanı · **XSD KARDİNALİTE** kuralları.
 *
 * ## Kusur sınıfı: "sessizce geçersiz XML"
 *
 * Şematron kuralları `validate()` çıktısına ÇOK İYİ eşlenir; XSD kardinalitesi
 * eşlenMEZ. Serileştirici bir düğümü N kez yazabildiği ya da zorunlu bir çocuğu
 * hiç yazmadığı hâlde doğrulayıcı susuyordu — kullanıcı XML'i alıyor, GİB
 * kapısında `cvc-complex-type` hatasıyla geri dönüyordu. Yani hata BİZDE
 * ölçülebilirken TELDE öğreniliyordu.
 *
 * Bu dosyadaki yüklemler tam o boşluğu kapatır: kaynakları GİB'in kendi
 * XSD'sidir (`schemas/ubl-tr/common/UBL-CommonAggregateComponents-2.1.xsd`,
 * repoda), şematron değil.
 *
 * 🔴 Bu dosya SERİLEŞTİRİCİYİ DEĞİŞTİRMEZ. Yalnız "üreteceğim XML geçersiz
 * olacak" durumunu ÖNCEDEN ve AÇIKÇA söyler.
 */

import type { ValidationError } from '../../errors/ubl-build-error';
import { isNonEmpty } from '../../utils/formatters';

/** XSD kardinalite ihlali — GİB kapısında `cvc-complex-type.*` olarak döner. */
function xsdCardinality(path: string, expected: string, actual: string, message: string): ValidationError {
  return { code: 'XSD_CARDINALITY', message, path, expected, actual };
}

/**
 * `RoadTransportType` → `cbc:LicensePlateID` **1..1**.
 *
 * XSD kanıtı (`UBL-CommonAggregateComponents-2.1.xsd:2576-2580`):
 * ```xml
 * <xsd:complexType name="RoadTransportType">
 *   <xsd:sequence>
 *     <xsd:element ref="cbc:LicensePlateID"/>   <!-- maxOccurs YOK → varsayılan 1 -->
 *   </xsd:sequence>
 * </xsd:complexType>
 * ```
 *
 * 🔴 ÖLÇÜLDÜ (canlı doğrulayıcı, paket 2026-08-05): iki plakalı irsaliye
 * «Satır 78: cvc-complex-type.2.4.d: Invalid content was found starting with
 * element 'cbc:LicensePlateID'. No child element is expected at this point.»
 * ile REDDEDİLİYOR. `delivery-serializer.serializeTransportMeans` N plakayı TEK
 * `cac:RoadTransport` içine basıyor ve UYARI VERMİYORDU.
 *
 * ── Neden "hata", neden "N düğüme böl" değil
 * İkinci plakayı `cac:ShipmentStage` çoğaltarak taşımak bir ÜRÜN kararıdır
 * (hangi aşama hangi sürücüyü taşır — GİB kılavuzu gerekir) ve girdide karşılığı
 * olmayan bir yapı uydurmak demektir. Bu yüzden kapı KAPATILIR, yol GÖSTERİLİR:
 * dorse/römork plakasının GİB'deki kanonik yeri `cac:TransportHandlingUnit` →
 * `cac:TransportEquipment` → `cbc:ID`'dir (B-49). Ham katmanda
 * `shipment.transportHandlingUnits`, Simple katmanında `shipment.trailerPlates`
 * bu yolu ZATEN açar — açık olmayan tek şey ham API'nin bu kapısıydı.
 */
export function licensePlateCardinalityRule(
  plates: ReadonlyArray<{ plateNumber?: string; schemeId?: string }> | undefined,
  path: string,
): ValidationError[] {
  const emitted = (plates ?? []).filter(p => (p.plateNumber ?? '').trim() !== '');
  if (emitted.length <= 1) return [];

  const extras = emitted.slice(1).map(p => `${p.plateNumber}${p.schemeId ? ` (${p.schemeId})` : ''}`);
  return [
    xsdCardinality(
      path,
      'tek plaka (cac:RoadTransport/cbc:LicensePlateID XSD\'de 1..1)',
      `${emitted.length} plaka`,
      'Bir `cac:RoadTransport` içine yalnız TEK plaka yazılabilir (UBL-TR XSD 1..1); '
        + `${emitted.length} plaka verildi. Fazlalık: ${extras.join(', ')}. `
        + 'Dorse/römork plakası `shipment.transportHandlingUnits` altına '
        + '(Simple katmanında `shipment.trailerPlates`) yazılmalıdır — GİB\'in kanonik '
        + 'yeri `cac:TransportHandlingUnit/cac:TransportEquipment/cbc:ID`\'dir (B-49).',
    ),
  ];
}

/* ══════════════════════════════════════════════════════════════════════════
 * YOLCUBERABERFATURA üçlüsü
 *
 * Üçü de S2b'nin canlı turunda çıktı, S2b ÖNCESİNDEN geliyor ve üçü de AYNI
 * sınıf: serileştirici düğümü yazıyor, zorunlu çocuğu YAZAMIYOR, doğrulayıcı
 * SUSUYOR. Canlı ölçüm (paket 2026-08-05, ÜÇ örnekte birden — `examples/
 * 20-yolcu-beraber-istisna-yabanci` + iki matris senaryosu):
 *
 *   "NationalityID" elementi bu konumda geçersiz. Beklenen: FirstName.
 *   "IdentityDocumentReference" içeriği eksik. Zorunlu element(ler): IssueDate.
 *   "TaxRepresentativeParty" içeriği eksik. Zorunlu element(ler): PostalAddress.
 *
 * Şematron ÜÇÜNÜ DE temiz geçiyor (`validSchematron: true`) — bu yüzden
 * şematron-güdümlü doğrulayıcımız hiçbir şey göremiyordu.
 * ══════════════════════════════════════════════════════════════════════════ */

/** `cac:Person` alanları — yüklem yalnız bunları görür, belge türünü görmez. */
export interface PersonCardinalityFields {
  firstName?: string;
  familyName?: string;
  middleName?: string;
  nationalityId?: string;
  passportId?: string;
}

/**
 * `PersonType` → `cbc:FirstName` **1..1** ve `cbc:FamilyName` **1..1**.
 *
 * XSD kanıtı (`UBL-CommonAggregateComponents-2.1.xsd:2239-2250`):
 * ```xml
 * <xsd:complexType name="PersonType">
 *   <xsd:sequence>
 *     <xsd:element ref="cbc:FirstName"/>                    <!-- 1..1 -->
 *     <xsd:element ref="cbc:FamilyName"/>                   <!-- 1..1 -->
 *     …
 *     <xsd:element ref="cbc:NationalityID" minOccurs="0"/>
 *     <xsd:element ref="cac:IdentityDocumentReference" minOccurs="0"/>
 * ```
 *
 * 🔴 AÇIK NEREDEYDİ: yerleşik taraflarda `cac:Person` yalnız `taxIdType='TCKN'`
 * dalında yazılır ve `validateParty` orada ad+soyad ZORUNLU kılar — o yol
 * kapalıydı. `serializeBuyerCustomerParty` ise Person'ı `nationalityId`
 * DOLUYSA da yazar (pasaportlu turist), ve o dalda ad/soyad isteyen kimse
 * yoktu. Sonuç: yalnız `<cbc:NationalityID>` taşıyan, XSD'ye göre HER ZAMAN
 * geçersiz bir `cac:Person`.
 *
 * ⚠️ Canlı doğrulayıcı yalnız `FirstName`i bildirir (ilk ihlalde durur);
 * `FamilyName` de 1..1'dir ve XSD'den okunmuştur.
 *
 * Yüklem "düğüm YAZILACAK MI" sorusunu girdiden yanıtlar: hiçbir kişi alanı
 * dolu değilse `cac:Person` hiç yazılmaz (serileştirici içi boş Person üretmez)
 * ve ihlal de yoktur.
 */
export function personNameCardinalityRule(
  person: PersonCardinalityFields | undefined,
  path: string,
): ValidationError[] {
  if (!person) return [];

  const willBeEmitted = isNonEmpty(person.firstName) || isNonEmpty(person.familyName)
    || isNonEmpty(person.middleName) || isNonEmpty(person.nationalityId)
    || isNonEmpty(person.passportId);
  if (!willBeEmitted) return [];

  const missing: string[] = [];
  if (!isNonEmpty(person.firstName)) missing.push('firstName (cbc:FirstName)');
  if (!isNonEmpty(person.familyName)) missing.push('familyName (cbc:FamilyName)');
  if (missing.length === 0) return [];

  return [
    xsdCardinality(
      path,
      'cac:Person yazılıyorsa cbc:FirstName + cbc:FamilyName (XSD 1..1)',
      `eksik: ${missing.join(', ')}`,
      `\`cac:Person\` düğümü yazılacak (uyruk/pasaport/ad alanlarından biri dolu) ama `
        + `${missing.join(' ve ')} boş. UBL \`PersonType\` ikisini de ZORUNLU kılar; `
        + 'eksik hâlde üretilen XML GİB kapısında «"NationalityID" elementi bu konumda '
        + 'geçersiz. Bu noktada beklenen: FirstName» ile reddedilir.',
    ),
  ];
}

/** `cac:*DocumentReference` alanları — `DocumentReferenceType` gövdesi. */
export interface DocumentReferenceCardinalityFields {
  id?: string;
  issueDate?: string;
}

/**
 * `DocumentReferenceType` → `cbc:ID` **1..1** ve `cbc:IssueDate` **1..1**.
 *
 * XSD kanıtı (`UBL-CommonAggregateComponents-2.1.xsd`, `DocumentReferenceType`):
 * ```xml
 * <xsd:element ref="cbc:ID"/>
 * <xsd:element ref="cbc:IssueDate"/>       <!-- minOccurs YOK → 1..1 -->
 * ```
 *
 * `cac:IdentityDocumentReference` (YOLCUBERABER pasaportu) da bu tiptendir.
 * Canlı: «"IdentityDocumentReference" elementinin içeriği eksik. Zorunlu
 * element(ler): IssueDate.»
 *
 * ── S3'te ÇIKMAZDI — ARTIK DEĞİL: girdi YÜZEYİ genişletildi
 * `M6/B-32`den farkı buydu: `validateDocumentReference` (sipariş/irsaliye/
 * fatura referansları) aynı kuralı zaten uyguluyordu ÇÜNKÜ o girdilerde
 * `issueDate` ALANI VARDI. Pasaportta ALAN YOKTU — ne `PartyInput`te ne
 * `SimpleBuyerCustomerInput`ta bir "pasaport düzenlenme tarihi" slotu vardı,
 * dolayısıyla kural doğru olduğu hâlde KAPATILAMIYORDU. S3 JSDoc'unda sayılan
 * iki yoldan (a) uygulandı: `PartyInput.passportIssueDate` ←
 * `SimpleBuyerCustomerInput.passportIssueDate` eklendi ve
 * `serializeIdentityDocumentReference` artık `cbc:IssueDate` emit ediyor.
 *
 * ⚠️ Kural GEVŞEMEDİ: pasaport numarası verilip TARİH verilmeyen belge hâlâ
 * durur. Normatif lafız tarihi ZORUNLU kılar ve yazılamadığı durumda
 * `2005-01-01` sabitine izin verir (Gümrük İşlemleri Kılavuzu V1.8 §4.2.1;
 * UBL-TR Common Schematron §170 `IssueDate >= 2005-01-01` ile uyumludur) — o
 * sabiti KÜTÜPHANE KOYMAZ, veri uydurmak olurdu; çağıran bilerek verir.
 */
export function documentReferenceCardinalityRule(
  ref: DocumentReferenceCardinalityFields | undefined,
  path: string,
  elementName: string,
): ValidationError[] {
  if (!ref) return [];
  // Düğüm yalnız `ID` doluyken yazılır — boş referans hiç emit edilmez, ihlal de yok.
  if (!isNonEmpty(ref.id)) return [];
  if (isNonEmpty(ref.issueDate)) return [];

  return [
    xsdCardinality(
      path,
      `cac:${elementName} yazılıyorsa cbc:IssueDate (XSD 1..1)`,
      'issueDate boş',
      `\`cac:${elementName}\` düğümü yazılacak ama \`cbc:IssueDate\` boş. UBL `
        + '`DocumentReferenceType` tarihi ZORUNLU kılar; eksik hâlde üretilen XML GİB '
        + `kapısında «"${elementName}" elementinin içeriği eksik. Zorunlu element(ler): `
        + 'IssueDate» ile reddedilir.',
    ),
  ];
}

/**
 * `PartyType` → `cac:PostalAddress` **1..1**.
 *
 * XSD kanıtı (`UBL-CommonAggregateComponents-2.1.xsd`, `PartyType`):
 * ```xml
 * <xsd:element ref="cac:PartyIdentification" maxOccurs="unbounded"/>
 * <xsd:element ref="cac:PartyName" minOccurs="0"/>
 * <xsd:element ref="cac:PostalAddress"/>          <!-- minOccurs YOK → 1..1 -->
 * ```
 *
 * `cac:TaxRepresentativeParty` da `PartyType`tır (sarmalayıcı `cac:Party`
 * YOKTUR). `serializeTaxRepresentativeParty` adresi `trp.postalAddress`ten
 * okur; alan OPSİYONEL olduğu için adressiz aracı kurum sessizce geçersiz XML
 * üretiyordu. Canlı: «"TaxRepresentativeParty" elementinin içeriği eksik.
 * Zorunlu element(ler): PostalAddress.»
 *
 * ⚠️ KAPSAM: yüklem saftır, hangi tarafa bağlanacağını BAĞLAMA tablosu söyler.
 * Yerleşik taraflar (`supplier`/`customer`) bu yüklemi ALMAZ çünkü orada adres
 * KOŞULSUZ yazılır (`partyInputToModel.address = party`) ve il/ilçe eksikliği
 * `validatePartyAddressFields` (B-34) tarafından zaten yakalanır.
 */
export function partyPostalAddressCardinalityRule(
  address: unknown,
  path: string,
  elementName: string,
): ValidationError[] {
  if (address) return [];
  return [
    xsdCardinality(
      path,
      `cac:${elementName} içinde cac:PostalAddress (XSD 1..1)`,
      'postalAddress verilmedi',
      `\`cac:${elementName}\` bir UBL \`PartyType\`tır ve \`cac:PostalAddress\` onda `
        + 'ZORUNLUDUR (1..1). Adres verilmediği için üretilecek XML GİB kapısında '
        + `«"${elementName}" elementinin içeriği eksik. Zorunlu element(ler): `
        + 'PostalAddress» ile reddedilir.',
    ),
  ];
}
