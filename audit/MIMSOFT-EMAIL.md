---
belge: Mimsoft'a gönderilecek teyit email şablonu (cevap-filtrelemiş)
tarih: 2026-04-22
kaynak: ACIK-SORULAR.md email şablonu, kullanıcı cevapları sonrası süzülmüş
onceki_soru_sayisi: 9
guncel_soru_sayisi: 3 (+1 opsiyonel)
durum: IPTAL (v3 revizyonu, 2026-04-22)
---

> **GÜNCELLENME (v3, 2026-04-22):** Bu soruların cevabı kullanıcı tarafından iç teyit
> ile netleşecek. Dış email **gerekmez** — kullanıcı Mimsoft'un kendisi. Sprint 4
> (B-17 stopaj aritmetik) ve Sprint 6 (B-19 DespatchContact, B-49 DORSE path)
> başlamadan önce kullanıcı Mimsoft kodunu inceleyip cevapları iç olarak verecek.
> Bu dosya tarihi referans olarak korunur; sorulara atıf yapılabilir ama email
> **gönderilmeyecek**. Detay için `FIX-PLANI-v3.md`.

# Mimsoft Teyit Email Şablonu

> Açık Sorular cevaplarından sonra kullanıcı kararıyla çözülen maddeler email'den çıkarıldı. Kalan maddeler kütüphanenin v2.0.0 hazırlığında Mimsoft production log ve davranış teyidi bekliyor.

## Çıkarılan Maddeler (Kullanıcı Karar Verdi)

| Eski Madde | Açık Soru | Karar |
|---|---|---|
| 1. Tevkifat 650 kodu production kullanımı | #6 | 650 dinamik yüzde mekanizması ile desteklenecek (M3) — Mimsoft teyidine gerek yok |
| 2. CustomizationID TR1.2 vs TR1.2.1 | #16 | Fatura + İrsaliye ikisi de TR1.2 — kullanıcı belirtti (M8) |
| 5. Kısmi gönderim (Outstanding/Oversupply) kullanım sıklığı | #25e | Eklenmeyecek — B-50 iptal |
| 7. Yuvarlama stratejisi (Banker's, satır/belge sıra) | #20 | Hesapta yuvarlama yok, sadece serializer'da (M9) — kullanıcı belirtti |
| 9. Damga V./Konaklama V. matrahdan düşüm | #24 | Kütüphane doğru — değişiklik yok |

## Kalan Maddeler (Mimsoft Teyidi Gerekli)

**Konu:** json2ubl-ts v2.0.0 öncesi kararlar — Mimsoft davranış teyidi

Merhaba,

json2ubl-ts kütüphanesinin v2.0.0 hazırlığı sürecinde aşağıdaki davranışlar için Mimsoft pre-validation ve production log teyidine ihtiyacımız var:

### 1. DespatchContact / DespatchSupplierParty / "Teslim Eden" zorunluluk

İrsaliye gönderimlerinde `cac:DespatchSupplierParty/cac:DespatchContact/cbc:Name` alanı (Teslim Eden kişi adı) olmadan gelen irsaliyeler Mimsoft tarafından reject ediliyor mu, yoksa opsiyonel olarak geçiyor mu?

- Kütüphanede bu alan şu an input tipinde yok; kullanıcı ekleyemiyor.
- Sorumuz: Mimsoft bu alanın kimliğini/Name'ini zorunlu sayıyor mu? Sık gönderim senaryosunda doldurulmuş mu?

### 2. DORSE plaka canonical path

İrsaliyede DORSE (römork) plakası için iki farklı yol var:

- (a) `cac:Shipment/cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID[schemeID="DORSE"]` (Codelist yolu)
- (b) `cac:Shipment/cac:TransportHandlingUnit/cac:TransportEquipment/cbc:ID[schemeID="DORSEPLAKA"]` (canonical `Irsaliye-Ornek1.xml` yolu)

Sorumuz:
- Mimsoft hangi yolu bekliyor?
- İkisi de kabul ediliyor mu?
- Birisi mutlaka gerekli mi?
- Prod log'da hangisi daha sık kullanılıyor?

### 3. Stopaj UBL modelleme — TaxInclusive aritmetik tutarsızlığı

Kütüphanede stopaj (0003/0011/9040 kodları) satır hesabında şöyle çalışıyor:

- `taxForCalculate` negatif yansıtılır (matrah etki olarak düşüm)
- `cbc:TaxAmount` XML'de pozitif yazılır
- `TaxInclusiveAmount = lineExtensionAmount + Σ taxForCalculate` (negatif stopaj dahil, toplam düşer)

UBL 2.1 genel prensibi `TaxInclusiveAmount = TaxExclusiveAmount + Σ TaxAmount` eşitliği. Stopaj modelinde bu eşitlik tam tutmuyor çünkü XML'deki TaxAmount pozitif ama iç hesapta negatif.

Sorumuz:
- Mimsoft pre-validation bu eşitliği satır/belge seviyesinde kontrol ediyor mu? Hangi değerle?
- GİB Schematron'u bu eşitliği stopajlı faturalarda nasıl değerlendiriyor?
- Canonical GİB örneklerinde (stopajlı fatura) `TaxInclusiveAmount` ve `TaxTotal/TaxAmount` nasıl hesaplanmış? (Birebir değer örneği alabilir miyiz?)

> Bu soru bizim B-17 bulgusunun nihai kararını etkiliyor.

### 4. (Opsiyonel) xsi:schemaLocation emit

Kütüphane `<Invoice>` root tag'ine `xsi:schemaLocation="..."` attribute'ı ekliyor. İç test ve prod log'larımız problem göstermiyor ama:

- Mimsoft pre-validation bu attribute'la gelen XML'i reddediyor mu?
- GİB'in strict reject davranışında bu attribute'un etkisi var mı?

> Cevap "problem yok" ise attribute olduğu gibi kalacak.

---

**Neden bu kadar az soru?** Açık Sorular dosyamızdaki 25 sorudan 23'ü iç karar olarak verildi. Geriye kalan 2 madde (B-17 stopaj aritmetik + opsiyonel xsi:schemaLocation) ve 2 despatch davranış teyidi (DespatchContact + DORSE) sizin production davranışınıza bağlı olduğundan teyit gerekiyor.

**Cevap zaman planı:** Sprint 1-3'ü bu cevaplar olmadan başlatabiliyoruz (mimari refactor'lar). Sprint 4 (Calculator + Aritmetik) için **Madde 3 cevabı Sprint 4 başlamadan kritik**. Sprint 6 (Despatch) için **Madde 1 + 2 cevabı Sprint 6 başlamadan kritik**.

Kolaylıklar,
Berkay Gökçe

---

## Email Sonrası Plan

| Mimsoft Cevabı | Etkilenen Bulgu | Aksiyon |
|---|---|---|
| DespatchContact zorunlu | B-19 | Input tipine ekle (zorunlu veya opsiyonel kararı) |
| DORSE canonical path seçimi | B-49 | İki yolu da destekle veya tek yolu seç |
| Stopaj TaxInclusive modeli | B-17, B-T04 | Bulgu iptal / korunur / yeniden tanımlanır |
| xsi:schemaLocation etki yok | — | Status quo — kalsın |
