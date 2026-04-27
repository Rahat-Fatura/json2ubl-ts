# json2ubl-ts

JSON verilerinden resmi **UBL-TR 2.1** XML belgeleri oluşturan kapsamlı TypeScript kütüphanesi.

GIB e-Fatura Paketi 17 Schematron kurallarını tam kapsam destekler. İki katmanlı API sunar:

1. **SimpleInvoiceBuilder** — Basit JSON gir, SDK tüm hesaplamaları otomatik yapsın
2. **InvoiceBuilder** — Tam kontrol — tüm alanları kendin belirle

## Özellikler

- **Otomatik Hesaplama**: KDV, ÖTV (matrah artırıcı), Damga V. (matrah azaltıcı), tevkifat, iskonto
- **Otomatik Tip/Profil Tespiti**: Satır vergi durumlarına göre fatura tipi ve profilini tespit eder
- **Dinamik Konfigürasyon**: Runtime'da DB'den config güncellemesi — restart gerektirmez
- **Reaktif Session (InvoiceSession)**: EventEmitter tabanlı canlı hesaplama ve UI state derivation
- **12 Fatura Profili**: TEMELFATURA, TICARIFATURA, IHRACAT, YOLCUBERABERFATURA, OZELFATURA, KAMU, HKS, ENERJI, ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS, EARSIVFATURA
- **20+ Fatura Tipi**: SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH, IHRACKAYITLI, SGK, KOMISYONCU, KONAKLAMAVERGISI, TEKNOLOJIDESTEK, YTB* vb.
- **3 İrsaliye Profili**: TEMELIRSALIYE, HKSIRSALIYE, IDISIRSALIYE
- **3 Katmanlı Validasyon**: Ortak + Tip-bazlı + Profil-bazlı + Çapraz matris
- **53 Schematron Kuralı**: Tam uyumluluk (UBL-TR Common + Main Schematron)
- **CJS + ESM + DTS** çıktı

## Kurulum

```bash
yarn add json2ubl-ts
```

---

## 1. SimpleInvoiceBuilder — Basit Kullanım

En az veriyle fatura oluştur, SDK hesaplamaları ve XML'i otomatik üretsin:

```typescript
import { SimpleInvoiceBuilder } from 'json2ubl-ts';

const builder = new SimpleInvoiceBuilder();
const { xml } = builder.build({
  sender: {
    taxNumber: '1234567890',
    name: 'Demo Yazılım AŞ',
    taxOffice: 'Büyük Mükellefler VD',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Alıcı Ticaret AŞ',
    taxOffice: 'Ankara VD',
    address: 'Kızılay',
    district: 'Çankaya',
    city: 'Ankara',
  },
  lines: [
    { name: 'Yazılım Lisansı', quantity: 1, price: 10000, kdvPercent: 20 },
    { name: 'Teknik Destek', quantity: 12, price: 500, unitCode: 'Ay', kdvPercent: 20 },
  ],
});
// SDK otomatik olarak:
// - KDV hesaplar (10000 × 20% = 2000 + 6000 × 20% = 1200)
// - VKN/TCKN ayrımı yapar (10 hane → VKN)
// - Tip tespit eder (SATIS)
// - Profil tespit eder (TICARIFATURA)
// - UUID üretir
// - Signature oluşturur
// - Tam UBL-TR XML çıktısı verir
```

### Tevkifat Faturası

```typescript
const { xml } = builder.build({
  sender: { /* ... */ },
  customer: { /* ... */ },
  lines: [
    {
      name: 'İnşaat Taahhüt İşi',
      quantity: 1,
      price: 200000,
      kdvPercent: 20,
      withholdingTaxCode: '601', // Yapım işleri tevkifatı %40
    },
  ],
});
// Otomatik: tip=TEVKIFAT, KDV=40000, Tevkifat=16000, Ödenecek=224000
```

### İade Faturası

```typescript
const { xml } = builder.build({
  sender: { /* ... */ },
  customer: { /* ... */ },
  type: 'IADE',
  billingReference: {
    id: 'ABC2025000000001',
    issueDate: '2025-01-15',
  },
  lines: [
    { name: 'Ürün İade', quantity: 1, price: 10000, kdvPercent: 20 },
  ],
});
// Otomatik: profil=TEMELFATURA, BillingReference.DocumentTypeCode='IADE'
```

### İstisna / İhraç Kayıtlı / Özel Matrah

```typescript
// İstisna
builder.build({
  /* ... */
  kdvExemptionCode: '301', // Mal ihracatı
  lines: [{ name: 'İhraç Malı', quantity: 100, price: 500, kdvPercent: 0 }],
});

// İhraç Kayıtlı
builder.build({
  /* ... */
  kdvExemptionCode: '701',
  lines: [{ name: 'Tekstil', quantity: 500, price: 200, kdvPercent: 0 }],
});

// Özel Matrah
builder.build({
  /* ... */
  type: 'OZELMATRAH',
  kdvExemptionCode: '801',
  ozelMatrah: { percent: 20, taxable: 50000, amount: 10000 },
  lines: [{ name: '2. El Araç', quantity: 1, price: 250000, kdvPercent: 0 }],
});
```

### Dövizli Fatura

```typescript
builder.build({
  /* ... */
  currencyCode: 'USD',
  exchangeRate: 32.50,
  lines: [{ name: 'Software License', quantity: 1, price: 5000, kdvPercent: 20 }],
});
```

---

## 2. InvoiceSession — Reaktif Frontend Entegrasyonu (AR-10, v2.1.0+)

Frontend'de canlı veri girişi sırasında **path-based update + field-level events + line-level FieldVisibility + validator pipeline** sağlar:

```typescript
import { InvoiceSession, SessionPaths } from 'json2ubl-ts';

const session = new InvoiceSession();

// ── Path-based update (TEK MUTATE GATEWAY, AR-10) ──

session.update(SessionPaths.senderTaxNumber, '1234567890');
session.update(SessionPaths.senderName, 'Firma A.Ş.');
session.update(SessionPaths.customerTaxNumber, '9876543210');

session.addLine({ name: 'Ürün A', quantity: 10, price: 100, kdvPercent: 20 });
session.update(SessionPaths.lineKdvPercent(0), 18);             // tek alan, line-level

// Tip değiştir → profil auto-resolve (IADE → TEMELFATURA otomatik)
session.update(SessionPaths.type, 'IADE');

// Liability değiştir → profil auto-resolve (earchive → EARSIVFATURA otomatik)
session.update(SessionPaths.liability, 'earchive');

// Çift indeks (line.taxes[ti])
session.update(SessionPaths.lineTaxCode(0, 0), '0071');
session.update(SessionPaths.lineTaxPercent(0, 0), 25);

// XML üret
const xml = session.buildXml();
```

### Event Dinleme (React/Vue/Svelte state güncellemeleri)

```typescript
// 1. Field-level events (granüler, ilk emit)
session.on('field-changed', ({ path, value, previousValue, requestedValue, forcedReason }) => {
  // path: 'sender.taxNumber' | 'lines[0].kdvPercent' vb.
  // requestedValue + forcedReason: D-12 force durumunda dolar (örn. isExport=true tip ISTISNA force)
});

session.on('field-activated', ({ path, reason }) => {
  // path: 'fields.showWithholdingTaxSelector' (visibility false → true)
  ui.show(path);
});

session.on('field-deactivated', ({ path, reason }) => ui.hide(path));

session.on('line-field-changed', ({ lineIndex, path, field, value }) => {
  // line-level update'ler için ek granüler event
});

// 2. Path validation reddi (D-Seçenek B)
session.on('path-error', ({ code, path, reason, requestedValue }) => {
  // code: 'INVALID_PATH' | 'READ_ONLY_PATH' | 'UNKNOWN_PATH' | 'INDEX_OUT_OF_BOUNDS'
  //     | 'PROFILE_EXPORT_MISMATCH' | 'PROFILE_LIABILITY_MISMATCH' | 'LIABILITY_LOCKED_BY_EXPORT'
  showError(code, reason);
});

// 3. UI state snapshot
session.on('ui-state-changed', (state) => {
  // state.fields: doc-level FieldVisibility (18 boolean)
  // state.lineFields[i]: line-level LineFieldVisibility (10 boolean per line)
  // state.allowedProfiles, state.allowedTypes, state.availableExemptions
  setUIState(state);
});

// 4. Validation
session.on('warnings', (warnings: ValidationWarning[]) => showWarnings(warnings));
session.on('validation-error', (errors: ValidationError[]) => debugLog(errors));   // raw stream

// 5. Snapshot events (geriye uyumlu)
session.on('type-changed', ({ type, profile }) => {});
session.on('profile-changed', ({ profile, type }) => {});
session.on('liability-changed', ({ liability }) => {});
session.on('calculated', (calc) => {});
session.on('changed', (input) => {});

// 6. Runtime exception (calculate throw vb.) — path-related için 'path-error' kullan
session.on('error', (err: Error) => {});
```

### Session API Referansı (v2.1.0)

```typescript
class InvoiceSession extends EventEmitter {
  // Constructor
  constructor(options?: {
    initialInput?: Partial<SimpleInvoiceInput>;
    isExport?: boolean;                         // readonly, M10 kontratı
    liability?: 'einvoice' | 'earchive';
    autoCalculate?: boolean;
    allowReducedKdvRate?: boolean;              // M4 / B-78.1 opt-in
  });

  // Getter'lar
  get input(): SimpleInvoiceInput;
  get calculation(): CalculatedDocument | null;
  get uiState(): InvoiceUIState;                // .fields + .lineFields[]
  get fields(): FieldVisibility;
  get warnings(): ValidationWarning[];
  get liability(): CustomerLiability | undefined;
  get isExport(): boolean;

  // ✨ TEK MUTATE GATEWAY (AR-10) ✨
  update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P]): void;

  // Line CRUD (path-based değil — array operations)
  addLine(line: SimpleLineInput): void;
  updateLine(index: number, updates: Partial<SimpleLineInput>): void;
  removeLine(index: number): void;
  setLines(lines: SimpleLineInput[]): void;

  // Sorgulama (Mimsoft form dropdown'ları için kritik)
  getAllowedProfiles(type?: string): string[];
  getAllowedTypes(profile?: string): string[];
  getAvailableExemptions(): ExemptionDefinition[];
  getAvailableBillingDocumentTypeCodes(): { code: string; label: string; forced: boolean }[];

  // Çıktı
  calculate(): CalculatedDocument | null;
  validate(): ValidationWarning[];
  toInvoiceInput(): InvoiceInput;               // D-3 reference equality cache
  buildXml(options?: { validationLevel?: 'none' | 'basic' | 'strict' }): string;
}
```

### Path-based Update — Geçiş (v2.0.0 → v2.1.0)

| v2.0.0 (kaldırıldı) | v2.1.0 (yeni) |
|---|---|
| `setSender(party)` | `update(SessionPaths.senderTaxNumber, x)` + ... |
| `setType('TEVKIFAT')` | `update(SessionPaths.type, 'TEVKIFAT')` |
| `setProfile('IHRACAT')` | constructor `{ isExport: true }` + `getAllowedProfiles()` |
| `setLiability('earchive')` | `update(SessionPaths.liability, 'earchive')` |
| `setCurrency('USD', 32)` | `update(SessionPaths.currencyCode, 'USD')` + `update(SessionPaths.exchangeRate, 32)` |
| `setKdvExemptionCode('351')` | `update(SessionPaths.kdvExemptionCode, '351')` |
| `setBillingReference(ref)` | `update(SessionPaths.billingReferenceId, ref.id)` + ... |
| `setPaymentMeans(pm)` | `update(SessionPaths.paymentMeansMeansCode, '1')` + ... |
| `setInput(full)` / `patchInput(patch)` | constructor `{ initialInput }` veya path-based update sequence |

Migration disiplini: Mimsoft form akışı tek mutate noktasından (`update`) geçer; `SessionPaths` map TypeScript autocomplete + compile-time tip kontrolü sağlar.

### LineFieldVisibility (Line-level UI, AR-10)

```typescript
interface LineFieldVisibility {
  showKdvExemptionCodeSelector: boolean;        // line.kdvPercent === 0 + non-self-exemption
  showWithholdingTaxSelector: boolean;          // type=TEVKIFAT|TEVKIFATIADE
  showWithholdingPercentInput: boolean;         // withholdingTaxCode === '650' (dinamik)
  showLineDelivery: boolean;                    // IHRACAT veya IHRACKAYITLI
  showCommodityClassification: boolean;         // IHRACKAYITLI + line.kdvExemptionCode === '702'
  showAlicidibsatirkod: boolean;                // IHRACKAYITLI + 702
  showAdditionalItemIdentifications: boolean;   // TEKNOLOJIDESTEK / ILACTIBBI / IDIS
  showItemClassificationCode: boolean;          // YATIRIMTESVIK harcama tipi
  showProductTraceId: boolean;                  // YATIRIMTESVIK + itemClassificationCode === '01'
  showSerialId: boolean;                        // YATIRIMTESVIK Kod 01 makine
}

// Erişim:
session.uiState.lineFields[lineIndex].showCommodityClassification  // boolean
```

### Liability ve isExport Davranışı (M10 kontratı)

- **`isExport`**: constructor-only, readonly. `update('isExport', x)` → `path-error` (`READ_ONLY_PATH`).
- **`isExport=true`** session'da:
  - profil otomatik `IHRACAT`, tip otomatik `ISTISNA` (M2 identity).
  - `update('type', 'SATIS')` → `field-changed` payload `{ value: 'ISTISNA', requestedValue: 'SATIS', forcedReason: 'isExport=true' }` (D-12).
  - `update('liability', x)` → `path-error` (`LIABILITY_LOCKED_BY_EXPORT`), state değişmez.
- **`liability`** path-based: `update(SessionPaths.liability, 'einvoice' | 'earchive' | undefined)`. Profile auto-resolve (örn. `earchive` + `TICARIFATURA` → `EARSIVFATURA`).
- **Profile constraint**: `update('profile', 'TICARIFATURA')` `liability='earchive'` ise → `path-error` (`PROFILE_LIABILITY_MISMATCH`).

### React Hook Örneği (Mimsoft)

```typescript
function useInvoiceSession(initialInput?: Partial<SimpleInvoiceInput>) {
  const session = useMemo(() => new InvoiceSession({ initialInput }), []);
  const [uiState, setUIState] = useState(session.uiState);

  useEffect(() => {
    session.on('ui-state-changed', setUIState);
    return () => session.off('ui-state-changed', setUIState);
  }, [session]);

  return { session, uiState };
}

// Form bileşeni
const { session, uiState } = useInvoiceSession();

<input onChange={e => session.update(SessionPaths.senderTaxNumber, e.target.value)} />
{uiState.fields.showWithholdingTaxSelector && <WithholdingDropdown />}
{uiState.lineFields[0]?.showCommodityClassification && <GtipInput />}
```

### 2.X SuggestionEngine — Advisory Öneriler (AR-10 Faz 2, v2.2.0+)

Faz 2 ile birlikte session, validator-error'lardan ayrı bir **advisory** kanal sunar. Validator "bu olmadan XML üretilmez" derken, suggestion "bu varsayılanı seçmek istemez misin?" der. Aynı path için ikisi paralel emit edilebilir; UI iki mesajı yan yana gösterir (kırmızı hata + mavi öneri).

**`suggestion` event:**

```typescript
session.on('suggestion', (suggestions) => {
  // suggestions: Suggestion[] — yeni veya değişmiş öneriler (batch payload)
  for (const s of suggestions) {
    showAdvisoryHint({
      path: s.path,                    // 'lines[0].kdvExemptionCode'
      value: s.value,                  // '351'
      reason: s.reason,                // Türkçe tooltip
      severity: s.severity,            // 'recommended' | 'optional'
      ruleId: s.ruleId,                // 'kdv/zero-suggest-351'
      label: s.displayLabel,           // '351 — KDV İstisna' (opsiyonel)
    });
  }
});
```

**Diff semantics:** Boş diff (added=0 && changed=0) → emit YOK. Aynı state ardışık `validate()` çağrıları suggestion event'i tekrarlamaz. Primary key `${ruleId}::${path}` — value/reason/severity değişimi changed olarak emit edilir.

**Kural kapsamı (v2.2.0):** 23 kural — KDV (7), Tevkifat (5), IHRACKAYITLI (3), YATIRIMTESVIK (4), Delivery (3), Misc (2). Domain bazlı `src/calculator/suggestion-rules/` altında.

**Apply pattern:**

```typescript
session.on('suggestion', (suggestions) => {
  // Kullanıcı "Apply" tıklarsa
  for (const s of suggestions) {
    if (userApproved(s)) {
      session.update(s.path as any, s.value);
    }
  }
});
```

**Performance:** 100 satır × 23 kural senaryosunda suggestion engine ~0.01ms (15ms threshold × 1000 altı). Toplam pipeline ~0.14ms. Detay: `audit/sprint-08i-implementation-log.md`.

---

## 3. ConfigManager — Dinamik Konfigürasyon

Vergi, tevkifat, istisna, birim ve para birimi tanımları statik embed edilmiştir. Uygulama çalışırken DB'den güncel verilerle override edilebilir, restart gerekmez:

```typescript
import { configManager } from 'json2ubl-ts';

// ── 1. Başlangıçta DB verisiyle initialize ──
const dbTaxes = await db.query('SELECT * FROM taxes');
const dbWithholdings = await db.query('SELECT * FROM withholding_taxes');
const dbExemptions = await db.query('SELECT * FROM exemptions');

configManager.initialize({
  taxes: dbTaxes,
  withholdingTaxes: dbWithholdings,
  exemptions: dbExemptions,
});

// ── 2. Runtime güncelleme (DB trigger sonrası) ──
// Örn: Yeni tevkifat kodu eklendi
configManager.updateWithholdingTaxes(newWithholdings);

// ── 3. Config değişiklik event'i dinle ──
configManager.on('config:taxes-updated', (taxes) => {
  console.log(`Vergi tanımları güncellendi: ${taxes.length} kayıt`);
});

configManager.on('config:all-updated', () => {
  // Tüm session'ları yeniden hesapla
  activeSessions.forEach(s => s.calculate());
});

// ── 4. Snapshot al (frontend'e gönder) ──
const snap = configManager.snapshot();
// { version: 3, taxes: [...], withholdingTaxes: [...], exemptions: [...], units: [...], currencies: [...] }

// ── 5. Fabrika ayarlarına dön ──
configManager.reset();
```

### ConfigManager API

```typescript
class ConfigManager extends EventEmitter {
  // Initialization
  initialize(options: ConfigInitOptions): void;
  reset(): void;
  get isInitialized(): boolean;
  get version(): number;

  // Runtime Update
  updateTaxes(taxes: TaxDefinition[]): void;
  updateWithholdingTaxes(wt: WithholdingTaxDefinition[]): void;
  updateExemptions(ex: ExemptionDefinition[]): void;
  updateUnits(units: UnitDefinition[]): void;
  updateCurrencies(currencies: CurrencyDefinition[]): void;
  updateAll(options: ConfigInitOptions): void;

  // Okuma
  getTax(code: string): TaxDefinition | undefined;
  getWithholdingTax(code: string): WithholdingTaxDefinition | undefined;
  getExemption(code: string): ExemptionDefinition | undefined;
  resolveUnitCode(input: string): string;
  getCurrency(code: string): CurrencyDefinition | undefined;

  // Listeler
  get taxes(): ReadonlyArray<TaxDefinition>;
  get withholdingTaxes(): ReadonlyArray<WithholdingTaxDefinition>;
  get exemptions(): ReadonlyArray<ExemptionDefinition>;
  get units(): ReadonlyArray<UnitDefinition>;
  get currencies(): ReadonlyArray<CurrencyDefinition>;

  // Snapshot
  snapshot(): ConfigInitOptions & { version: number };

  // Events
  on(event: 'config:initialized', handler: () => void): this;
  on(event: 'config:taxes-updated', handler: (taxes: TaxDefinition[]) => void): this;
  on(event: 'config:all-updated', handler: () => void): this;
}
```

---

## 4. InvoiceBuilder — Tam Kontrol (Düşük Seviye)

Tüm alanları kendin belirle, SDK sadece XML serialize etsin:

```typescript
import { InvoiceBuilder, InvoiceProfileId, InvoiceTypeCode } from 'json2ubl-ts';

const builder = new InvoiceBuilder({ validationLevel: 'strict' });

const xml = builder.build({
  id: 'ABC2024000000001',
  uuid: '12345678-1234-1234-1234-123456789012',
  profileId: InvoiceProfileId.TEMELFATURA,
  invoiceTypeCode: InvoiceTypeCode.SATIS,
  issueDate: '2024-01-15',
  currencyCode: 'TRY',
  supplier: {
    vknTckn: '1234567890',
    taxIdType: 'VKN',
    name: 'Satıcı Firma A.Ş.',
    cityName: 'İstanbul',
    country: 'Türkiye',
    taxOffice: 'Beyoğlu VD',
  },
  customer: {
    vknTckn: '12345678901',
    taxIdType: 'TCKN',
    firstName: 'Ahmet',
    familyName: 'Yılmaz',
    cityName: 'Ankara',
    country: 'Türkiye',
  },
  taxTotals: [{
    taxAmount: 2000,
    taxSubtotals: [{
      taxableAmount: 10000,
      taxAmount: 2000,
      percent: 20,
      taxTypeCode: '0015',
      taxTypeName: 'KDV',
    }],
  }],
  legalMonetaryTotal: {
    lineExtensionAmount: 10000,
    taxExclusiveAmount: 10000,
    taxInclusiveAmount: 12000,
    payableAmount: 12000,
  },
  lines: [{
    id: '1',
    invoicedQuantity: 1,
    unitCode: 'C62',
    lineExtensionAmount: 10000,
    taxTotal: {
      taxAmount: 2000,
      taxSubtotals: [{ taxableAmount: 10000, taxAmount: 2000, percent: 20, taxTypeCode: '0015' }],
    },
    item: { name: 'Yazılım Lisansı' },
    price: { priceAmount: 10000 },
  }],
});
```

---

## 5. Profil × Tip Uyumluluk Matrisi

| Profil | İzin Verilen Tipler |
|--------|-------------------|
| TEMELFATURA | SATIS, IADE, ISTISNA, IHRACKAYITLI, OZELMATRAH, TEVKIFAT, SGK, KOMISYONCU, KONAKLAMAVERGISI |
| TICARIFATURA | SATIS, IADE, ISTISNA, IHRACKAYITLI, OZELMATRAH, TEVKIFAT, SGK, KOMISYONCU, KONAKLAMAVERGISI |
| EARSIVFATURA | Tüm standart + TEKNOLOJIDESTEK + HKSSATIS/HKSKOMISYONCU + YTB* |
| IHRACAT | SATIS, ISTISNA, IHRACKAYITLI |
| YOLCUBERABERFATURA | SATIS, ISTISNA |
| KAMU | SATIS, ISTISNA, TEVKIFAT, IHRACKAYITLI, OZELMATRAH, KONAKLAMAVERGISI |
| HKS | SATIS, KOMISYONCU |
| ILAC_TIBBICIHAZ | SATIS, ISTISNA, TEVKIFAT, TEVKIFATIADE, IADE, IHRACKAYITLI |
| YATIRIMTESVIK | SATIS, ISTISNA, IADE, TEVKIFAT, TEVKIFATIADE |
| ENERJI | SARJ, SARJANLIK |
| IDIS | SATIS, ISTISNA, IADE, TEVKIFAT, TEVKIFATIADE, IHRACKAYITLI |

### Senaryo-Bazlı Zorunluluklar

| Senaryo | Zorunlu Alanlar |
|---------|----------------|
| **IADE** | `billingReference` (fatura ref.), profil otomatik TEMELFATURA |
| **TEVKIFAT** | En az 1 satırda `withholdingTaxCode` |
| **ISTISNA** | `kdvExemptionCode` (201-350) |
| **IHRACKAYITLI** | `kdvExemptionCode` (701-703) |
| **OZELMATRAH** | `kdvExemptionCode` (801-812) + `ozelMatrah` |
| **SGK** | `sgk` bilgisi + `invoicePeriod` |
| **IHRACAT** | `buyerCustomer` + satırlarda `delivery` (INCOTERMS, GTİP) |
| **YOLCUBERABERFATURA** | `buyerCustomer` + `taxRepresentativeParty` |
| **KAMU** | `paymentMeans` + IBAN (TR + 24 karakter) |
| **Döviz** | `currencyCode` + `exchangeRate` |

---

## 6. Hesaplama Motoru Detayları

### Vergi Hesaplama Algoritması

```
1. brütTutar = birimFiyat × miktar
2. iskonto = brütTutar × (iskontoProsent / 100)
3. netTutar = brütTutar - iskonto
4. Her ek vergi (ÖTV, Damga V. vb.) için:
   - ekVergi = netTutar × (vergiOranı / 100)
   - baseStat=true,  baseCalculate=true  → KDV matrahı += ekVergi  (matrah artırıcı: ÖTV)
   - baseStat=true,  baseCalculate=false → KDV matrahı -= ekVergi  (matrah azaltıcı: Damga V.)
   - baseStat=false, baseCalculate=false → taxForCalculate *= -1     (negatif: Gelir V. Stopajı)
5. KDV = modifiye_matrah × (kdvOranı / 100)
6. Tevkifat = kdvTutarı × (tevkifatOranı / 100)
7. Ödenecek = netTutar + taxForCalculate_toplam - tevkifat
```

### Tip Otomatik Tespiti

```
1. Satırda withholdingTaxCode varsa → TEVKIFAT
2. Kullanıcı type override verdiyse → override
3. kdvExemptionCode verilmişse → documentType'a göre (ISTISNA/IHRACKAYITLI/OZELMATRAH)
4. KDV %0 satır varsa → ISTISNA veya SATIS (karışık)
5. Varsayılan → SATIS
```

### Profil Otomatik Tespiti

```
1. Kullanıcı profile override verdiyse → override
2. eArchiveInfo veya onlineSale varsa → EARSIVFATURA
3. buyerCustomer varsa → IHRACAT
4. IADE tipi → TEMELFATURA
5. SGK tipi → TEMELFATURA
6. Varsayılan → TICARIFATURA
```

---

## 7. Embed Konfigürasyon Verileri

SDK aşağıdaki verileri statik olarak embed eder. ConfigManager ile runtime'da güncellenebilir:

| Config | Kayıt Sayısı | Açıklama |
|--------|-------------|----------|
| `taxes` | 25 | Vergi tanımları (KDV, ÖTV 1-4, Damga V., ÖİV, BSMV, vb.) |
| `withholdingTaxes` | 52 | Tevkifat kodları (601-627 kısmi, 801-825 tam) |
| `exemptions` | 86 | İstisna/muafiyet kodları (201-350 istisna, 701-703 ihraç kayıtlı, 801-812 özel matrah) |
| `units` | 75 | Birim kodları (Adet/C62, Litre/LTR, Kilogram/KGM, vb.) |
| `currencies` | 30 | Para birimleri (TRY, USD, EUR, GBP, vb.) |

---

## 8. Sorumluluk Matrisi

Kütüphane hangi karardan sorumlu, hangisinden değil. Tüketici kodunun bilmesi gereken non-obvious davranışlar.

| Karar | Kapsam | Dosya / Kaynak |
|-------|--------|-----------------|
| **M1** | `PROFILE_TYPE_MATRIX` tek truth source; profil+tip kombinasyonları whitelist | `src/calculator/invoice-rules.ts` |
| **M2** | IHRACAT/YOLCU/OZELFATURA yalnızca ISTISNA tipi kabul eder | `src/calculator/invoice-rules.ts` |
| **M3** (B-95) | **650 dinamik stopaj** — kullanıcı `withholdingTaxPercent: 0-100` girer; UR-2 `65000+percent` combo XML'de | `src/calculator/withholding-config.ts` · [examples/10](./examples/10-ticarifatura-tevkifat-650-dinamik/) |
| **M4** (B-96) | **555 Demirbaş KDV** — `BuilderOptions.allowReducedKdvRate: true` opt-in flag zorunlu; default false reject eder | `src/types/builder-options.ts` · [examples/30](./examples/30-feature-555-demirbas-kdv/) |
| **M5** | **TAX_EXEMPTION_MATRIX** — istisna kodu × fatura tipi whitelist/forbidden + `requiresZeroKdvLine` | `src/validators/cross-check-matrix.ts` |
| **M6** | Parent-child conditional required — parent opsiyonel, parent varsa child zorunlu | `src/validators/*-validators.ts` |
| **M7** | Exemption-config → cross-check matrisi otomatik türetilir | `src/calculator/exemption-config.ts` |
| **M8** | **CustomizationID:** Fatura `TR1.2`, e-İrsaliye `TR1.2.1` — kütüphane builder'da sabitler | `src/config/namespaces.ts` |
| **M9** (B-102) | **Calculator tam float**, yuvarlama yalnızca XML yazım anında `toFixed(2)` XSD-yuvarlamalı alanlarda | `src/calculator/*.ts` · `src/serializers/*.ts` |
| **M10** (B-102) | **`setLiability()` `isExport=true` iken no-op** (error yerine) | `src/calculator/invoice-rules.ts` |
| **M11** (Sprint 8c, B-NEW-11) | **Self-exemption tipleri** (ISTISNA, IHRACKAYITLI, OZELMATRAH + IHRACAT, YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK profilleri) kendi istisna kodlarını taşır; dışındaki tiplerde KDV=0 kalem için **kullanıcıdan 351 manuel zorunlu** (calculator otomatik atamaz) | `src/config/self-exemption-types.ts` · `src/validators/manual-exemption-validator.ts` |
| **M12** (Sprint 8d) | **Phantom KDV (Vazgeçilen KDV Tutarı)** — YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA'da satır KDV matematiği TaxSubtotal içinde taşınır fakat LegalMonetaryTotal + parent TaxTotal'a dahil edilmez; `CalculationSequenceNumeric=-1` otomatik. Her satırda `0 < kdvPercent ≤ 100` + exemption code (308 Makine/01, 339 İnşaat/02) zorunlu. Kaynak: GİB Yatırım Teşvik Teknik Kılavuzu v1.1 (Aralık 2025) | `src/calculator/phantom-kdv-rules.ts` · `src/validators/phantom-kdv-validator.ts` |
| **AR-1** | `cbcTag` → `cbcRequiredTag` + `cbcOptionalTag` split | `src/utils/xml-helpers.ts` |
| **AR-2** | `driverPerson` → `driverPersons[]` array (çoklu sürücü desteği) | `src/types/despatch-input.ts` · [examples/34](./examples/34-irsaliye-temel-sevk-coklu-sofor/) |
| **AR-3..5** | PROFILE_TYPE_MATRIX helper API; map/matrix export edilmez | `src/calculator/invoice-rules.ts` |
| **AR-6** | Eski dead PaymentMeansCode set kaldırıldı | `src/calculator/payment-means-config.ts` |
| **AR-7** | Satır-seviyesi `kdvExemptionCode` alanı kaldırıldı (belge seviyesi tek kaynak) | `src/types/invoice-input.ts` |
| **AR-8** | Outstanding/Oversupply input alanları kaldırıldı | `src/types/*.ts` |
| **AR-9** (Sprint 8c, isim konuldu) | **Reactive InvoiceSession (vision)** — kullanıcı girişi akış tabanlı validator feedback. Mevcut `src/invoice-session.ts` snapshot validator rolü korunur; reaktif katman v2.1.0'da yeni modül olarak eklenecek | `audit/reactive-session-design-notes.md` |
| **AR-10** (Sprint 8h, v2.1.0) | **Reactive InvoiceSession (concrete realization)** — AR-9 vision'ın somut implementation'ı: path-based `update(path, value)` API + `SessionPaths` map + field-level events (`fieldChanged`/`fieldActivated`/`fieldDeactivated`/`lineFieldChanged`) + line-level FieldVisibility + validator pipeline (5 validator) + B-78 parametre köprüsü + structured `pathError` event. 19 eski setter kaldırıldı (BREAKING). `liability` `update(SessionPaths.liability, x)` ile yönetilir; `isExport` constructor-locked readonly. M10 kontratı korunur. | `src/calculator/invoice-session.ts` · `src/calculator/session-paths.generated.ts` · `audit/sprint-08h-plan.md` · `audit/sprint-08h-implementation-log.md` |
| **B-07** | IHRACKAYITLI + 702 için **GTİP (12 hane) + AlıcıDİBKod (11 hane)** zorunlu; simple-input'ta `SimpleLineDeliveryInput.alicidibsatirkod` alanı (B-NEW-12 / Sprint 8c) | `src/validators/profile-validators.ts` · [examples/07](./examples/07-temelfatura-ihrackayitli-702/) |
| **B-08** | YATIRIMTESVIK: `ytbNo` (6 hane) + Kod 01 Makine için `productTraceId+serialId+brand+model`; IADE grubunda muaf | `src/validators/profile-validators.ts` · [examples/12](./examples/12-yatirimtesvik-satis-makina/) |
| **B-83** | KAMU: `buyerCustomer` + `paymentMeans` + TR IBAN zorunlu; additionalIdentifiers (MUSTERINO) | [examples/15](./examples/15-kamu-satis/) |
| **B-104** | Despatch `DriverPerson.nationalityId` 11-hane TCKN zorunlu (ISO kodu reddedilir) | `src/validators/despatch-validators.ts` |
| **B-NEW-13** (Sprint 8c) | YOLCUBERABERFATURA: `SimpleBuyerCustomerInput.nationalityId + passportId` + belge seviyesi `SimpleInvoiceInput.taxRepresentativeParty` zorunlu | `src/calculator/simple-types.ts` · [examples/20](./examples/20-yolcu-beraber-istisna-yabanci/) |

### Kütüphane SORUMLULUĞUNDA OLMAYAN

- **Dijital imza** — `ext:UBLExtensions` yapısı kütüphane tarafından üretilmez. Bu imzalayıcı servisin (GİB veya özel entegrasyon) sorumluluğudur (ACIK-SORULAR §3).
- **Stopaj modeli XML pattern seçimi** — negatif `TaxAmount` mı yoksa ayrı `AllowanceCharge` mı: kütüphane XSD uyumlu pozitif stopaj subtotal üretir; GİB reddederse tüketici sorumluluğu.
- **Prod schematron simülasyonu** — `validationLevel: 'strict'` statik kurallar. GİB schematron + production quirks ayrı.

Ayrıntı: [audit/FIX-PLANI-v3.md](./audit/FIX-PLANI-v3.md).

---

## Geliştirme

```bash
yarn install                          # Bağımlılıkları kur
yarn typecheck                        # TypeScript kontrol
yarn test                             # Testleri çalıştır
yarn build                            # Derleme (CJS + ESM + DTS)
yarn examples                         # 38 örnek senaryoyu çalıştır (Sprint 8b)
npx tsx examples/run-all.ts yatirimtesvik  # Slug filtreli
npx tsx examples/NN-slug/run.ts       # Tek senaryo
```

## Lisans

MIT
