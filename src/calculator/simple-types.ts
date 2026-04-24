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
    /** e-Fatura/e-Arşiv posta kutusu etiketi (ör: "urn:mail:defaultpk@...") */
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
    /** Ürün açıklaması */
    description?: string;
    /** Marka */
    brand?: string;
    /** Model */
    model?: string;
    /** Alıcı ürün kodu */
    buyerCode?: string;
    /** Satıcı ürün kodu */
    sellerCode?: string;
    /** Üretici ürün kodu */
    manufacturerCode?: string;
    /** Menşe ülke */
    origin?: string;
    /** Satır notu */
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
    /** Paket ID */
    packageId?: string;
    /** Paket miktarı */
    packageQuantity?: number;
    /** Paket tipi kodu */
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

/** SGK faturası bilgisi */
export interface SimpleSgkInput {
    /** SGK tipi (SAGLIK_ECZ, SAGLIK_HAS, SAGLIK_OPT, SAGLIK_MED, ABONELIK, MAL_HIZMET, DIGER) */
    type: string;
    /** Döküm numarası */
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
    /** Kargo firma vergi numarası */
    carrierTaxNumber?: string;
    /** Kargo firma adı */
    carrierName?: string;
    /** Teslimat tarihi */
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
}

/** Fatura dönemi (SGK faturaları vb.) */
export interface SimplePeriodInput {
    /** Dönem başlangıç tarihi (ISO format) */
    startDate: string;
    /** Dönem bitiş tarihi (ISO format) */
    endDate: string;
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
