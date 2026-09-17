# 20 — YOLCUBERABERFATURA + ISTISNA (Yabancı Yolcu)

**Profile:** YOLCUBERABERFATURA · **Type:** ISTISNA · **CustomizationID:** TR1.2

## Amaç

"Bavul ticareti" — yabancı turistin Türkiye'den aldığı malı yurtdışına çıkarırken KDV iadesi talep ettiği senaryo. Kütüphane simple-input pasaport numarasını `buyerCustomer.taxNumber` alanına koyar.

## Validasyon Modu

`validationLevel: 'strict'` — turist kimliği (`firstName`/`familyName`/`nationalityId`/
`passportId`/`passportIssueDate`) ve aracı kurum adresi simple-input'ta TAM desteklenir.

## Girdi Özet

| Alan | Değer |
|------|-------|
| Sender VKN | `1460415308` (YOLCU cross-check) |
| BuyerCustomer | Alman turist — Michael / Schneider, uyruk `DE`, pasaport `N12345678` (veriliş `2021-06-15`) |
| TaxRepresentativeParty | Aracı kurum `9876543210` + posta adresi (XSD'de 1..1) |
| Satır | 1 × 800 TRY (Seramik vazo) KDV %0 |
| **Payable** | **800 TRY** |

## Normatif zorunlu alanlar (Gümrük İşlemleri Kılavuzu V1.8 §4.2.1)

| UBL yolu | Simple alan | Lafız |
|----------|-------------|-------|
| `BuyerCustomerParty/Party/Person/FirstName` | `buyerCustomer.firstName` | "Turistin adı zorunludur." |
| `…/Person/FamilyName` | `buyerCustomer.familyName` | "Turistin soyadı zorunludur." |
| `…/Person/NationalityID` | `buyerCustomer.nationalityId` | "Turistin uyruğu … ISO 3166-1-alpha-2" |
| `…/Person/IdentityDocumentReference/ID` | `buyerCustomer.passportId` | "Pasaport numarası zorunludur." |
| `…/IdentityDocumentReference/IssueDate` | `buyerCustomer.passportIssueDate` | "Pasaportun **verildiği** tarih zorunludur. Tarih yazılamıyorsa 2005-01-01 sabit değeri yazılabilir." |
| `TaxRepresentativeParty/PostalAddress` | `taxRepresentativeParty.{address,district,city,…}` | "Postal Adres: Aracı kurumun adres bilgileri" (XSD `PartyType` → 1..1) |

🔴 `firstName`/`familyName` `name` alanından TÜRETİLMEZ — `name` serbest unvandır
("Michael Schneider (Tourist)"); pasaporttaki ad/soyad ayrımını ondan çıkarmak
belgeye uydurulmuş kimlik yazmak olurdu.

## Çalıştırma

```bash
npx tsx examples/20-yolcu-beraber-istisna-yabanci/run.ts
```
