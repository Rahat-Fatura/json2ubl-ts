# 08 — TEMELFATURA + SGK (SGK Faturası)

**Profile:** TEMELFATURA · **InvoiceTypeCode:** SGK · **CustomizationID:** TR1.2

## Amaç

**SGK faturası** — Sosyal Güvenlik Kurumu'na yapılan sağlık/eczacılık/optik/medikal veya genel mal/hizmet satışında kullanılan özel tip. KDV normal oranda (%20 vb.) uygulanır, ancak belge seviyesinde ek `sgk` meta bloğu zorunludur.

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f16-sgk.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f16-sgk.xml).

## Kapsadığı Feature'lar

- **`SimpleInvoiceInput.sgk`** — belge seviyesi zorunlu obje
- **`sgk.type`** — alt-tip kodu: `SAGLIK_ECZ` (eczacılık), `SAGLIK_HAS` (hastane), `SAGLIK_OPT` (optik), `SAGLIK_MED` (medikal), `ABONELIK` (abone iletişim), `MAL_HIZMET` (genel mal/hizmet), `DIGER`
- **`documentNo`, `companyName`, `companyCode`** — SGK meta verisi

## Girdi Özet

| Alan | Değer |
|------|-------|
| `sgk.type` | `'SAGLIK_ECZ'` |
| `sgk.documentNo` | `'SGK-ECZ-2026-000042'` |
| `sgk.companyCode` | `'SGK-COMP-0042'` |
| Satır | 10 × 10 = 100 TRY |
| KDV %20 | 20 TRY |
| **Payable** | **120 TRY** |

## Çıktı Kritik Alanlar

```xml
<cbc:InvoiceTypeCode>SGK</cbc:InvoiceTypeCode>
<cac:AdditionalDocumentReference>
  <cbc:ID>SGK-ECZ-2026-000042</cbc:ID>
  <cbc:DocumentTypeCode>SGK</cbc:DocumentTypeCode>
  <cac:IssuerParty>
    <cac:PartyName><cbc:Name>Yeşil Eczane Zincir Ticaret A.Ş.</cbc:Name></cac:PartyName>
    <cac:PartyIdentification><cbc:ID schemeID="SGKNO">SGK-COMP-0042</cbc:ID></cac:PartyIdentification>
  </cac:IssuerParty>
</cac:AdditionalDocumentReference>
```

## Gotcha

- `sgk` obje eksikse `MISSING_FIELD` hatası belge seviyesi.
- Alt-tip kodları (SAGLIK_ECZ vb.) değiştirilemez — kütüphane enum whitelist.
- SGK ile KDV İstisna Kodları (201-250) uyumludur (M5 matrix izinli).

## Çalıştırma

```bash
npx tsx examples/08-temelfatura-sgk/run.ts
```
