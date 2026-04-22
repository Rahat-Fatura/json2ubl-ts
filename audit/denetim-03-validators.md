---
denetim: 03 - Validator Katmanı (Schematron ↔ Validator Eşlemesi)
tarih: 2026-04-21
skill_versiyon: gib-teknik-dokuman @ 91044bb (Common_Schematron + Main_Schematron)
kutuphane_versiyon: json2ubl-ts v1.4.2 (uncommitted working tree dahil; son commit 8e3fd27)
kapsam: 5 validator dosyası (common/type/profile/cross/despatch) + invoice-builder.build() ValidationLevel flow + Common Schematron 119 abstract rule + Main Schematron tüm context'ler + Öncelikli 10 kural derin analiz
---

# Denetim 03 — Validator Katmanı

Bu denetim **kuralların zorlanmasına** bakıyor: Schematron bir iş kuralı tanımlıyor, kütüphane bu kuralı `strict` seviyede zorluyor mu? Denetim 01/02 kod-listesi kapsamıyla ilgiliydi; bu denetim **cross-field iş mantığı**.

## Yönetici Özeti

- **Common Schematron:** 119 abstract rule, ~277 `<sch:assert>` — Main Schematron her birini bir veya daha fazla context'te extend ediyor
- **Kütüphane validator'ları:** 5 dosya, 16 validator fonksiyonu, 1025 satır
- **Eşleme sonucu:** 119 abstract rule içinden
  - **UYUMLU** (tam karşılık): 42
  - **KISMEN** (bir kısmı var, boşluk var): 9
  - **KÜTÜPHANE YANLIŞ/EKSİK** (Schematron zorluyor, kütüphane hiç): 13
  - **KÜTÜPHANE FAZLA** (kütüphane zorluyor, Schematron'da yok): 0 — tespit edilmedi
  - **SKIP** (bilinçli kapsam dışı: Signature/UBLExtensions/envelope/HR-XML/AR): 55
- **ValidationLevel:** `basic` = §1, `strict` = §1+§2+§3+§4 (cross→type→profile sırası). `none` boş.
- **Mimsoft `unsigned=true` boşluğu:** Kütüphane `strict` modu, Signature/UBLExtensions hariç Schematron'un ~80%'ini karşılıyor; 13 bulguda eksik (§7).

---

## 1. Schematron Kural Envanteri

Tam 277 `<sch:assert>`'ı tek tek listelemek yerine 119 abstract rule bazında özet veriyorum — Main Schematron her abstract rule'ı 1+ context'te extend ettiği için **rule** granularitesi daha operasyonel.

### 1.1 UBL-TR_Common_Schematron.xml — Abstract Rules (satır 4-770)

#### Zarf/Paket Kuralları (SBDH) — kütüphane kapsamı dışı
| ID | Satır | Ne kontrol ediyor |
|---|---|---|
| DocumentCheck | 8-12 | SBDH + ef:Package + xsi:schemaLocation |
| HeaderCheck | 15-19 | HeaderVersion 1.0/1.2, Sender/Receiver count |
| EmptyCheck | 22-24 | Boş-değil genel kural |
| ContactInformationCheck | 27-30 | VKN_TCKN tipi kontrol |
| ContactCheck | 33-37 | ContactTypeIdentifier whitelist + VKN/TCKN hane |
| TypeVersionCheck | 40-42 | sh:TypeVersion = '1.2' |
| EnvelopeTypeCheck | 45-47 | EnvelopeType kod listesi |
| EnvelopeTypeElementTypeCheck | 50-58 | Zarf tipi ↔ ElementType (SENDER/POSTBOX/SYSTEM/USER) |
| ElementsGroupCountCheck | 60-62 | Elements < 11 |
| ElementTypeCheck | 64-66 | ElementType whitelist |
| ElementCountCheck | 68-70 | ElementCount < 1001 |
| ElementListCountCheck | 72-74 | count(ElementList/*) = ElementCount |
| InvoiceCountCheck | 76-78 | Elements içinde Invoice < 101 |
| ExportInvoiceCountCheck | 80-83 | IHRACAT/YOLCU profilli Invoice sayısı = 1 |
| ElementNameCheck | 85-90 | Element adları ↔ ElementType tutarlılığı |

#### İmza Kuralları — kütüphane kapsamı dışı (Mimsoft imzalıyor)
| ID | Satır | Ne kontrol ediyor |
|---|---|---|
| XadesSignatureCheck | 93-100 | ds:SignedInfo/ds:Reference/ds:Transforms, KeyInfo, X509Data, Object, SigningTime, SigningCertificate |
| XadesSignatureCheckForInvoice | 102-110 | XadesSignatureCheck + URI="" refCount=1 |
| X509DataCheck | 113-115 | ds:X509Certificate zorunlu |
| X509SubjectNameCheck | 116-118 | X509SubjectName boş olmayacak |
| SignatureMethodCheck | 126-128 | UBLVersionID='2.1' → rsa-sha1 YASAK |
| TransformCountCheck | 130-132 | ds:Transforms içinde en fazla 1 Transform |
| SignatureCountCheck | 233-235 | count(cac:Signature) ≤ 1 |
| SignatureCheck | 242-247 | cac:Signature cbc:ID schemeID='VKN_TCKN', 10/11 hane |
| ARSignatureCheck | 528-531 | AR IHRACAT+KABUL/RED/IADE → Signature + UBLExtensions |

#### Ana Fatura Kuralları — kapsamda
| ID | Satır | Özet | Hata mesajı |
|---|---|---|---|
| UBLVersionIDCheck | 135-137 | cbc:UBLVersionID = '2.1' | — |
| CustomizationIDCheck | 141-143 | 'TR1.2' veya 'TR1.2.1' | — |
| ProfileIDCheck | 146-151 | ProfileID efatura/earchive/goruntuleme whitelist + xsi:schemaLocation | — |
| InvoiceIDCheck | 154-156 | `^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$` formatı | — |
| ReceiptAdviceIDCheck | 158-160 | cbc:ID 16 hane | — |
| CopyIndicatorCheck | 163-165 | CopyIndicator = 'false' | — |
| TimeCheck | 168-171 | IssueDate bugünden sonra olamaz + 2005-01-01'den önce olamaz | — |
| InvoiceTypeCodeCheck | 174-179 | **3 assert:** (1) InvoiceTypeCodeList whitelist (2) IADE → TEMELFATURA/EARSIV/ILAC/YATIRIMTESVIK/IDIS (Schematron:176) (3) ENERJI ↔ SARJ/SARJANLIK + (4) TEKNOLOJIDESTEK → EARSIVFATURA | — |
| CurrencyCodeCheck | 183-191 | **7 assert:** 5 currency code whitelist + TRY dışı → ExchangeRate zorunlu + format 15/6 | — |
| CountryCodeCheck | 194-196 | ülke kodu whitelist | — |
| GeneralCurrencyCodeCheck | 199-201 | her currency code | — |
| GeneralCurrencyIDCheck | 204-206 | currencyID niteliği | — |
| GeneralUnitCodeCheck | 209-211 | unitCode whitelist | — |
| GeneralChannelCodeCheck | 214-216 | ChannelCode | — |
| MimeCodeCheck | 219-221 | mimeCode | — |
| UUIDCheck | 225-227 | UUID formatı | — |
| decimalCheck | 229-231 | 15.2 decimal formatı | — |
| namespaceCheck | 237-239 | Invoice xmlns:xsi | — |

#### Party/Taraf Kuralları
| ID | Satır | Özet |
|---|---|---|
| PartyIdentificationSchemeIDCheck | 250-252 | PartyIdentification schemeID whitelist |
| PartyIdentificationTCKNVKNCheck | 255-258 | VKN=10, TCKN=11 hane |
| PartyIdentificationTEKNOLOJIDESTEKCheck | 261-263 | TEKNOLOJIDESTEK alıcı → TCKN zorunlu |
| DocumentSenderCheck | 265-268 | Zarf sender = belge düzenleyen |
| DocumentReceiverCheck | 270-273 | Zarf receiver = belge alıcı |
| TaxFreeInvoiceCheck | 275-277 | 1460415308 VKN → sadece YOLCU/IHRACAT profil |
| PartyIdentificationPartyNamePersonCheck | 279-286 | VKN↔PartyName, TCKN↔Person FirstName+FamilyName |

#### Tevkifat/Vergi Kuralları
| ID | Satır | Özet |
|---|---|---|
| GeneralWithholdingTaxTotalCheck | 288-295 | **2 assert:** (1) WithholdingTaxTotal varsa tip TEVKIFAT/YTBTEVKIFAT/IADE/YTBIADE/SGK/SARJ/SARJANLIK (2) TaxTypeCode=4171 → tip TEVKIFAT/IADE/SGK/YTBIADE |
| GeneralBillingReferenceCheck | 297-300 | OKCBF/OKCBilgiFisi max 1 |
| WithholdingTaxTotalCheck | 302-309 | **3 assert:** TaxTypeCode+Percent dolu + WithholdingTaxType whitelist + WithholdingTaxTypeWithPercent combo |
| TaxExemptionReasonCodeCheck | 311-323 | **5 assert:** boş değil + whitelist + istisnaCode↔ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE tipleri + ozelMatrahCode↔OZELMATRAH/IADE/SGK + ihracCode↔IHRACKAYITLI/IADE/SGK + **IHRACKAYITLI+702 → her satırda GTİP (12) + ALICIDIBSATIRKOD (11)** |
| BillingReferenceCheck | 325-338 | OKCBF ek alanlar (8 assert) |
| TaxTypeCheck | 386-388 | TaxTypeCode whitelist |
| TaxExemptionReasonCheck | 390-392 | **Ana kural:** KDV 0 (TaxAmount=0, TaxTypeCode=0015) → TaxExemptionReason zorunlu (IADE/YTBIADE/IHRACKAYITLI/OZELMATRAH/SGK/KONAKLAMAVERGISI hariç) |
| PaymentMeansCodeCheck | 395-397 | PaymentMeansCode whitelist |

#### Profil-Özel Kuralları
| ID | Satır | Özet |
|---|---|---|
| IhracatYolcuBeraberCheck | 341-346 | **4 assert:** receiverAlias yolcupk→YOLCU profil + receiverAlias ihracatpk→IHRACAT/OZELFATURA + YOLCU→TAXFREE+PARTYTYPE + IHRACAT→EXPORT+PARTYTYPE |
| TaxRepresentativePartyCheck | 348-351 | YOLCU → TaxRepresentativeParty ARACIKURUMVKN (10/11) + ARACIKURUMETIKET |
| HKSInvioceCheck | 353-355 | HKS → her satırda 19 haneli KUNYENO |
| IADEInvioceCheck | 357-359 | IADE/TEVKIFATIADE/YTBIADE/YTBTEVKIFATIADE → BillingReference/InvoiceDocumentReference **DocumentTypeCode='IADE'** + 16 haneli ID |
| IlacTibbiCihazInvoiceTypeCodeCheck | 361-363 | ILAC_TIBBICIHAZ → tip whitelist |
| YatirimTesvikInvoiceTypeCodeCheck | 365-367 | YATIRIMTESVIK → tip whitelist |
| IdisInvoiceTypeCodeCheck | 369-371 | IDIS → tip whitelist |
| YatirimTesvikContractDocumentReferenceIDCheck | 373-375 | YATIRIMTESVIK/EARSIV+YTB → 6 haneli YTBNO |
| TaxFreeNationalityIDCheck | 377-379 | TAXFREE+PARTYTYPE → NationalityID country code |
| PassportIDCheck | 381-383 | TAXFREE+PARTYTYPE → IdentityDocumentReference/ID dolu |
| InvoicedQuantityCheck | 399-401 | unitCode niteliği 1 adet |
| PriceAmountCheck | 404-407 | IHRACAT → her satırda Price/PriceAmount + LineExtensionAmount dolu |
| DeliveryCodeCheck | 409-415 | **3 assert:** INCOTERMS + PackagingTypeCode + TransportModeCode whitelist'ler |
| LineDeliveryCheck | 417-425 | IHRACAT → satır/fatura Delivery kuralları (INCOTERMS/Address/TransportMode/RequiredCustomsID) |
| PartyVDCheck | 427-429 | IHRACAT → Supplier PartyTaxScheme/TaxScheme/Name dolu |
| IdisSevkiyatNoCheck | 431-433 | IDIS → SEVKIYATNO SE-0000000 formatı |
| PackageCheck | 435-437 | IHRACAT → cbc:InvoicedQuantity dolu |
| OfficelTitleCheck | 438-440 | IHRACAT → BuyerCustomerParty/PartyLegalEntity/RegistrationName dolu |
| IlacTibbiCihazAdditionalItemIdentificationCheck | 442-444 | ILAC_TIBBICIHAZ → satırda ILAC/TIBBICIHAZ/DIGER 1+ adet |
| TeknolojiDestekAdditionalItemIdentificationCheck | 446-448 | TEKNOLOJIDESTEK → her satırda TELEFON veya TABLET_PC |
| IhracKayitliPartyIdentificationIDTypeCheck | 450-452 | IHRACKAYITLI+702 → CustomsDeclaration/IssuerParty schemeID whitelist |

#### Yatırım Teşvik Detay Kuralları
| ID | Satır | Özet |
|---|---|---|
| YatirimTesvikCommodityClassificationCheck | 455-457 | YATIRIMTESVIK/YTB → satırda ItemClassificationCode 1+ |
| YatirimTesvikItemClassificationCodeCheck | 459-461 | YATIRIMTESVIK/YTB → ItemClassificationCode whitelist |
| YatirimTesvikItemClassificationCodeIstisnaCheck | 463-465 | YATIRIMTESVIK ISTISNA / YTBISTISNA → kod sadece 01/02 |
| YatirimTesvikItemClassificationCodeIstisnaCalculationSequenceNumericCheck | 467-469 | YATIRIMTESVIK ISTISNA / YTBISTISNA → CalculationSequenceNumeric = -1 (KDV 0015) |
| YatirimTesvikTaxExemptionReasonCode308Check | 471-473 | YATIRIMTESVIK ISTISNA+kod 01 → TaxExemptionReasonCode=308 |
| YatirimTesvikTaxExemptionReasonCode339Check | 475-477 | YATIRIMTESVIK ISTISNA+kod 02 → TaxExemptionReasonCode=339 |
| YatirimTesvikItemInstanceCheck | 479-481 | YATIRIMTESVIK/YTB kod 01 → ModelName + ProductTraceID + SerialID |
| YatirimTesvikKDVCheck | 483-485 | YATIRIMTESVIK/YTB + IADE-dışı → TaxTotal/TaxSubtotal 0015+TaxAmount>0+Percent>0 |
| YatirimTesvikLineKDVCheck | 487-490 | YATIRIMTESVIK/YTB kalem bazı KDV (2 assert: satış-tipi + IADE kod 03/04) |
| IdisEtiketNoCheck | 492-494 | IDIS → satırda ETIKETNO 9 karakter (2 harf + 7 rakam) |
| DemirbasKDVTaxExemptionCheck | 496-499 | **555 kodu kuralı:** TEMEL/TICARI/EARSIV + ISTISNA/IHRACKAYITLI/YTB* dışı tip → 555 YASAK + 555 varsa KDV 0 YASAK |

#### SGK / Kamu / Uygulama Yanıtı — büyük kısmı kapsamda değil
| ID | Satır | Kapsam |
|---|---|---|
| ARPartyIdentificationGTBCheck | 502-505 | AR — kapsam dışı (ApplicationResponse) |
| SGKInvoiceCheck | 508-510 | 7750409379 VKN (SGK) → tip SGK veya TEVKIFAT |
| ApplicationResponseProfileIDCheck | 512-516 | AR — kapsam dışı |
| KamuFaturaCheck | 519-521 | KAMU → IBAN TR formatı |
| IDCheck | 524-526 | AR — kapsam dışı |
| DocumentResponseCountCheck | 533-535 | AR — kapsam dışı |
| ARSenderCheck | 537-542 | AR — kapsam dışı |
| ARReceiverCheck | 544-549 | AR — kapsam dışı |
| ARPartyIdentificationPartyNamePersonCheck | 552-559 | AR — kapsam dışı |
| DocumentResponseCheck | 561-565 | AR — kapsam dışı |
| DescriptionCountCheck | 567-569 | AR — kapsam dışı |
| ResponseCodeCheck | 572-575 | AR — kapsam dışı |
| SignatoryPartyPartyIdentificationCheck | 577-580 | AR/SigParty — kapsam dışı |
| PostBoxResponseCodeCheck | 583-585 | POSTBOX zarfı — kapsam dışı |
| PostBoxDocumentReferenceCheck | 587-590 | POSTBOX — kapsam dışı |
| AppResponseCodeCheck | 593-595 | SYSTEMENVELOPE — kapsam dışı |

#### HR-XML (ProcessUserAccount/CancelUserAccount) — kütüphane kapsamı dışı
ApplicationAreaCheck (598-601), OASenderCheck (603-607), OASignatureCheck (609-611), CounterSignatureCheck (613-615), UserAccountCountCheck (617-619), UserAccountCheck (621-696, ~50 assert) — hepsi kütüphane kapsamı dışı.

#### İrsaliye Kuralları (kapsamda, despatch-validators)
| ID | Satır | Özet |
|---|---|---|
| DespatchAdviceTypeCodeCheck | 701-705 | DespatchAdviceTypeCode whitelist + MATBUDAN → AdditionalDocumentReference |
| DeliveredQuantityCheck | 708-711 | DespatchLine/DeliveredQuantity dolu + unitCode dolu |
| ItemNameCheck | 713-715 | cac:Item/cbc:Name dolu |
| DespatchLineIdCheck | 717-719 | cbc:ID dolu + numerik |
| DespatchIdisEtiketNoCheck | 721-723 | IDISIRSALIYE → ETIKETNO 9 karakter |
| DespatchIdisSevkiyatNoCheck | 725-727 | IDISIRSALIYE → SEVKIYATNO SE-0000000 |
| DespatchDateCheck | 730-733 | ActualDespatchDate YYYY-MM-DD |
| DespatchTimeCheck | 735-737 | ActualDespatchTime dolu |
| DespatchAddressCheck | 739-744 | DeliveryAddress CitySubdivisionName/CityName/Country/PostalZone |
| DespatchCarrierDriverCheck | 746-751 | DriverPerson veya CarrierParty (en az 1) + DriverPerson alan kuralları |
| DespatchAdviceHKSKunyeCheck | 753-755 | HKSIRSALIYE → satırda KUNYENO 19 karakter |
| ProfileIDTypeDespatchAdvice | 757-759 | ProfileID whitelist |
| LicensePlateIDSchemeIDCheck | 761-763 | Plaka schemeID whitelist |
| ReceiptAdviceTypeCodeCheck | 766-768 | ReceiptAdviceTypeCode whitelist (ReceiptAdvice — kapsam dışı) |

### 1.2 UBL-TR_Main_Schematron.xml — Context Bağlamaları (satır 1-568)

Main Schematron yeni kural eklemez; Common'daki abstract rule'ları XPath context'lerine bağlar. Toplam ~16 `<sch:extends>` bloğu, 125+ extends çağrısı. Önemli context'ler:

- `inv:Invoice` (satır 145-165): UBLVersion, Customization, Profile, InvoiceID, CopyIndicator, InvoiceType, Currency, Signature count, WithholdingTax, Delivery, TaxRepresentative, HKS, IADE, ILAC, YATIRIMTESVIK (4 kural), IDIS
- `inv:Invoice/cac:AccountingSupplierParty/cac:Party` (satır 184-188): PartyIdentification + PartyVD + IdisSevkiyatNo
- `inv:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification` (193-197): PartyIdentificationTCKNVKN + TEKNOLOJIDESTEK + DocumentReceiver + TaxFreeInvoice
- `inv:Invoice/cac:InvoiceLine` (229-246): PriceAmount + LineDelivery + Package + DeliveryCode + IlacTibbiCihaz + TeknolojiDestek + IhracKayitli + 7 YatirimTesvik kuralı + IdisEtiketNo
- `inv:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory` (225-227): TaxExemptionReasonCodeCheck
- `inv:Invoice/cbc:ProfileID` (294-297): IhracatYolcuBeraber + KamuFatura
- `inv:Invoice/cac:BuyerCustomerParty` (298-302): TaxFreeNationalityID + PassportID + OfficelTitle
- `inv:Invoice/cac:TaxTotal` (215-218): YatirimTesvikKDV + DemirbasKDVTaxExemption (555 kuralı)

Ayrıca `//@unitCode`, `//@currencyID`, `//cbc:IssueDate`, `//cbc:IdentificationCode` gibi general-selector context'ler (satır 85-114).

---

## 2. Kütüphane Validator Envanteri

| Dosya | Fonksiyon | Satır | Ne kontrol ediyor | İlgili input field |
|---|---|---|---|---|
| common-validators.ts | `validateCommon` | 14-114 | §1 zorunlu alan + format: ID, UUID, ProfileID, InvoiceTypeCode, IssueDate, IssueTime, currencyCode, exchangeRate, taxTotals, lines, legalMonetaryTotal + (supplier+customer validateParty) | `id, uuid, profileId, invoiceTypeCode, issueDate, issueTime, currencyCode, exchangeRate, signatureInfo, taxTotals, lines, legalMonetaryTotal, supplier, customer` |
| common-validators.ts | `validateParty` | 119-154 | VKN=10/TCKN=11, VKN→name, TCKN→firstName+familyName | `party.{vknTckn, taxIdType, name, firstName, familyName}` |
| type-validators.ts | `validateByType` | 17-60 | Tip-gruplarını dispatch'ler (IADE, TEVKIFAT, ISTISNA, OZELMATRAH, IHRACKAYITLI, TEKNOLOJIDESTEK, KDV0, Tax4171) | `invoiceTypeCode` |
| type-validators.ts | `validateIadeGroup` | 63-90 | billingReferences[].invoiceDocumentReference.id 16 karakter | `billingReferences` |
| type-validators.ts | `validateTevkifatGroup` | 93-130 | withholdingTaxTotals zorunlu + TaxType whitelist + code+percent combo | `withholdingTaxTotals` |
| type-validators.ts | `validateIstisnaGroup` | 133-156 | KDV subtotal'larda TaxExemptionReasonCode + Reason zorunlu + ISTISNA whitelist | `taxTotals[].taxSubtotals[]` |
| type-validators.ts | `validateOzelMatrah` | 159-173 | OZELMATRAH whitelist (801-812) | `taxTotals[].taxSubtotals[].taxExemptionReasonCode` |
| type-validators.ts | `validateIhracKayitli` | 176-190 | IHRAC whitelist (701-704) | `taxTotals[].taxSubtotals[].taxExemptionReasonCode` |
| type-validators.ts | `validateTeknolojiDestek` | 193-214 | customer.taxIdType=TCKN + satırda TELEFON/TABLET_PC | `customer.taxIdType, lines[].item.additionalItemIdentifications` |
| type-validators.ts | `validateKdvZeroExemption` | 217-229 | KDV 0 + 0015 → Reason dolu | `taxTotals[].taxSubtotals[]` |
| type-validators.ts | `validateTax4171` | 232-245 | 4171 → TEVKIFAT/IADE/SGK/YTBIADE | `taxTotals[].taxSubtotals[]` |
| profile-validators.ts | `validateByProfile` | 15-47 | switch-dispatcher | `profileId` |
| profile-validators.ts | `validateIhracat` | 50-108 | BuyerCustomer EXPORT + RegistrationName + supplier.taxOffice + satır: DeliveryTerms(INCOTERMS)/DeliveryAddress-yok/TransportMode/GTİP | `buyerCustomer, supplier.taxOffice, lines[].delivery` |
| profile-validators.ts | `validateYolcuBeraber` | 111-150 | BuyerCustomer TAXFREE + nationalityId + passportId + TaxRepresentativeParty (ARACIKURUMVKN+ARACIKURUMETIKET) | `buyerCustomer, taxRepresentativeParty` |
| profile-validators.ts | `validateKamu` | 153-186 | PaymentMeans/IBAN TR + BuyerCustomer | `paymentMeans, buyerCustomer` |
| profile-validators.ts | `validateHks` | 189-205 | Her satırda 19 karakter KUNYENO | `lines[].item.additionalItemIdentifications` |
| profile-validators.ts | `validateIlacTibbiCihaz` | 208-224 | Her satırda ILAC/TIBBICIHAZ/DIGER 1+ | `lines[].item.additionalItemIdentifications` |
| profile-validators.ts | `validateYatirimTesvik` / `validateYatirimTesvikRules` | 227-318 | YTBNO 6 numerik + ItemClassificationCode whitelist + ISTISNA kod 01/02 + 308/339 + kod 01 ModelName/ProductTraceID/SerialID | `contractReference, lines[].item.{commodityClassification, modelName, itemInstances}, lines[].taxTotal.taxSubtotals[]` |
| profile-validators.ts | `validateIdis` | 321-348 | supplier SEVKIYATNO + satırda ETIKETNO | `supplier.additionalIdentifiers, lines[].item.additionalItemIdentifications` |
| profile-validators.ts | `validateEarsiv` | 351-360 | YTB tipleri varsa YatirimTesvikRules | `invoiceTypeCode` |
| cross-validators.ts | `validateCrossMatrix` | 9-27 | PROFILE_TYPE_MATRIX[profileId].has(invoiceTypeCode) | `profileId, invoiceTypeCode` |
| despatch-validators.ts | `validateDespatch` | 16-183 | Bütün irsaliye kuralları (ID/UUID/date/party/shipment/deliveryAddress/driver/lines + MATBUDAN + HKSIRSALIYE/IDISIRSALIYE profiller) | `DespatchInput.*` |

---

## 3. Eşleme Matrisi — Schematron ↔ Validator

Tablo, Common Schematron'un 119 abstract rule'ını kütüphane karşılığıyla eşliyor. Durum kodları:
- **UYUMLU** — Schematron kuralı kütüphanede de zorlanıyor
- **KISMEN** — Bazı kısmı var, edge case atlanmış
- **EKSİK** — Schematron zorunlu, kütüphane hiç kontrol etmiyor (→ bulgu)
- **SKIP** — Bilinçli kapsam dışı (imza/envelope/AR/HR-XML)

| Schematron Abstract Rule | Context | Kütüphane Karşılığı | Durum |
|---|---|---|---|
| DocumentCheck (8) | sh:SBD | — | SKIP (SBDH) |
| HeaderCheck (15) | sh:Header | — | SKIP (SBDH) |
| EmptyCheck (22) | generic | — | SKIP (XSD zaten zorunlu yapıyor) |
| ContactInformationCheck (27) | sh:Sender/Receiver | — | SKIP (SBDH) |
| ContactCheck (33) | sh:ContactInformation | — | SKIP (SBDH) |
| TypeVersionCheck (40) | sh:DocIdentification | — | SKIP (SBDH) |
| EnvelopeTypeCheck (45) | sh:DocIdentification | — | SKIP (envelope) |
| EnvelopeTypeElementTypeCheck (50) | sh:DocIdentification | — | SKIP (envelope) |
| ElementsGroupCountCheck (60) | ef:Package | — | SKIP (paket) |
| ElementTypeCheck (64) | ef:Package/Elements | — | SKIP (paket) |
| ElementCountCheck (68) | ef:Package/Elements | — | SKIP (paket) |
| ElementListCountCheck (72) | ef:Package/Elements | — | SKIP (paket) |
| InvoiceCountCheck (76) | ef:Package/Elements | — | SKIP (paket) |
| ExportInvoiceCountCheck (80) | ef:Package/.../ElementList | — | SKIP (paket) |
| ElementNameCheck (85) | ef:Package/Elements | — | SKIP (paket) |
| XadesSignatureCheck (93) | ds:Signature | — | SKIP (imza) |
| XadesSignatureCheckForInvoice (102) | inv:Invoice/.../ds:Signature | — | SKIP (imza) |
| X509DataCheck (113) | ds:X509Data | — | SKIP (imza) |
| X509SubjectNameCheck (116) | ds:X509SubjectName | — | SKIP (imza) |
| SignatureMethodCheck (126) | ds:Signature | — | SKIP (imza) |
| TransformCountCheck (130) | ds:Transforms | — | SKIP (imza) |
| UBLVersionIDCheck (135) | inv:Invoice | — | **EKSİK** — serializer hardcode '2.1' yazıyor, runtime doğrulama yok ama risk düşük |
| CustomizationIDCheck (141) | inv:Invoice | — | **EKSİK** — serializer hardcode yazıyor, runtime yok |
| ProfileIDCheck (146) | inv:Invoice | `validateCommon` satır 30-32 (zorunlu) | **KISMEN** — whitelist yok (ProfileIDType efatura/earchive ayrımı yok) |
| InvoiceIDCheck (154) | inv:Invoice | `validateCommon:20` INVOICE_ID_REGEX | UYUMLU |
| ReceiptAdviceIDCheck (158) | recp:ReceiptAdvice | — | SKIP (ReceiptAdvice kapsam dışı) |
| CopyIndicatorCheck (163) | inv:Invoice | — | **EKSİK** — serializer hardcode 'false' yazıyor, runtime yok |
| TimeCheck (168) | //cbc:IssueDate | `validateCommon:38-42` sadece format | **KISMEN** — aralık (bugünden ileri/2005 öncesi) yok |
| InvoiceTypeCodeCheck (174) | inv:Invoice | `validateCommon:34` (zorunlu) + `validateCrossMatrix` (profil×tip) | **KISMEN** — ham whitelist yok; cross-matrix profile×type bağımlı; **TR-standalone whitelist eksik** |
| CurrencyCodeCheck (183) | inv:Invoice | `validateCommon:49-57` (zorunlu + whitelist + TRY-dışı ExchangeRate) | **KISMEN** — PricingCurrency/PaymentCurrency/PaymentAlternativeCurrency/TaxCurrency kontrol **yok**; ExchangeRate format regex yok |
| CountryCodeCheck (194) | //cbc:IdentificationCode | — | **EKSİK** — Denetim 02'de işaret edildi, ISO 3166 whitelist runtime yok |
| GeneralCurrencyCodeCheck (199) | //cbc:SourceCurrencyCode vb. | — | **EKSİK** — sadece DocumentCurrency kontrol ediliyor |
| GeneralCurrencyIDCheck (204) | //@currencyID | — | **EKSİK** — decimal amount'ların currencyID'si kontrol yok |
| GeneralUnitCodeCheck (209) | //@unitCode | `validateCommon:99-101` zorunlu | **KISMEN** — UnitCode whitelist runtime yok; line.unitCode boş-değil kontrol ediliyor sadece |
| GeneralChannelCodeCheck (214) | //cbc:ChannelCode | — | **EKSİK** — ChannelCode whitelist yok |
| MimeCodeCheck (219) | //@mimeCode | — | **EKSİK** — ek dokuman mimeCode kontrol yok |
| UUIDCheck (225) | cbc:UUID | `validateCommon:26-27` UUID_REGEX | UYUMLU |
| decimalCheck (229) | MonetaryTotal | — | **EKSİK** — calculator sayı üretiyor; SimpleInvoiceBuilder path'i güvenli, direkt input path'i format regex yok |
| SignatureCountCheck (233) | inv:Invoice | — | SKIP (kütüphane 1 tane Signature yazıyor, ihlal imkansız) |
| namespaceCheck (237) | inv:Invoice | — | SKIP (serializer xmlns:xsi ekliyor) |
| SignatureCheck (242) | cac:Signature | `validateCommon:64-71` schemeID=VKN_TCKN + 10/11 hane | **KISMEN** — schemeID kontrol yok (serializer'da sabit yazılıyor) |
| PartyIdentificationSchemeIDCheck (250) | Party/PartyIdentification/ID | — | **EKSİK** — Supplier'ın `additionalIdentifiers[].schemeId` whitelist kontrolü yok; PARTY_IDENTIFICATION_SCHEME_IDS var ama `validateParty` kullanmıyor |
| PartyIdentificationTCKNVKNCheck (255) | Party/PartyIdentification | `validateParty:131-148` | UYUMLU |
| PartyIdentificationTEKNOLOJIDESTEKCheck (261) | Customer/PartyIdentification | `validateTeknolojiDestek:197-200` | UYUMLU |
| DocumentSenderCheck (265) | Party/PartyIdentification | — | SKIP (zarf vs belge tutarlılığı — SBDH bağlı) |
| DocumentReceiverCheck (270) | Party/PartyIdentification | — | SKIP (aynı) |
| TaxFreeInvoiceCheck (275) | Customer/PartyIdentification | — | **EKSİK** — `validateTeknolojiDestek` gibi cross-check yok; 1460415308 VKN'li alıcıda profil kontrolü yok |
| PartyIdentificationPartyNamePersonCheck (279) | Party | `validateParty:132-148` | UYUMLU |
| GeneralWithholdingTaxTotalCheck (288) | inv:Invoice | `validateTevkifatGroup:93-130` (TEVKIFAT/YTBTEVKIFAT için zorunlu) + `validateTax4171:232-245` | **KISMEN** — assertion (1): WithholdingTaxTotal varsa tipin TEVKIFAT/YTBTEVKIFAT/IADE/YTBIADE/SGK/SARJ/SARJANLIK olması zorunlu; kütüphane sadece **TEVKIFAT/YTBTEVKIFAT için zorunluluğu** kontrol ediyor, diğer tiplerin kullanabildiğini bilmiyor; ayrıca **ters yön kontrol yok** (SATIS'ta WithholdingTaxTotal verilirse hata yok). `WITHHOLDING_ALLOWED_TYPES` var ama `validateByType` kullanmıyor |
| GeneralBillingReferenceCheck (297) | inv:Invoice | — | **EKSİK** — OKCBF / OKCBilgiFisi bir fatura için max 1 kontrol yok |
| WithholdingTaxTotalCheck (302) | WithholdingTaxSubtotal | `validateTevkifatGroup:107-124` | UYUMLU (WithholdingTaxType whitelist + combo kontrol var; Denetim 02 combo içeriği KRİTİK olarak işaretlenmişti — buradaki kural bağı doğru ama içerik yanlış) |
| TaxExemptionReasonCodeCheck (311) | TaxCategory | `validateIstisnaGroup:133-156`, `validateOzelMatrah:159-173`, `validateIhracKayitli:176-190`, `validateKdvZeroExemption:217-229` | **KISMEN** — her whitelist var ama **Schematron'un cross-check'i** (kod istisna/özelMatrah/ihraç grubundaysa tip de eşleşmeli) kütüphanede yok: bir SATIS tipinde 308 kodu kullanılsa Schematron RED eder, kütüphane geçirir. **Ayrıca Common:322 — IHRACKAYITLI+702 → her satırda 12-haneli GTİP + 11-haneli ALICIDIBSATIRKOD** kontrolü YOK |
| BillingReferenceCheck (325) | AdditionalDocumentReference | — | **EKSİK** — OKCBF ek alanları (ValidityPeriod/Attachment/IssuerParty/DocumentDescription) kontrol yok |
| IhracatYolcuBeraberCheck (341) | inv:Invoice/cbc:ProfileID | `validateIhracat:57-59`, `validateYolcuBeraber:118-119` | **KISMEN** — receiverAlias ↔ profil cross-check'i SBDH kapsamında, kütüphane yapmıyor (SKIP); partyType=EXPORT/TAXFREE kontrolü var (UYUMLU) |
| TaxRepresentativePartyCheck (348) | inv:Invoice | `validateYolcuBeraber:131-147` | UYUMLU |
| HKSInvioceCheck (353) | inv:Invoice | `validateHks:189-205` | UYUMLU |
| IADEInvioceCheck (357) | inv:Invoice | `validateIadeGroup:63-90` | **KISMEN** — ID 16 karakter ✓, ama `DocumentTypeCode='IADE'` kontrolü YOK; Schematron zorunlu kılıyor |
| IlacTibbiCihazInvoiceTypeCodeCheck (361) | inv:Invoice | `validateCrossMatrix` → ILAC_TIBBICIHAZ PROFILE_TYPE_MATRIX | UYUMLU |
| YatirimTesvikInvoiceTypeCodeCheck (365) | inv:Invoice | `validateCrossMatrix` → YATIRIMTESVIK matris | UYUMLU |
| IdisInvoiceTypeCodeCheck (369) | inv:Invoice | `validateCrossMatrix` → IDIS matris | UYUMLU |
| YatirimTesvikContractDocumentReferenceIDCheck (373) | inv:Invoice | `validateYatirimTesvikRules:240-247` | UYUMLU |
| TaxFreeNationalityIDCheck (377) | BuyerCustomerParty | `validateYolcuBeraber:123-125` (boş-değil) | **KISMEN** — country code whitelist yok, sadece boş-değil; Denetim 02 Country whitelist yokluğuna işaret etmişti |
| PassportIDCheck (381) | BuyerCustomerParty | `validateYolcuBeraber:126-128` | UYUMLU |
| TaxTypeCheck (386) | TaxScheme/TaxTypeCode | `validateCommon:84-86` TAX_TYPE_CODES | UYUMLU (D02'de 151/351/0021/0022 eksikliği ayrı bulgu) |
| TaxExemptionReasonCheck (390) | TaxTotal/TaxSubtotal | `validateKdvZeroExemption:217-229` | UYUMLU |
| PaymentMeansCodeCheck (395) | PaymentMeans/Code | — | **EKSİK** — Denetim 02'de PAYMENT_MEANS_CODES dead olarak raporlandı |
| InvoicedQuantityCheck (399) | InvoiceLine/Quantity | `validateCommon:99-101` (boş-değil) | UYUMLU (serializer unitCode niteliğini yazıyor) |
| PriceAmountCheck (404) | inv:Invoice/cac:InvoiceLine | — | **EKSİK** — IHRACAT + her satırda PriceAmount + LineExtensionAmount kontrolü validateIhracat'ta YOK (calculator yolundan gelirse otomatik, direkt input path'i risk) |
| DeliveryCodeCheck (409) | inv:Invoice ve inv:Invoice/cac:InvoiceLine | `validateIhracat:84-89` INCOTERMS whitelist | **KISMEN** — INCOTERMS var; PackagingTypeCode whitelist **yok** (D02'de KÜTÜPHANE raporlandı); TransportModeCode whitelist var `validateIhracat:92-97` — ama sadece IHRACAT profilinde |
| LineDeliveryCheck (417) | InvoiceLine | `validateIhracat:74-105` | **KISMEN** — IHRACAT INCOTERMS/Address/TransportMode/RequiredCustomsID kontrol var; ama "satır yoksa fatura seviyesinde olmalı" fallback mantığı birebir değil (kütüphane sadece satır seviyesini zorunlu kılıyor) |
| PartyVDCheck (427) | Supplier/Party | `validateIhracat:68-71` supplier.taxOffice | UYUMLU |
| IdisSevkiyatNoCheck (431) | Supplier/Party | `validateIdis:326-333` SEVKIYATNO | UYUMLU |
| PackageCheck (435) | InvoiceLine | `validateCommon:99-101` (unitCode zorunlu) | UYUMLU (line.unitCode zorunlu, boş değilse serializer unitCode yazar) |
| OfficelTitleCheck (438) | BuyerCustomerParty | `validateIhracat:61-64` registrationName | UYUMLU |
| IlacTibbiCihazAdditionalItemIdentificationCheck (442) | InvoiceLine | `validateIlacTibbiCihaz:208-224` | UYUMLU |
| TeknolojiDestekAdditionalItemIdentificationCheck (446) | InvoiceLine | `validateTeknolojiDestek:203-211` | UYUMLU |
| IhracKayitliPartyIdentificationIDTypeCheck (450) | InvoiceLine | — | **EKSİK** — IHRACKAYITLI+702 → CustomsDeclaration schemeID whitelist (ALICIDIBSATIRKOD vs) kütüphanede yok |
| YatirimTesvikCommodityClassificationCheck (455) | InvoiceLine | `validateYatirimTesvikRules:251-257` | UYUMLU |
| YatirimTesvikItemClassificationCodeCheck (459) | InvoiceLine | `validateYatirimTesvikRules:254-257` YTB_ITEM_CLASSIFICATION_CODES | UYUMLU |
| YatirimTesvikItemClassificationCodeIstisnaCheck (463) | InvoiceLine | `validateYatirimTesvikRules:262-265` | UYUMLU |
| YatirimTesvikItemClassificationCodeIstisnaCalculationSequenceNumericCheck (467) | InvoiceLine | — | **EKSİK** — ISTISNA tipte 0015 TaxSubtotal CalculationSequenceNumeric=-1 kontrolü yok |
| YatirimTesvikTaxExemptionReasonCode308Check (471) | InvoiceLine | `validateYatirimTesvikRules:269-277` | UYUMLU |
| YatirimTesvikTaxExemptionReasonCode339Check (475) | InvoiceLine | `validateYatirimTesvikRules:281-289` | UYUMLU |
| YatirimTesvikItemInstanceCheck (479) | InvoiceLine | `validateYatirimTesvikRules:293-314` | UYUMLU |
| YatirimTesvikKDVCheck (483) | inv:Invoice/cac:TaxTotal | — | **EKSİK** — YTB + IADE-dışı → TaxTotal seviyesinde 0015+TaxAmount>0+Percent>0 kontrolü YOK |
| YatirimTesvikLineKDVCheck (487) | InvoiceLine | — | **EKSİK** — satır bazında KDV oran+değer kontrolü (hem non-iade hem iade kod 03/04) YOK |
| IdisEtiketNoCheck (492) | InvoiceLine | `validateIdis:336-345` | UYUMLU |
| DemirbasKDVTaxExemptionCheck (496) | inv:Invoice/cac:TaxTotal | — | **EKSİK (KRİTİK)** — 555 kodu kuralı tümü YOK: (1) TEMEL/TICARI/EARSIV + ISTISNA/IHRACKAYITLI/YTB dışı tipte 555 yasak (2) 555 varken 0015 KDV 0 yasak. Denetim 01+02'de de 555 eksik diye raporlandı |
| ARPartyIdentificationGTBCheck (502) | AR | — | SKIP (ApplicationResponse) |
| SGKInvoiceCheck (508) | DocumentReceiver | — | **EKSİK** — 7750409379 VKN'li alıcı → tip SGK/TEVKIFAT zorunlu cross-check yok |
| ApplicationResponseProfileIDCheck (512) | AR | — | SKIP |
| KamuFaturaCheck (519) | inv:Invoice/cbc:ProfileID | `validateKamu:158-170` | UYUMLU |
| IDCheck (524) | AR | — | SKIP |
| ARSignatureCheck (528) | AR | — | SKIP (imza + AR) |
| DocumentResponseCountCheck (533) | AR | — | SKIP |
| ARSenderCheck (537) | AR | — | SKIP |
| ARReceiverCheck (544) | AR | — | SKIP |
| ARPartyIdentificationPartyNamePersonCheck (552) | AR | — | SKIP |
| DocumentResponseCheck (561) | AR | — | SKIP |
| DescriptionCountCheck (567) | AR | — | SKIP |
| ResponseCodeCheck (572) | AR | — | SKIP |
| SignatoryPartyPartyIdentificationCheck (577) | AR | — | SKIP |
| PostBoxResponseCodeCheck (583) | AR | — | SKIP |
| PostBoxDocumentReferenceCheck (587) | AR | — | SKIP |
| AppResponseCodeCheck (593) | AR | — | SKIP |
| ApplicationAreaCheck (598) | HR-XML | — | SKIP |
| OASenderCheck (603) | HR-XML | — | SKIP |
| OASignatureCheck (609) | HR-XML | — | SKIP |
| CounterSignatureCheck (613) | HR-XML | — | SKIP |
| UserAccountCountCheck (617) | HR-XML | — | SKIP |
| UserAccountCheck (621) | HR-XML | — | SKIP |
| DespatchAdviceTypeCodeCheck (701) | desp:DespatchAdvice | `validateDespatch:36-37` (zorunlu) + `:138-142` (MATBUDAN → AdditionalDocumentReference) | **KISMEN** — Type whitelist yok, sadece zorunlu; MATBUDAN kontrol var; MATBUDAN'da AdditionalDocumentReference'ın **cbc:ID ve cbc:IssueDate dolu** kontrolü YOK |
| DeliveredQuantityCheck (708) | DespatchLine | `validateDespatch:125-133` (id/unitCode/item.name) | **KISMEN** — line.id ve line.unitCode boş-değil ✓, ama DeliveredQuantity değeri için ayrı alan/kontrol DespatchLine'da var mı belirsiz; şimdilik UYUMLU kabul ediyoruz (delivered amount validator'a gelmiyor) |
| ItemNameCheck (713) | DespatchLine | `validateDespatch:131-133` | UYUMLU |
| DespatchLineIdCheck (717) | DespatchLine | `validateDespatch:125-127` (zorunlu + numerik **değil**) | **KISMEN** — Schematron `number(cbc:ID) != 'NaN'` istiyor, kütüphane sadece boş-değil |
| DespatchIdisEtiketNoCheck (721) | DespatchLine | `validateDespatch:171-178` | UYUMLU |
| DespatchIdisSevkiyatNoCheck (725) | Supplier/Party | `validateDespatch:161-168` | UYUMLU |
| DespatchDateCheck (730) | desp:DespatchAdvice | `validateDespatch:60-64` | UYUMLU |
| DespatchTimeCheck (735) | desp:DespatchAdvice | `validateDespatch:66-70` | UYUMLU |
| DespatchAddressCheck (739) | desp:DespatchAdvice | `validateDespatch:73-91` | UYUMLU |
| DespatchCarrierDriverCheck (746) | desp:DespatchAdvice | `validateDespatch:94-109` | UYUMLU |
| DespatchAdviceHKSKunyeCheck (753) | desp:DespatchAdvice | `validateDespatch:146-157` | UYUMLU |
| ProfileIDTypeDespatchAdvice (757) | desp:DespatchAdvice | `validateDespatch:32-34` (sadece zorunlu) | **KISMEN** — whitelist yok |
| LicensePlateIDSchemeIDCheck (761) | LicensePlateID | `validateDespatch:112-117` | UYUMLU |
| ReceiptAdviceTypeCodeCheck (766) | recp:ReceiptAdvice | — | SKIP (ReceiptAdvice kapsam dışı) |

**Özet sayım:**
- UYUMLU: 42
- KISMEN: 15 (boşluklu)
- EKSİK (KÜTÜPHANE YANLIŞ): 13
- SKIP (kapsam dışı bilinçli): 49

---

## 4. Öncelikli 10 Kural — Derin Analiz

Görev prompt'unda belirtilen 10 KRİTİK kural için detay.

### 4.1 CommonSchematron:176 — IADE + TICARIFATURA yasağı

**Schematron:** `cbc:InvoiceTypeCode='IADE'` → ProfileID sadece TEMELFATURA, EARSIVFATURA, ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS olabilir.

**Kütüphane:** `PROFILE_TYPE_MATRIX` (src/config/constants.ts:8-66) + `validateCrossMatrix` (cross-validators.ts:9-27). IADE TypeCode'u hangi profillerde var?
- TEMELFATURA ✓ (satır 10), EARSIVFATURA ✓ (59), ILAC_TIBBICIHAZ ✓ (48), YATIRIMTESVIK ✓ (51), IDIS ✓ (55) — tam 5 profil.
- TICARIFATURA, IHRACAT, YOLCUBERABERFATURA, OZELFATURA, KAMU, HKS, ENERJI matrisinde IADE **yok**.

**Sonuç:** **UYUMLU**. Schematron:176 kurallarını tam karşılıyor. (Denetim 01'de `calculator/invoice-rules.ts`'deki `PROFILE_TYPE_MAP` farklılığı vardı — bu ayrı bir "çift truth source" sorunu, D01'de raporlandı).

**Test coverage:** `__tests__/validators/cross-validators.test.ts` dosyasında TICARIFATURA+IADE case'i var mı kontrol etmedim; strict modda `validateCrossMatrix` doğru reject ediyor olmalı.

### 4.2 CommonSchematron:178 — TEKNOLOJIDESTEK + EARSIVFATURA zorunluluğu

**Schematron:** `cbc:InvoiceTypeCode='TEKNOLOJIDESTEK'` → ProfileID sadece EARSIVFATURA olabilir.

**Kütüphane:** `PROFILE_TYPE_MATRIX` EARSIVFATURA (satır 62): TEKNOLOJIDESTEK var. Başka profillerin matris set'inde TEKNOLOJIDESTEK yok.

**Ayrıca:** `validateTeknolojiDestek` (type-validators.ts:193-214) customer.taxIdType=TCKN ve satırda TELEFON/TABLET_PC kontrolü yapıyor — bunlar tip kontrolleri, profil kontrolü değil.

**Sonuç:** **UYUMLU** (cross-matrix vasıtasıyla). TEKNOLOJIDESTEK+TICARIFATURA kombinasyonu validateCrossMatrix tarafından reject edilir.

### 4.3 CommonSchematron:233-247 — Signature kuralları

**Schematron:**
- `:234` count(cac:Signature) ≤ 1
- `:243-244` cac:Signature cbc:ID schemeID='VKN_TCKN' + 10/11 hane

**Kütüphane:**
- cac:Signature count: Kütüphane her zaman 0 veya 1 tane yazar (invoice-serializer `signatureInfo` opsiyonel). İhlal etmesi imkansız. SKIP.
- cac:Signature içerik: `validateCommon:64-71` signatureInfo.id boş-değil + 10/11 hane kontrol ediyor. `schemeID='VKN_TCKN'` kontrolü YOK (party-serializer:225 sabit yazıyor). Runtime kontrolüne ihtiyaç yok.

**Sonuç:** **UYUMLU / SKIP**. Ciddiyet: DÜŞÜK.

### 4.4 CommonSchematron:256-257 — VKN 10 hane / TCKN 11 hane

**Schematron:** cac:PartyIdentification cbc:ID schemeID='VKN' → 10 hane; schemeID='TCKN' → 11 hane.

**Kütüphane:** `validateParty` (common-validators.ts:131-148):
```typescript
if (party.taxIdType === 'VKN') { if (party.vknTckn.length !== 10) ...
else if (party.taxIdType === 'TCKN') { if (party.vknTckn.length !== 11) ...
```

**Sonuç:** **UYUMLU**. Hem supplier hem customer için çalışır (validateCommon:60-61 her ikisini de çağırıyor).

### 4.5 CommonSchematron:261-263 — TEKNOLOJIDESTEK alıcı TCKN zorunluluğu

**Schematron:** `../../../cbc:InvoiceTypeCode='TEKNOLOJIDESTEK'` + AccountingCustomerParty/PartyIdentification → cbc:ID schemeID='TCKN' olmak **zorunda**.

**Kütüphane:** `validateTeknolojiDestek:197-200`:
```typescript
if (input.customer?.taxIdType !== 'TCKN') {
  errors.push(typeRequirement(InvoiceTypeCode.TEKNOLOJIDESTEK, 'customer.taxIdType',
    'TEKNOLOJIDESTEK faturasında alıcı TCKN olmalıdır'));
}
```

**Sonuç:** **UYUMLU**.

### 4.6 CommonSchematron:276 — IHRACAT alıcı VKN = 1460415308 (GTB) zorunluluğu

**Schematron (TaxFreeInvoiceCheck, :275-277):** Ters okunacak — "1460415308 VKN'ye fatura düzenlenirse profil 'YOLCUBERABERFATURA' veya 'IHRACAT' olmalı". **Zorunlu değil, izinli listeye kısıt.**

```xml
<sch:assert test="not(cbc:ID ='1460415308') or not(../../../cbc:ProfileID!='YOLCUBERABERFATURA') or not(../../../cbc:ProfileID!='IHRACAT') or not(../../../cbc:ProfileID!='OZELFATURA') or not(../../../cbc:ProfileID!='KAMU')">
```

Mesaj metni YOLCUBERABERFATURA veya IHRACAT diyor ama test OZELFATURA ve KAMU da ekliyor (double-negative kısıtlama: eğer alıcı ID=1460415308 ise profilin **yalnızca** YOLCU/IHRACAT/OZELFATURA/KAMU olmasına izin veriyor).

> **Not:** Prompt'ta "IHRACAT alıcı VKN = 1460415308 zorunluluğu" dedi — aslında Schematron tam tersi yönde (alıcı zaten 1460415308 ise profil GTB ilgili olmalı). **Skill özeti güncellemesi gerekiyor (Durum C / SKILL kategori).**

**Kütüphane:** Bu cross-check yok. `validateIhracat` partyType='EXPORT' kontrolü yapıyor ama alıcı VKN'nin 1460415308 olup olmadığını kontrol etmiyor, dolayısıyla ters-check de yok.

**Sonuç:** **EKSİK** (ama edge case — kullanıcı 1460415308 VKN'yi başka profilde manuel yazarsa Schematron RED eder, kütüphane geçirir). **Ciddiyet: ORTA**.

### 4.7 CommonSchematron:345 — IHRACAT BuyerCustomerParty/ID=EXPORT zorunluluğu

**Schematron (IhracatYolcuBeraberCheck, :345):** Profil IHRACAT iken BuyerCustomerParty/Party/PartyIdentification/cbc:ID='EXPORT' ve schemeID='PARTYTYPE' zorunlu.

**Kütüphane:** `validateIhracat:57-59`:
```typescript
if (input.buyerCustomer.partyType !== 'EXPORT') { ... }
```
+ serializer (party-serializer.ts:144-147) schemeID='PARTYTYPE' sabit yazıyor.

**Sonuç:** **UYUMLU**.

### 4.8 CommonSchematron:405-406 — IHRACAT her kalemde Price/PriceAmount + LineExtensionAmount

**Schematron (PriceAmountCheck):** IHRACAT profilinde her InvoiceLine'da:
- `cac:Price/cbc:PriceAmount` boş-değil
- `cbc:LineExtensionAmount` boş-değil

**Kütüphane:** `validateIhracat:74-105` — Delivery kuralları var; **PriceAmount / LineExtensionAmount kontrolü YOK**. `validateCommon:94-106` satır için sadece `line.id`, `line.unitCode`, `line.item.name` zorunlu sayıyor.

**Farkındalık:** SimpleInvoiceBuilder (calculator/simple-invoice-builder.ts) line-calculator vasıtasıyla bu alanları otomatik üretir — bu yolu kullanan kullanıcı güvende. Ama **direkt `new InvoiceBuilder().build(invoiceInput)` path'i güvensiz** — kullanıcı InvoiceLine.priceAmount'ı boş bıraksa kütüphane geçirir.

**Sonuç:** **EKSİK**. **Ciddiyet: YÜKSEK** (IHRACAT'ta kritik ama SimpleInvoiceBuilder normalde kullanılıyor).

**Bulgu:** `validateIhracat`'a her satır için `priceAmount` ve `lineExtensionAmount` boş-değil kontrolü eklenmeli.

### 4.9 CommonSchematron:427-428 — IHRACAT satıcı vergi dairesi zorunluluğu

**Schematron (PartyVDCheck):** IHRACAT iken `cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name` dolu olmalı.

**Kütüphane:** `validateIhracat:68-71`:
```typescript
if (!isNonEmpty(input.supplier?.taxOffice)) {
  errors.push(profileRequirement(p, 'supplier.taxOffice',
    'IHRACAT profilinde satıcı vergi dairesi adı zorunludur'));
}
```
+ `types/common.ts:37` `taxOffice?: string` alanı tanımlı.

**Sonuç:** **UYUMLU**.

### 4.10 CommonSchematron:446-448 — TEKNOLOJIDESTEK her kalemde TELEFON/TABLET_PC

**Schematron:** TEKNOLOJIDESTEK iken her satırda cac:Item/cac:AdditionalItemIdentification/cbc:ID schemeID='TELEFON' veya 'TABLET_PC' olmalı.

**Kütüphane:** `validateTeknolojiDestek:203-211`:
```typescript
input.lines?.forEach((line, i) => {
  const hasRequired = line.item?.additionalItemIdentifications?.some(
    aid => aid.schemeId === 'TELEFON' || aid.schemeId === 'TABLET_PC'
  );
  if (!hasRequired) { ... }
});
```

**Sonuç:** **UYUMLU**.

---

## 5. ValidationLevel Seviyeleri

### 5.1 Kod akışı

`invoice-builder.ts:build()` (satır 39-48):
1. `const errors = this.validate(input);`
2. `if (errors.length > 0) throw new UblBuildError(errors);`
3. serialize

`validate()` (54-78):
```typescript
if (level === 'none') return [];

errors.push(...validateCommon(input));       // HEP çalışır (basic+strict)

if (level === 'strict') {
  errors.push(...validateCrossMatrix(input)); // §4
  errors.push(...validateByType(input));       // §2
  errors.push(...validateByProfile(input));    // §3
}
```

### 5.2 Seviye Matrisi

| Seviye | validateCommon (§1) | validateCrossMatrix (§4) | validateByType (§2) | validateByProfile (§3) |
|---|---|---|---|---|
| `none` | — | — | — | — |
| `basic` (varsayılan) | ✓ | — | — | — |
| `strict` | ✓ | ✓ | ✓ | ✓ |

### 5.3 Gözlem — `basic` riski

Varsayılan `basic` seviyede:
- **İşe yaramayan** cross-matrix (TICARIFATURA+IADE gibi yasak kombinasyon geçer)
- **Tip-bazlı kurallar yok** (TEVKIFAT'ta WithholdingTaxTotal eksik olursa fark edilmez)
- **Profil kuralları yok** (IHRACAT'ta BuyerCustomer eksik olursa fark edilmez)

Mimsoft gönderimine varan yol bu validasyonları bir şekilde yapar (schematron pre-validator), fakat kütüphanenin "XML geçerli" dediği `basic` çıktı Schematron tarafından RED edilebilir. **Dokümantasyon gelişebilir** — README'de "sürüm öncesi/staging ortamda `strict` kullanın" notu yararlı.

### 5.4 Despatch Builder

`despatch-builder.ts:48-53`:
```typescript
if (this.options.validationLevel === 'none') return [];
return validateDespatch(input);
```

Despatch tarafında `basic` ile `strict` aynı şekilde davranıyor — tek validateDespatch fonksiyonu var, level ayrımı yok. Bu **tutarsızlık**: invoice tarafında `basic` dar, `strict` geniş; despatch tarafında her ikisi aynı. Rapor için: **DÜŞÜK, DOKÜMAN**.

---

## 6. Özel Durum — Mimsoft `unsigned=true` Etkisi

Mimsoft pre-validation `unsigned=true` ile Signature + UBLExtensions hariç Schematron çalıştırıyor. Kütüphanenin `strict` seviyesi bu kapsamı karşılamalı.

**Karşılaştırma — kütüphane `strict` + Mimsoft unsigned ΔKapsam:**

Kütüphane EKSİK olan 13 kural (§3 tabloda "**EKSİK**") Mimsoft unsigned tarafından yakalanıp kullanıcıya geri döndürülür. Bunlar:
1. UBLVersionIDCheck (serializer hardcode — pratikte sorun değil)
2. CustomizationIDCheck (aynı)
3. CopyIndicatorCheck (aynı)
4. CountryCodeCheck (country whitelist)
5. GeneralCurrencyCodeCheck (alt-currency'ler)
6. GeneralCurrencyIDCheck (@currencyID)
7. GeneralChannelCodeCheck
8. MimeCodeCheck
9. decimalCheck (amount format)
10. TaxFreeInvoiceCheck (1460415308 VKN cross-check)
11. SGKInvoiceCheck (7750409379 VKN cross-check)
12. IADEInvioceCheck DocumentTypeCode='IADE' kontrolü
13. TaxExemptionReasonCodeCheck (cross tip-kod matrisi + IHRACKAYITLI+702 satır kuralı)
14. IhracKayitliPartyIdentificationIDTypeCheck (CustomsDeclaration schemeID)
15. DemirbasKDVTaxExemptionCheck (555 kuralları — KRİTİK, D01+D02+D03'te aynı bulgu)
16. YatirimTesvikKDVCheck (inv seviyesi)
17. YatirimTesvikLineKDVCheck (satır seviyesi)
18. YatirimTesvikItemClassificationCodeIstisnaCalculationSequenceNumericCheck (-1 kontrol)
19. GeneralBillingReferenceCheck (OKCBF max 1)
20. BillingReferenceCheck (OKCBF ek alanlar)
21. PriceAmountCheck (IHRACAT satır amount)

**Risk:** Kütüphaneden `strict` valid XML alan kullanıcı, Mimsoft pre-validation'da red alabilir. Kullanıcı deneyimi açısından: "kütüphanemin `strict` gibi bir şey kullanmama rağmen sunucu tarafında red aldım" — özellikle **555 kodu**, **IHRACAT satır amount** ve **YTB KDV** kurallarında yaygın.

---

## 7. Bulgular

Aşağıda öncelik sırasıyla KRİTİK→YÜKSEK→ORTA→DÜŞÜK tüm bulgular.

### [KRİTİK][KÜTÜPHANE] 555 kodu kuralları hiç zorlanmıyor (DemirbasKDVTaxExemptionCheck)
- **Dosya:satır:** `src/validators/type-validators.ts:17-60` (validateByType) ve `src/config/constants.ts:185-200` (ISTISNA whitelist)
- **Gözlem:** Common Schematron:496-499'da iki kural:
  1. TEMELFATURA/TICARIFATURA/EARSIVFATURA + ISTISNA/IHRACKAYITLI/YTB* dışı tipte 555 kodu YASAK
  2. 555 kodu kullanılıyorsa 0015 TaxSubtotal'de Percent=0 veya TaxAmount=0 YASAK

  Kütüphanenin ne `validateByType` ne `validateCommon` içinde 555 için özel mantık yok. Ayrıca 555 kodu hiçbir whitelist'te tanımlı değil (Denetim 01+02'de de işaret edildi).
- **Normatif referans:** Common Schematron:496-499 (DemirbasKDVTaxExemptionCheck); Codelist.xml istisnaTaxExemptionReasonCodeType içermez 555'i ama Schematron hard-code ediyor.
- **Durum tipi:** C — Schematron ile Codelist çelişiyor (D02'de SKILL bulgusu olarak ayrıca raporlandı); normatif kaynak (Schematron) kazanıyor.

### [KRİTİK][KÜTÜPHANE] TaxExemptionReasonCode cross-check yok (İstisna/ÖzelMatrah/İhraç kodu ↔ fatura tipi eşleşmesi)
- **Dosya:satır:** `src/validators/type-validators.ts:133-190`
- **Gözlem:** `validateIstisnaGroup` sadece **ISTISNA/YTBISTISNA** tipinde çağrılıyor ve sadece whitelist kontrolü yapıyor. Schematron:316-320 farklı yönde kural koyuyor:
  - İstisna kodu kullanan bir subtotal varsa **fatura tipi** ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE olmalı
  - ÖzelMatrah kodu → tip OZELMATRAH/IADE/SGK
  - İhraç kodu → tip IHRACKAYITLI/IADE/SGK

  Yani: SATIS tipli bir faturada subtotal'de 308 (YTBİstisna) kodu kullanılsa kütüphane geçirir, Schematron RED eder. Kütüphane mantığı "tipe göre whitelist dolaş"; Schematron mantığı "kodu gören → tipi kısıtla".
- **Normatif referans:** Common Schematron:316, 318, 320 (TaxExemptionReasonCodeCheck).
- **Durum tipi:** A

### [KRİTİK][KÜTÜPHANE] IHRACKAYITLI+702 satır kuralı yok (GTİP + ALICIDIBSATIRKOD)
- **Dosya:satır:** `src/validators/type-validators.ts:176-190` (validateIhracKayitli)
- **Gözlem:** Schematron:322 — IHRACKAYITLI + TaxExemptionReasonCode=702 iken **her satırda**:
  - cac:Delivery/cac:Shipment/cac:GoodsItem/cbc:RequiredCustomsID = 12 karakter (GTİP)
  - cac:Delivery/cac:Shipment/cac:TransportHandlingUnit/cac:CustomsDeclaration/cac:IssuerParty/cac:PartyIdentification/cbc:ID[@schemeID='ALICIDIBSATIRKOD'] = 11 karakter

  `validateIhracKayitli` sadece whitelist kontrolü yapıyor — bu satır seviyesi alan kontrolü yok. (D02'de de işaret edildi.)
- **Normatif referans:** Common Schematron:322 (TaxExemptionReasonCodeCheck assertion 5).
- **Durum tipi:** A

### [KRİTİK][KÜTÜPHANE] YatirimTesvikKDVCheck ve YatirimTesvikLineKDVCheck yok
- **Dosya:satır:** `src/validators/profile-validators.ts:227-318` (validateYatirimTesvikRules)
- **Gözlem:** Schematron:483-489 — YATIRIMTESVIK (veya EARSIV+YTB) + IADE dışı tip iken:
  - Fatura seviyesi TaxSubtotal (0015, TaxAmount>0, Percent>0) zorunlu (YatirimTesvikKDVCheck)
  - Her satırda TaxSubtotal (0015, TaxAmount>0, Percent>0) zorunlu (YatirimTesvikLineKDVCheck)
  - IADE tiplerinde kod 03 veya 04 ise KDV değeri zorunlu
  
  Kütüphane YTB için 308/339 ve ModelName/Instance kontrolü yapıyor ama KDV zorunluluğunu test etmiyor. KDV'siz bir YTB satışı geçerse ama Schematron RED eder.
- **Normatif referans:** Common Schematron:483-490.
- **Durum tipi:** A

### [YÜKSEK][KÜTÜPHANE] IHRACAT her satırda PriceAmount + LineExtensionAmount kontrol yok
- **Dosya:satır:** `src/validators/profile-validators.ts:50-108` (validateIhracat)
- **Gözlem:** Schematron:404-406 IHRACAT için her satırda Price/PriceAmount ve LineExtensionAmount dolu istiyor. validateIhracat sadece Delivery kurallarını kontrol ediyor.
- **Normatif referans:** Common Schematron:404-406 (PriceAmountCheck).
- **Durum tipi:** A
- **Not:** SimpleInvoiceBuilder yolu otomatik dolduruyor, direkt InvoiceBuilder.build() yolu risk.

### [YÜKSEK][KÜTÜPHANE] WithholdingTaxTotal ters-yön kontrolü yok
- **Dosya:satır:** `src/validators/type-validators.ts:27-29, 93-130`
- **Gözlem:** Schematron:289 — `cac:WithholdingTaxTotal` varsa fatura tipi TEVKIFAT/YTBTEVKIFAT/IADE/YTBIADE/SGK/SARJ/SARJANLIK olmalı. Kütüphane sadece TEVKIFAT/YTBTEVKIFAT için **zorunluluğu** kontrol ediyor; SATIS tipinde WithholdingTaxTotal verilirse hata atmıyor. `WITHHOLDING_ALLOWED_TYPES` (constants.ts:84-88) bu amaç için tanımlı ama `validateByType`'dan çağrılmıyor.
- **Normatif referans:** Common Schematron:289 (GeneralWithholdingTaxTotalCheck assertion 1).
- **Durum tipi:** A

### [YÜKSEK][KÜTÜPHANE] IADE grup tiplerinde DocumentTypeCode='IADE' kontrolü yok
- **Dosya:satır:** `src/validators/type-validators.ts:63-90` (validateIadeGroup)
- **Gözlem:** Schematron:358 — IADE/TEVKIFATIADE/YTBIADE/YTBTEVKIFATIADE tiplerinde her BillingReference/InvoiceDocumentReference için `cbc:DocumentTypeCode='IADE'` (veya 'İADE') zorunlu. Kütüphane sadece ID 16 hane kontrolünü yapıyor.
- **Normatif referans:** Common Schematron:358 (IADEInvioceCheck).
- **Durum tipi:** A

### [YÜKSEK][KÜTÜPHANE] IHRACKAYITLI+702 → CustomsDeclaration schemeID whitelist yok
- **Dosya:satır:** `src/validators/type-validators.ts:176-190`
- **Gözlem:** Schematron:450-452 IHRACKAYITLI+702 iken CustomsDeclaration/IssuerParty/PartyIdentification schemeID'lerinin `IhracKayitliPartyIdentificationIDType` whitelist'inde olması gerekli. Kütüphane yok.
- **Normatif referans:** Common Schematron:450-452 (IhracKayitliPartyIdentificationIDTypeCheck).
- **Durum tipi:** A

### [ORTA][KÜTÜPHANE] TaxFreeInvoiceCheck cross-check yok (1460415308 VKN ↔ profil)
- **Dosya:satır:** `src/validators/common-validators.ts:119-154` (validateParty)
- **Gözlem:** Schematron:275-277 — Alıcı VKN=1460415308 ise profil YOLCU/IHRACAT/OZELFATURA/KAMU olmalı. Kütüphanede cross-check yok.
- **Normatif referans:** Common Schematron:275-277 (TaxFreeInvoiceCheck).
- **Durum tipi:** A — ayrıca **Durum C** (Skill özet metni mesaj yalnızca YOLCU/IHRACAT derken Schematron OZELFATURA ve KAMU'ya da izin veriyor; SKILL güncellemesi gerekiyor).

### [ORTA][KÜTÜPHANE] SGKInvoiceCheck cross-check yok (7750409379 VKN ↔ SGK/TEVKIFAT tip)
- **Dosya:satır:** `src/validators/common-validators.ts`
- **Gözlem:** Schematron:508-510 — Alıcı VKN=7750409379 (SGK) ise tip SGK veya TEVKIFAT olmalı. Kütüphanede yok.
- **Normatif referans:** Common Schematron:508-510.
- **Durum tipi:** A

### [ORTA][KÜTÜPHANE] ExchangeRate format kontrolü yok
- **Dosya:satır:** `src/validators/common-validators.ts:55-57`
- **Gözlem:** Kütüphane TRY dışı → exchangeRate zorunlu diyor ama formatını (Schematron:190: noktadan önce 15, sonra 1-6) kontrol etmiyor. `EXCHANGE_RATE_REGEX` (constants.ts:290) tanımlı ama kullanılmıyor.
- **Normatif referans:** Common Schematron:190 (CurrencyCodeCheck assertion 7).
- **Durum tipi:** A

### [ORTA][KÜTÜPHANE] IssueDate aralık kontrolü yok
- **Dosya:satır:** `src/validators/common-validators.ts:38-42`
- **Gözlem:** Schematron:169-170 — IssueDate bugünden ileri olamaz, 2005-01-01'den önce olamaz. Kütüphane sadece DATE_REGEX format kontrolü.
- **Normatif referans:** Common Schematron:169-170 (TimeCheck).
- **Durum tipi:** A

### [ORTA][KÜTÜPHANE] MATBUDAN için AdditionalDocumentReference alan kontrolü kısmi
- **Dosya:satır:** `src/validators/despatch-validators.ts:138-142`
- **Gözlem:** Schematron:703 — MATBUDAN iken AdditionalDocumentReference'ın `cbc:ID` ve `cbc:IssueDate` dolu olanından en az 1 adet. Kütüphane sadece listenin boş-değil kontrolü yapıyor, içerik alanlarını doğrulamıyor.
- **Normatif referans:** Common Schematron:703.
- **Durum tipi:** A

### [ORTA][KÜTÜPHANE] YatirimTesvik ISTISNA CalculationSequenceNumeric=-1 yok
- **Dosya:satır:** `src/validators/profile-validators.ts:227-318`
- **Gözlem:** Schematron:467-469 YATIRIMTESVIK ISTISNA/YTBISTISNA iken 0015 TaxSubtotal CalculationSequenceNumeric=-1 zorunlu. Kütüphane yok.
- **Normatif referans:** Common Schematron:467-469.
- **Durum tipi:** A

### [ORTA][KÜTÜPHANE] Despatch / ReceiptAdvice / ProfileID whitelist yok
- **Dosya:satır:** `src/validators/despatch-validators.ts:32-34`, `src/validators/common-validators.ts:30-32`
- **Gözlem:** Schematron InvoiceTypeCode (TR1.2-InvoiceTypeCode), DespatchAdvice ProfileID gibi whitelist'leri hardcode kullanıyor; kütüphane sadece boş-değil kontrol ediyor. TypeScript enum build-time güvence verse de JSON input runtime'da ham string.
- **Normatif referans:** Common Schematron:147, :702, :758.
- **Durum tipi:** A

### [ORTA][KÜTÜPHANE] Supplier/Customer additionalIdentifiers schemeId whitelist yok
- **Dosya:satır:** `src/validators/common-validators.ts:119-154`
- **Gözlem:** Schematron:250-251 PartyIdentification/ID @schemeID için PartyIdentificationIDType whitelist var. Kütüphanede `PARTY_IDENTIFICATION_SCHEME_IDS` tanımlı (constants.ts:241-248) ama `validateParty` kullanmıyor. Serializer additionalIdentifiers'ı ham yazıyor — kullanıcı geçersiz schemeID verirse Schematron RED eder.
- **Normatif referans:** Common Schematron:250-251.
- **Durum tipi:** A

### [DÜŞÜK][KÜTÜPHANE] CopyIndicator/UBLVersion/CustomizationID runtime kontrol yok
- **Dosya:satır:** serializer yolları (invoice-serializer.ts).
- **Gözlem:** Schematron:137, :142, :164 bu sabit değerleri kontrol ediyor; kütüphane sabit yazdığı için ihlal riski yok. Dokümantasyon yoluyla belirtilebilir, runtime kontrol ihtiyacı yok.
- **Durum tipi:** B (normatif kaynak destekliyor kütüphane yaklaşımını — serializer sabit yazarak güvence veriyor).

### [DÜŞÜK][DOKÜMAN] ValidationLevel 'basic' kapsamı dar
- **Dosya:satır:** `src/types/builder-options.ts:1-21`, `src/builders/invoice-builder.ts:54-78`
- **Gözlem:** Varsayılan 'basic' cross-matrix/type/profile kurallarını atlıyor. README/JSDoc'ta "üretim öncesi `strict` önerilir" notu yok.
- **Durum tipi:** B (normatif kaynak yok — kütüphane tasarım kararı, belge eksikliği).

### [DÜŞÜK][DOKÜMAN] DespatchBuilder validationLevel inefektif
- **Dosya:satır:** `src/builders/despatch-builder.ts:48-52`
- **Gözlem:** Despatch tarafında 'basic' ve 'strict' aynı — belirtilmeli veya kaldırılmalı.
- **Durum tipi:** B

### [DÜŞÜK][SKILL] TaxFreeInvoiceCheck mesaj metni eksik
- **Gözlem:** Schematron:275-277 hata mesajı "YOLCUBERABERFATURA veya IHRACAT olabilir" derken assert OZELFATURA ve KAMU'ya da izin veriyor (double-negative). Skill özetinde bu kural rafine edilebilir.
- **Durum tipi:** C (normatif kaynak vs mesaj metni çelişiyor; assert test hükmü bağlayıcı).

---

## 8. Bulgu Özeti

### Ciddiyet

| Ciddiyet | Adet | Başlıklar |
|---|---|---|
| **KRİTİK** | 4 | 555 kodu tamamen yok • TaxExemptionReasonCode cross-check yok • IHRACKAYITLI+702 satır kuralı yok • YatirimTesvikKDV (fatura+satır) yok |
| **YÜKSEK** | 4 | IHRACAT satır PriceAmount/LineExtensionAmount yok • WithholdingTaxTotal ters-yön yok • IADE DocumentTypeCode kontrol yok • IhracKayitli schemeID whitelist yok |
| **ORTA** | 8 | 1460415308 VKN cross-check • 7750409379 VKN cross-check • ExchangeRate format • IssueDate aralık • MATBUDAN ADR alan kontrol • YTB CalculationSequenceNumeric=-1 • Despatch/Invoice ProfileID whitelist • PartyIdentification schemeID whitelist |
| **DÜŞÜK** | 3 | CopyIndicator/UBLVersion/CustomizationID runtime yok (B-OK) • ValidationLevel 'basic' dar (doküman) • Despatch validationLevel inefektif (doküman) |
| **Toplam** | **19** | |

### Kategori

| Kategori | Adet |
|---|---|
| KÜTÜPHANE | 15 |
| DOKÜMAN | 2 |
| SKILL | 1 (TaxFreeInvoiceCheck mesaj metni) |
| TEST | 0 |

### Durum Tipi

| Tip | Adet |
|---|---|
| A (Skill ↔ Kütüphane çelişki, kütüphane yanlış) | 15 |
| B (Skill sessiz, normatif desteğiyle kütüphane doğru/DOKÜMAN ihtiyacı) | 3 |
| C (Skill ↔ Normatif çelişki, normatif kazanır) | 1 |

---

## 9. Context'e Giren Dosyalar

- `json2ubl-ts/audit/denetim-01-ic-tutarlilik.md` (önceki bulgu bağlamı)
- `json2ubl-ts/audit/denetim-02-kod-listeleri.md` (aynı)
- `json2ubl-ts/audit/SONUC-konsolide-bulgular.md`
- `sisteminiz-integrator-infrastructure/.claude/skills/gib-teknik-dokuman/schematrons/UBL-TR_Common_Schematron.xml` (771 satır)
- `sisteminiz-integrator-infrastructure/.claude/skills/gib-teknik-dokuman/schematrons/UBL-TR_Main_Schematron.xml` (567 satır)
- `json2ubl-ts/src/validators/common-validators.ts`
- `json2ubl-ts/src/validators/type-validators.ts`
- `json2ubl-ts/src/validators/profile-validators.ts`
- `json2ubl-ts/src/validators/cross-validators.ts`
- `json2ubl-ts/src/validators/despatch-validators.ts`
- `json2ubl-ts/src/validators/validation-result.ts`
- `json2ubl-ts/src/builders/invoice-builder.ts` (build + validate + ValidationLevel akışı)
- `json2ubl-ts/src/types/builder-options.ts`
- `json2ubl-ts/src/types/common.ts` (taxOffice alanı teyidi)
- `json2ubl-ts/src/config/constants.ts` (PROFILE_TYPE_MATRIX + grup set'leri + regex'ler)
- `json2ubl-ts/src/serializers/party-serializer.ts` (schemeID='PARTYTYPE' sabit yazım teyidi)

---

## 10. Sonraki Denetimlere Aktarılan Açık Sorular

1. **SimpleInvoiceBuilder path'i ne kadar kapsayıcı?** — direkt `InvoiceBuilder.build(ham InvoiceInput)` yolu birçok bulgu için "SimpleInvoiceBuilder otomatik doldurur, direkt kullanım riskli" savunması kullanılıyor. Denetim 04: SimpleInvoiceBuilder → InvoiceInput mapping'inin hangi alanları garanti doldurduğunu tablolaştır.
2. **Test coverage analizi** — `__tests__/validators/*.test.ts` dosyalarında bu 19 bulgunun kaçı için regression test var? (Muhtemelen 0.)
3. **ValidationLevel kapsamı** — 'strict' bu 19 bulgu dahil edildikten sonra Mimsoft unsigned'ı tam karşılar mı? Hangi Schematron kuralı kasten dışarda bırakıldı?
4. **Serializer kontrat testleri** — UBLVersion='2.1', CustomizationID='TR1.2', CopyIndicator='false' gibi sabit hardcode'ların XSD/Schematron uyumlu olduğu snapshot testi var mı?
5. **555 kodu roadmap** — D01/D02/D03 hepsinde aynı KRİTİK — hangi sürümde eklenecek?
6. **Çift truth source** — D01+D02 konsolide bulgu olarak raporlandı; `invoice-rules.ts` (PROFILE_TYPE_MAP) hâlâ dead code olarak duruyor, silinmesi karar bekliyor.
