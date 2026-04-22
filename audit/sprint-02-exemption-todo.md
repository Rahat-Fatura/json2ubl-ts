# Sprint 2 — Exemption Config Eksik Kodlar / İleri Araştırma Listesi

N1 disiplini gereği isim bulunamayan kodlar bu dosyaya not edilir. Config'e placeholder eklenmez.

## Durum Özeti

Sprint 2'de eklenen yeni exemption kodları (skill `gib-teknik-dokuman` referans alınarak):

- **ISTISNA (§4.8.1 Kısmi İstisna):** 218, 241, 242, 250 → 4 kod
- **ISTISNA (§4.8.2 Tam İstisna):** 326, 327, 328, 329, 330, 331, 333, 334, 336, 337, 338, 340, 341, 342, 343, 344 → 16 kod
- **IHRACKAYITLI (§4.8.7):** 704 → 1 kod
- **SATIS OTV (§4.8.4):** 151 → 1 kod
- **Toplam yeni:** 22 kod

## Plan Hedefi vs Gerçek

Plan §2 "ISTISNA 52→188 hedef" şeklinde belirtilmişti. Bu sayı **`constants.ts:ISTISNA_TAX_EXEMPTION_REASON_CODES` whitelist'inin 188 üye** içermesinden geliyordu (B-03 bulgusu: 10 geçersiz kod dahil 188).

Gerçekte UBL-TR v1.42 kapsamındaki toplam exemption kod sayısı (tüm kategoriler dahil) **~109 kod**:

- §4.8.1 Kısmi İstisna: 37 kod (201-250 aralığı; skill `203, 210, 222, 224, 233, 243-249` kodlarını "bilinçli boşluk" olarak listeler)
- §4.8.2 Tam İstisna: 46 kod (301-351, skill'de 351 "SATIS" olarak ayrı)
- §4.8.3 Diğer İşlem Türü: 1 kod (555, M4 ayrı yönetim)
- §4.8.4 ÖTV İstisna: 9 kod (101-108 + 151)
- §4.8.5 Konaklama İstisna: 1 kod (001)
- §4.8.6 Özel Matrah: 12 kod (801-812)
- §4.8.7 İhraç Kayıtlı: 4 kod (701-704)

Sprint 2 sonu `EXEMPTION_DEFINITIONS`: 73 + 22 = **95 kod**. 188 hedefine ulaşmak mümkün değil; v1.42 spesifikasyonu bu kadar kod tanımlıyor.

## Sprint 2'ye Dahil Edilmeyen (Sprint 8 / İleri Araştırma)

### §4.8.4 ÖTV İstisna Kodları (101-108)
9 ÖTV kodu var (`type: 'OTV'` ile eklenebilir); Sprint 2'de sadece 151 (SATIS tipi ÖTV) eklendi. 101-108 için documentType ISTISNA mı SATIS mi belirsiz — skill "İstisna" diyor ama mevcut `ExemptionDefinition` documentType'ı OTV ISTISNA için bir senaryo yok.

**Öneri:** Sprint 8'de documentType'a 'OTV_ISTISNA' eklenip 101-108 eklenmeli. Ya da 'ISTISNA' documentType'ına type:'OTV' ile. Cross-check matrisi (M5, Sprint 5) netleştirecek.

### §4.8.5 Konaklama Vergisi İstisna (001)
`{ code: '001', name: 'Diplomatik İstisna' }` — Konaklama vergisi için. `KONAKLAMAVERGISI` tipinde kullanılır. Mevcut KDV_ZERO_EXEMPTION_EXCLUDED_TYPES içinde `KONAKLAMAVERGISI` var. Sprint 2'de eklenmedi — plan §4.1 scope'u değil.

**Öneri:** Sprint 8 veya Sprint 5 (M5) ile birlikte.

### Skill'de İsim Farkı Olan Mevcut Kodlar (Güncelleme Kapsamı Dışı)
Skill v1.42 ile config mevcut kodlar arasında bazı isim farklılıkları mevcut. Örnekler:

- **219** — Skill: "Hazine, Toplu Konut İdaresi, Belediyeler, İl Özel İdareleri ve Yatırım İzleme ve Koordinasyon Başkanlıklarının İşlemleri"; Config (mevcut): "17/4-p Hazine ve Arsa Ofisi Genel Müdürlüğünün İşlemleri"
- **307** — Skill: "13/c Maden Arama, Altın, Gümüş ve Platin Madenleri için İşletme, Zenginleştirme ve Rafinaj Faaliyetlerine İlişkin Teslim ve Hizmetler [KDVGUT-(II/8-4)]"; Config (mevcut): "13/d Yatırım Teşvik Belgesi Kapsamındaki Makine ve Teçhizat Teslimleri"
- **318** — isim farkı var (Geçici 29 açıklaması)

Bu kodlar mevcut ve çalışır durumda; Sprint 2 scope'u yalnızca **yeni kod ekleme**. Isim güncellemesi semantik değişim olabileceğinden ayrı sprint'e bırakıldı.

**Öneri:** Sprint 8'de tüm exemption isimleri skill v1.42 ile senkronize edilmeli.

## Sprint 2 Tax Config Notu

`tax-config.ts` B-26 kapsamında 5 eksik kod ekleneceği belirtilmişti: **0021, 0022, 4171, 9015, 9944**.

- 4 kod eklendi: 0021 (BMV), 0022 (SMV), 4171 (ÖTV Tevkifat), 9944 (Hal Rüsumu).
- **9015 eklenmedi.** Gerekçe: Skill `kod-listeleri-ubl-tr-v1.42.md` §4.9.1'de 9015 listelenmiyor; schematron `UBL-TR_Codelist.xml` satır 15'te kabul ediliyor ama XSLT örneği dışında hiçbir referansta adı yok. Denetim raporu (`audit/denetim-02-kod-listeleri.md:166`) "9015 — çift eksik — Codelist kabul ediyor, v1.42 ve tax-config etmiyor" notu düşmüş. N1 disiplini ("ya gerçek isim ya TODO") uyarınca gerçek isim bulunamadığı için config'e eklenmedi.

**Öneri:** Sprint 8'de GİB uzmanıyla 9015 ismi netleştirildikten sonra eklenmeli.
