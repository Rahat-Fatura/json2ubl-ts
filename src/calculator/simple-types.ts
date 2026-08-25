/**
 * Basitleştirilmiş fatura giriş tipleri.
 *
 * Geliştirici sadece temel verileri sağlar, SDK tüm hesaplamaları,
 * tip/profil tespitini, VKN/TCKN ayrımını ve UBL-TR dönüşümünü otomatik yapar.
 */

// ─── Ortak Tipler ──────────────────────────────────────────────────────────────

/** Taraf (gönderici/alıcı) basit girişi */
export interface SimplePartyInput {
    /** Vergi kimlik numarası (10 hane VKN veya 11 hane TCKN) — zorunlu */
    taxNumber: string;
    /** Firma adı veya kişi adı soyadı — zorunlu */
    name: string;
    /** Vergi dairesi — VKN için zorunlu, TCKN için opsiyonel */
    taxOffice?: string;
    /** Adres — zorunlu */
    address: string;
    /** İlçe — zorunlu */
    district: string;
    /** İl — zorunlu */
    city: string;
    /** Ülke — varsayılan: "Türkiye" */
    country?: string;
    /** Posta kodu — varsayılan: "00000" */
    zipCode?: string;
    /** Telefon */
    phone?: string;
    /** E-posta */
    email?: string;
    /** Web sitesi */
    website?: string;
    /** Ek taraf kimlik tanımlamaları (ör: MERSISNO, TICARETSICILNO) */
    identifications?: SimplePartyIdentification[];
    /**
     * e-Fatura posta kutusu etiketi (ör: "urn:mail:defaultpk@firma.com.tr").
     *
     * ⚠️ **Bu alan üretilen UBL-TR Invoice XML'ine YAZILMAZ — bilerek.**
     *
     * Etiket, faturanın kendisine değil **zarfa** (GİB e-Fatura Paketi SBDH:
     * `<sender identifier="..." alias="urn:mail:..."/>` /
     * `<receiver identifier="..." alias="..."/>`) aittir. GİB UBL-TR 1.2.1
     * `PartyType`'ında etiket için tanımlı bir eleman yoktur; `cbc:EndpointID`
     * şemada bulunsa da UBL-TR kılavuzunda bu amaçla kullanılmaz, dolayısıyla
     * oraya yazmak standart dışı olurdu. e-Arşiv faturalarında etiket kavramı
     * hiç yoktur.
     *
     * Zarf üretimi kütüphanenin sorumluluk sınırının dışındadır (aynı sınır
     * UBLExtensions/imza için de geçerlidir — bkz. B-101). Etiketi entegratöre
     * gönderirken zarf tarafında siz taşımalısınız; alan burada yalnızca
     * çağıranın veri modelini tek yerde tutabilmesi için durur (B-102 denetimi).
     */
    alias?: string;
}

/** Ek taraf kimlik tanımlama */
export interface SimplePartyIdentification {
    /** Tanımlama şema tipi (ör: "MERSISNO", "TICARETSICILNO", "HIZMETNO", "MUSTERINO", "TESISATNO") */
    schemeId: string;
    /** Tanımlama değeri */
    value: string;
}

// ─── Satır Vergi Girişleri ─────────────────────────────────────────────────────

/** Satır seviyesi ek vergi girişi (KDV hariç — ÖTV, Damga V., ÖİV vb.) */
export interface SimpleLineTaxInput {
    /** Vergi kodu (ör: "0071" ÖTV 1. Liste, "1047" Damga V.) — zorunlu */
    code: string;
    /** Vergi oranı (%) — zorunlu */
    percent: number;
}

// ─── Fatura Satırı ─────────────────────────────────────────────────────────────

/** Basit fatura satırı girişi */
export interface SimpleLineInput {
    /** Ürün/hizmet adı — zorunlu */
    name: string;
    /** Miktar — zorunlu */
    quantity: number;
    /** Birim fiyat (KDV hariç) — zorunlu */
    price: number;
    /** Birim kodu (Türkçe isim veya UBL kodu: "Adet" veya "C62") — varsayılan: "Adet" */
    unitCode?: string;
    /** KDV oranı (%) — zorunlu */
    kdvPercent: number;
    /**
     * Satır bazı KDV istisna sebep kodu (B-NEW-11 / M11).
     *
     * KDV=0 kalem için manuel verilmeli (ör. 351). Verilmezse belge seviyesi
     * `SimpleInvoiceInput.kdvExemptionCode` fallback olarak kullanılır.
     *
     * Self-exemption tiplerinde (ISTISNA, IHRACKAYITLI, OZELMATRAH + IHRACAT,
     * YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK profilleri) zorunlu değil;
     * dışındaki tiplerde KDV=0 kaleminde zorunlu.
     */
    kdvExemptionCode?: string;
    /** İskonto oranı (%) — opsiyonel */
    allowancePercent?: number;
    /** Ek vergiler (ÖTV, Damga V. vb.) — opsiyonel */
    taxes?: SimpleLineTaxInput[];
    /** KDV tevkifat kodu (ör: "602") — opsiyonel, verilirse fatura tipi TEVKIFAT olur */
    withholdingTaxCode?: string;
    /**
     * Tevkifat 650 (Diğer) kodu için dinamik yüzde (0-100).
     * Sadece 650 kodu ile kullanılır; diğer tevkifat kodlarında oran config'den gelir.
     */
    withholdingTaxPercent?: number;

    // ─── Ürün ek bilgileri ─────────────────────────────────────────────────────
    // B-102: brand/buyerCode/sellerCode/manufacturerCode/origin/note v2.2.6'ya
    // kadar mapper tarafından HİÇ okunmuyordu (B-101 ile aynı sınıf hata).
    // Yerleşimler GİB UBL-TR 1.2.1 ItemType / InvoiceLineType'tan doğrulandı.

    /** Ürün açıklaması — `cac:Item/cbc:Description` */
    description?: string;
    /** Marka — `cac:Item/cbc:BrandName` (B-102) */
    brand?: string;
    /** Model — `cac:Item/cbc:ModelName` */
    model?: string;
    /** Alıcı ürün kodu — `cac:Item/cac:BuyersItemIdentification/cbc:ID` (B-102) */
    buyerCode?: string;
    /** Satıcı ürün kodu — `cac:Item/cac:SellersItemIdentification/cbc:ID` (B-102) */
    sellerCode?: string;
    /** Üretici ürün kodu — `cac:Item/cac:ManufacturersItemIdentification/cbc:ID` (B-102) */
    manufacturerCode?: string;
    /**
     * Menşe ülke **adı** — `cac:Item/cac:OriginCountry/cbc:Name` (B-102).
     *
     * GİB `CountryType`'ta `cbc:Name` minOccurs=1'dir; bu yüzden değer ülke ADI
     * olarak yazılır (ISO kodu değil). Kod da göndermek isteyen çağıran alt
     * seviye `ItemInput.originCountryCode` alanını kullanabilir.
     */
    origin?: string;
    /** Satır notu — `cac:InvoiceLine/cbc:Note` (B-102) */
    note?: string;

    // ─── Satır seviyesi teslimat (ihracat vb.) ─────────────────────────────────
    /** Satır seviyesi teslimat bilgisi (ihracat faturaları için) */
    delivery?: SimpleLineDeliveryInput;

    // ─── Yatırım Teşvik (YATIRIMTESVIK profili) ─────────────────────────────────
    /** Harcama tipi kodu — YATIRIMTESVIK: 01=Makine/Teçhizat, 02=Yazılım, 03=Bina İnşaat, 04=Diğer */
    itemClassificationCode?: string;
    /** Makine Teçhizat sıra no — YATIRIMTESVIK Kod 01 için zorunlu */
    productTraceId?: string;
    /** Makine ID — YATIRIMTESVIK Kod 01 için zorunlu */
    serialId?: string;

    // ─── Özel tanımlayıcılar (TEKNOLOJIDESTEK vb.) ────────────────────────────
    /** Ek ürün tanımlayıcıları (ör: IMEI numarası) [{schemeId: "TELEFON", value: "123456789012345"}] */
    additionalItemIdentifications?: SimpleItemIdentification[];
}

/** Satır seviyesi teslimat bilgisi */
export interface SimpleLineDeliveryInput {
    /** Teslimat adresi */
    deliveryAddress: SimpleAddressInput;
    /** Teslimat şartı kodu (INCOTERMS: "EXW", "FOB", "CIF" vb.) */
    deliveryTermCode?: string;
    /** GTİP numarası (12 hane, IHRACKAYITLI+702 için zorunlu) */
    gtipNo?: string;
    /**
     * Alıcı DİB Satır Kodu (11 hane, IHRACKAYITLI+702 için zorunlu — B-07).
     *
     * Mapper bu alanı Shipment/TransportHandlingUnit/CustomsDeclaration/
     * IssuerParty/PartyIdentification[schemeID='ALICIDIBSATIRKOD'] UBL ağacına eşler.
     * Sprint 8c.2 / B-NEW-12 ile eklendi.
     */
    alicidibsatirkod?: string;
    /** Taşıma modu kodu (ör: "1" Deniz, "3" Karayolu, "4" Havayolu) */
    transportModeCode?: string;
    /**
     * Paket ID — `cac:Shipment/cac:TransportHandlingUnit/cac:ActualPackage/cbc:ID` (B-102).
     * v2.2.6'ya kadar mapper bu alanı hiç okumuyordu.
     */
    packageId?: string;
    /**
     * Paket miktarı — `.../cac:ActualPackage/cbc:Quantity`.
     * B-102: önceden yalnızca `packageTypeCode` ile BİRLİKTE verildiğinde yazılıyordu;
     * artık tek başına da `cac:ActualPackage` doğurur.
     */
    packageQuantity?: number;
    /** Paket tipi kodu — `.../cac:ActualPackage/cbc:PackagingTypeCode` */
    packageTypeCode?: string;
}

/** Basit adres girişi */
export interface SimpleAddressInput {
    /** Adres satırı */
    address: string;
    /** İlçe */
    district: string;
    /** İl */
    city: string;
    /** Posta kodu */
    zipCode?: string;
    /** Ülke — varsayılan: "Türkiye" */
    country?: string;
}

/** Ek ürün tanımlayıcı (TEKNOLOJIDESTEK IMEI vb.) */
export interface SimpleItemIdentification {
    /** Tanımlama şema tipi (ör: "TELEFON", "TABLET_PC") */
    schemeId: string;
    /** Tanımlama değeri */
    value: string;
}

// ─── Fatura Seviyesi Opsiyonel Alanlar ─────────────────────────────────────────

/** Sipariş referansı */
export interface SimpleOrderReferenceInput {
    /** Sipariş numarası */
    id: string;
    /** Sipariş tarihi (ISO format: "2025-01-15") */
    issueDate: string;
}

/**
 * BillingReference InvoiceDocumentReference DocumentTypeCode değerleri.
 *
 * Schematron IADEInvioceCheck kuralına göre:
 * - IADE grubu tiplerinde (IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE)
 *   DocumentTypeCode **zorunlu olarak** `'IADE'` olmalıdır.
 * - Diğer tiplerde Schematron'da kısıtlama yoktur, serbest metin girilebilir.
 *
 * @see schematrons/UBL-TR_Common_Schematron.xml — IADEInvioceCheck
 */
export const BillingDocumentTypeCode = {
    /** İade faturası referansı — Schematron zorunlu değer (IADE grubu tipleri için) */
    IADE: "IADE",
} as const;

export type BillingDocumentTypeCodeValue =
    (typeof BillingDocumentTypeCode)[keyof typeof BillingDocumentTypeCode];

/** Fatura referansı (iade ve diğer referans gerektiren tipler için) */
export interface SimpleBillingReferenceInput {
    /** Referans fatura numarası (Schematron: IADE grubu tiplerinde 16 karakter zorunlu) */
    id: string;
    /** Referans fatura tarihi */
    issueDate: string;
    /**
     * Belge tipi kodu.
     * - IADE grubu tiplerinde otomatik `'IADE'` atanır (Schematron zorunlu).
     * - Diğer tiplerde serbest metin — Schematron kısıtlaması yoktur.
     */
    documentTypeCode?: string;
}

/** İrsaliye referansı */
export interface SimpleDespatchReferenceInput {
    /** İrsaliye numarası */
    id: string;
    /** İrsaliye tarihi */
    issueDate: string;
}

/** Ek doküman referansı */
export interface SimpleAdditionalDocumentInput {
    /** Belge ID */
    id: string;
    /**
     * `cbc:ID/@schemeID` — Sprint 9.
     * SARJ faturalarında `ESURaporID` değeri zorunlu (`EnerjiESURaporIDCheck`).
     */
    schemeId?: string;
    /** Belge tarihi */
    issueDate?: string;
    /** Belge tipi kodu */
    documentTypeCode?: string;
    /** Belge tipi */
    documentType?: string;
    /** Belge açıklaması */
    documentDescription?: string;
    /** Ek dosya (Base64 encoded) */
    attachment?: {
        filename: string;
        mimeCode: string;
        data: string;
        encodingCode?: string;
        characterSetCode?: string;
    };
}

/** Ödeme bilgisi */
export interface SimplePaymentMeansInput {
    /** Ödeme yöntemi kodu (ör: "1" Nakit, "42" Banka, "48" Kredi Kartı, "ZZZ" Diğer) */
    meansCode: string;
    /** Son ödeme tarihi */
    dueDate?: string;
    /** Ödeme kanalı kodu */
    channelCode?: string;
    /** Hesap numarası / IBAN */
    accountNumber?: string;
    /** Ödeme notu */
    paymentNote?: string;
}

/** Özel matrah bilgisi (OZELMATRAH tipi faturalar için) */
export interface SimpleOzelMatrahInput {
    /** Özel matrah KDV oranı */
    percent: number;
    /** Özel matrah tutarı */
    taxable: number;
    /** Özel matrah KDV tutarı */
    amount: number;
}

/**
 * SGK tipi literal union (B-NEW-09 / Sprint 8c.7).
 *
 * Önceden `string` idi; TS tip daraltma için union'a çevrildi. Runtime validator
 * `validateSgkInput` ayrıca set-based kontrol uygular.
 */
export type SimpleSgkType =
  | 'SAGLIK_ECZ'
  | 'SAGLIK_HAS'
  | 'SAGLIK_OPT'
  | 'SAGLIK_MED'
  | 'ABONELIK'
  | 'MAL_HIZMET'
  | 'DIGER';

/** SGK faturası bilgisi */
export interface SimpleSgkInput {
    /** SGK tipi — whitelist kontrolü runtime'da tetiklenir (B-NEW-09) */
    type: SimpleSgkType;
    /** Döküm numarası — boş olamaz (B-NEW-10) */
    documentNo: string;
    /** Firma/Kurum adı */
    companyName: string;
    /** Firma/Kurum sicil kodu */
    companyCode: string;
}

/** Online satış bilgisi (e-Arşiv internet satış faturaları için) */
export interface SimpleOnlineSaleInput {
    /** Online satış mı? */
    isOnlineSale: boolean;
    /** Mağaza URL'si */
    storeUrl: string;
    /** Ödeme yöntemi (KREDIKARTI, BANKAHAVALESI, EFT, KAPIDAODEME vb.) */
    paymentMethod: string;
    /** Ödeme tarihi */
    paymentDate: string;

    // ─── Gönderi bilgileri (B-101) ────────────────────────────────────────────
    // e-Arşiv raporu `internetSatisBilgi/gonderiBilgileri` bloğunu besler
    // (gonderimTarihi ve gonderiTasiyan, ikisi de kardinalite 1 — v1.17/22.05.2024).
    // XML karşılığı `cac:Delivery`; EXT_* AdditionalDocumentReference DEĞİL, çünkü
    // bu iki bilginin UBL-TR'de yerleşik yeri var (storeUrl/paymentMethod'un yok).

    /**
     * Kargo firma vergi numarası — `cac:Delivery/cac:CarrierParty/cac:PartyIdentification/cbc:ID`.
     * 10 hane → `schemeID="VKN"` (tüzel kişi), 11 hane → `schemeID="TCKN"` (gerçek kişi).
     */
    carrierTaxNumber?: string;
    /** Kargo firma adı/unvanı — `cac:CarrierParty/cac:PartyName/cbc:Name` */
    carrierName?: string;
    /**
     * Kargo firmasının ilçesi — `cac:CarrierParty/cac:PostalAddress/cbc:CitySubdivisionName`.
     * UBL-TR `PartyType`'ta `cac:PostalAddress` **zorunludur** (minOccurs=1), içinde de
     * CityName + CitySubdivisionName zorunludur (B-35). Bu yüzden CarrierParty emit
     * edebilmek için il/ilçe gerekir.
     */
    carrierDistrict?: string;
    /** Kargo firmasının ili — `cac:CarrierParty/cac:PostalAddress/cbc:CityName` */
    carrierCity?: string;
    /** Kargo firmasının açık adresi — `cac:CarrierParty/cac:PostalAddress/cbc:StreetName` (opsiyonel) */
    carrierAddress?: string;
    /** Kargo firmasının ülkesi — varsayılan "Türkiye" */
    carrierCountry?: string;
    /**
     * Ürünün alıcıya gönderildiği/teslim edildiği tarih (YYYY-MM-DD) —
     * `cac:Delivery/cbc:ActualDeliveryDate`. e-Arşiv raporunda
     * `gonderiBilgileri/gonderimTarihi` karşılığıdır.
     */
    deliveryDate?: string;
}

/** e-Arşiv gönderim tipi */
export interface SimpleEArchiveInput {
    /** Gönderim tipi: "ELEKTRONIK" veya "KAGIT" */
    sendType: "ELEKTRONIK" | "KAGIT";
}

/** İhracat alıcı bilgisi (BuyerCustomerParty) */
export interface SimpleBuyerCustomerInput {
    /** Alıcı adı */
    name: string;
    /** Vergi numarası veya kimlik numarası */
    taxNumber: string;
    /** Adres */
    address: string;
    /** İl */
    city: string;
    /** İlçe */
    district: string;
    /** Ülke */
    country: string;
    /**
     * Vergi dairesi — 4.1.0'da eklendi.
     *
     * `cac:BuyerCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name`
     * alanına yazılır. Alan UBL'de zaten vardı ve `SimplePartyInput`'ta
     * (`sender`/`customer`) mevcuttu; yalnız BU tipte eksikti, dolayısıyla
     * IHRACAT/KAMU alıcısının vergi dairesi hiç yazılamıyordu
     * (B-101/B-102 ile aynı "tipte yok → XML'de yok" sınıfı).
     */
    taxOffice?: string;
    /** Posta kodu */
    zipCode?: string;
    /** Telefon */
    phone?: string;
    /** E-posta */
    email?: string;
    /**
     * Ek taraf tanımlayıcıları (B-83) — KAMU aracı kurum MUSTERINO/MERSISNO,
     * IHRACAT ek tanımlayıcı vb. `party.additionalIdentifiers`'a eşlenir.
     * schemeId PARTY_IDENTIFICATION_SCHEME_IDS seti ile kontrol edilir (B-69).
     */
    identifications?: Array<{ schemeId: string; value: string; }>;
    /**
     * Uyruk (ISO 3166-1 alpha-2 ülke kodu, ör. 'DE', 'US') —
     * YOLCUBERABERFATURA profili için zorunlu (B-NEW-13 / Sprint 8c.4).
     */
    nationalityId?: string;
    /**
     * Pasaport numarası — YOLCUBERABERFATURA profili için zorunlu (B-NEW-13).
     */
    passportId?: string;
}

/**
 * TaxRepresentativeParty — YOLCUBERABERFATURA profili aracı kurum (B-NEW-13).
 *
 * Aracı kurum (ör. bavul ticaretinde aracı firma) turiste KDV iadesi işlemini
 * yürütür. UBL: cac:TaxRepresentativeParty. Sprint 8c.4 ile eklendi.
 */
export interface SimpleTaxRepresentativeInput {
    /** ARACIKURUMVKN — VKN (10 hane) veya TCKN (11 hane) */
    vknTckn: string;
    /** ARACIKURUMETIKET — aracı kurum etiket adı */
    label: string;
    /** Aracı kurum tüzel adı (opsiyonel) */
    name?: string;
}

/** Fatura dönemi (SGK faturaları vb.) */
export interface SimplePeriodInput {
    /** Dönem başlangıç tarihi (ISO format) */
    startDate: string;
    /**
     * Dönem başlangıç saati (HH:mm:ss) — Sprint 9.
     * SARJ/SARJANLIK faturalarında zorunlu (`EnerjiInvoicePeriodCheck`).
     */
    startTime?: string;
    /** Dönem bitiş tarihi (ISO format) */
    endDate: string;
    /**
     * Dönem bitiş saati (HH:mm:ss) — Sprint 9.
     * SARJ/SARJANLIK faturalarında zorunlu (`EnerjiInvoicePeriodCheck`).
     */
    endTime?: string;
}

// ─── Ana Fatura Girişi ─────────────────────────────────────────────────────────

/** Basitleştirilmiş fatura girişi — SDK tüm hesaplamaları otomatik yapar */
export interface SimpleInvoiceInput {
    // ── Zorunlu alanlar ──────────────────────────────────────────────────────
    /** Gönderici (satıcı) bilgisi — zorunlu */
    sender: SimplePartyInput;
    /** Alıcı (müşteri) bilgisi — zorunlu */
    customer: SimplePartyInput;
    /** Fatura satırları — zorunlu, en az 1 satır */
    lines: SimpleLineInput[];

    // ── Belge kimlik ve tarih ────────────────────────────────────────────────
    /** Fatura numarası (ör: "ABC2025000000001") — opsiyonel, seri/numara sistemi için */
    id?: string;
    /** Fatura UUID — opsiyonel, verilmezse otomatik üretilir */
    uuid?: string;
    /** Fatura tarihi/saati (ISO format: "2025-01-15T10:30:00") — opsiyonel, verilmezse şimdiki zaman */
    datetime?: string;

    // ── Tip ve profil (genelde otomatik tespit edilir) ───────────────────────
    /**
     * Fatura tipi — opsiyonel.
     * Verilmezse satır vergi durumlarına göre otomatik tespit edilir:
     *   - Tevkifat varsa → TEVKIFAT
     *   - KDV %0 ise ve istisna kodu verilmişse → ISTISNA / IHRACKAYITLI / OZELMATRAH
     *   - Diğer → SATIS
     *
     * Manuel override: "SATIS" | "IADE" | "TEVKIFAT" | "ISTISNA" | "IHRACKAYITLI" | "OZELMATRAH" | "SGK"
     */
    type?: string;
    /**
     * Fatura profili — opsiyonel.
     * Verilmezse otomatik tespit edilir.
     * Manuel override: "TEMELFATURA" | "TICARIFATURA" | "EARSIVFATURA" | "IHRACAT" | "KAMU"
     */
    profile?: string;

    // ── Para birimi ──────────────────────────────────────────────────────────
    /** Para birimi kodu — varsayılan: "TRY" */
    currencyCode?: string;
    /** Döviz kuru (TRY dışı para birimlerinde zorunlu) */
    exchangeRate?: number;

    // ── KDV İstisna ──────────────────────────────────────────────────────────
    /**
     * KDV istisna kodu — ISTISNA, IHRACKAYITLI, OZELMATRAH tipleri için.
     * İstisna kodları: 201-350 (istisna), 701-703 (ihraç kayıtlı), 801-812 (özel matrah)
     */
    kdvExemptionCode?: string;

    // ── Özel matrah (OZELMATRAH tipi için) ───────────────────────────────────
    /** Özel matrah bilgisi — OZELMATRAH tipi faturalar için zorunlu */
    ozelMatrah?: SimpleOzelMatrahInput;

    // ── Referanslar ──────────────────────────────────────────────────────────
    /** Sipariş referansı */
    orderReference?: SimpleOrderReferenceInput;
    /** Fatura referansı (iade faturaları için zorunlu) */
    billingReference?: SimpleBillingReferenceInput;
    /** İrsaliye referansları */
    despatchReferences?: SimpleDespatchReferenceInput[];
    /** Ek doküman referansları */
    additionalDocuments?: SimpleAdditionalDocumentInput[];

    // ── Ödeme ────────────────────────────────────────────────────────────────
    /** Ödeme bilgisi (KAMU profili için zorunlu) */
    paymentMeans?: SimplePaymentMeansInput;

    // ── Notlar ───────────────────────────────────────────────────────────────
    /** Fatura notları */
    notes?: string[];

    // ── Profil bazlı opsiyonel alanlar ───────────────────────────────────────
    /** İhracat alıcı bilgisi (IHRACAT profili için) */
    buyerCustomer?: SimpleBuyerCustomerInput;
    /**
     * Aracı kurum bilgisi — YOLCUBERABERFATURA profili için zorunlu (B-NEW-13).
     * Turiste KDV iadesi işlemini yürüten aracı firma.
     */
    taxRepresentativeParty?: SimpleTaxRepresentativeInput;
    /** SGK fatura bilgisi (SGK tipi için) */
    sgk?: SimpleSgkInput;
    /** Online satış bilgisi (e-Arşiv internet satışları için) */
    onlineSale?: SimpleOnlineSaleInput;
    /** e-Arşiv gönderim bilgisi */
    eArchiveInfo?: SimpleEArchiveInput;
    /** Fatura dönemi */
    invoicePeriod?: SimplePeriodInput;

    // ─── Yatırım Teşvik ──────────────────────────────────────────────────────
    /** Yatırım Teşvik Belgesi numarası (6 haneli numerik) — YATIRIMTESVIK profili için zorunlu */
    ytbNo?: string;
    /** YTB belge tarihi (ISO format: "2025-01-15") */
    ytbIssueDate?: string;

    // ─── XSLT şablon ─────────────────────────────────────────────────────────
    /** XSLT şablon (Base64) — fatura görsel şablonu */
    xsltTemplate?: string;
}
