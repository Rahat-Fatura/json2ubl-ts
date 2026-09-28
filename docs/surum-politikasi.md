# Sürüm politikası

Bu belge json2ubl-ts'in nasıl sürümlendiğini, bir sürümün nasıl yayımlandığını ve
para tutarlarının nasıl yuvarlandığını anlatır. 5.1.0 ile yazıya döküldü. Öncesinde
7 ayda 5 büyük sürüm hattı yayımlanmış, npm'deki 34 sürümün 23'ü etiketsiz kalmış ve
CHANGELOG'a npm'de hiç yayımlanmamış 9 sürüm girmişti.

## 1. Semver kuralları

Kütüphanenin asıl çıktısı XML'dir. Bu yüzden "davranış" dendiğinde önce **üretilen
XML** kastedilir.

| Değişiklik | En az | Not |
|---|---|---|
| Aynı girdiden üretilen XML'in değişmesi (tutar, eleman, sıra, kod değeri) | **MINOR** | CHANGELOG'da **"Çıktı değişimi"** başlığı zorunlu. Hangi girdilerin etkilendiği ve ölçümü yazılır. |
| Önceden geçerli bir girdinin artık hata vermesi | **MAJOR** | Aşağıdaki istisnaya bakın. |
| Tip, alan, fonksiyon ya da dışa aktarılan adın kaldırılması veya daraltılması | **MAJOR** | |
| Yeni alan, yeni fonksiyon, yeni belge tipi (mevcut çıktıyı değiştirmeden) | MINOR | |
| XML'i ve API'yi değiştirmeyen düzeltme (doğrulama mesajı, belge, iç yapı) | PATCH | |
| Node alt sınırının yükselmesi | MAJOR | |

**Yasaya ya da GİB kuralına aykırı çıktının düzeltilmesi** çıktıyı değiştirir. Bu
yine en az MINOR'dır ve "Çıktı değişimi" başlığıyla, hangi belgelerin yanlış
üretildiği ölçülerek duyurulur.

### Bilinçli istisna: 5.1.0

5.1.0 genel belge düzeyi iskonto/artırımı kaldırdı. Bu yüzey 5.0.0'da yeni açılmıştı
ve KDV'yi yeniden hesaplamadan matrahı kaydırıyordu (100 TL + %20 KDV + %10 belge
iskontosu → matrah 90,00, KDV 20,00). Önceden kabul edilen bir girdi artık hata verdiği
için kurala göre MAJOR olmalıydı. Bilinçli olarak MINOR yayımlandı, gerekçesi şu:

- Kütüphanenin bilinen tek tüketicisi (MimForge) bu yüzeyi yalnız HKS masraf
  düzleminde kullanıyor. O düzlemin API'si ve çıktısı değişmedi.
- Yüzey yanlış vergi üretiyordu. Onu bir sonraki büyük sürüme kadar açık tutmanın
  bedeli, sürüm kuralını bir kez esnetmenin bedelinden büyüktü.

Bu istisna emsal değildir. Tüketici sayısı arttıkça kaldırma işlemleri MAJOR'a kalır.

## 2. Her yayında zorunlu olanlar

1. **CHANGELOG girdisi** — `## [X.Y.Z] — YYYY-AA-GG`. Başlık yalnız **npm'e
   yayımlanan** sürüm için açılır. Yayımlanmayan ara çalışma bir sonraki
   yayımlanan sürümün girdisinde toplanır. Eski yayımlanmamış girdiler tarihçe
   için silinmedi, başlıklarında **"yayımlanmadı"** yazar.
2. **Git etiketi `vX.Y.Z`** — açıklamalı (annotated) etiket, npm'e giden paketin
   derlendiği commit'te.
3. **GitHub Release** — etiket üzerinden, notlar CHANGELOG girdisinden.

`prepublishOnly` bunların ilk ikisini denetler (`scripts/check-release.mjs`):
çalışma ağacı temiz mi, HEAD'de `v<version>` etiketi var mı, CHANGELOG'da girdi var
mı. Biri tutmazsa `npm publish` durur.

## 3. Yayın kontrol listesi

```bash
# 1. Sürüm ve CHANGELOG
#    package.json "version" + CHANGELOG girdisi ("Çıktı değişimi" gerekiyorsa)

# 2. Testler — xslt-service 127.0.0.1:8081'de AYAKTA olmalı
npm test
npm run test:strict          # doğrulayıcı yoksa KIRMIZI olur (canlı GİB şematronu)

# 3. Derleme ve paket içeriği
npm run build
npm pack --dry-run           # yalnız dist/ + README.md + LICENSE + package.json

# 4. Önceki sürümle karşılaştırma (çıktı değişimi beklenmiyorsa fark 0 olmalı)
#    Aynı girdi seti eski (npm) ve yeni (yerel dist) sürümden geçirilip XML
#    karşılaştırılır. Beklenen fark CHANGELOG'daki "Çıktı değişimi" ile birebir.

# 5. Commit, etiket, push
git push origin main
git tag -a vX.Y.Z -m "X.Y.Z — özet"
git push origin vX.Y.Z

# 6. GitHub Release
gh release create vX.Y.Z --title "X.Y.Z" --notes-file <CHANGELOG girdisi>

# 7. Yayın (prepublishOnly: check-release → test:strict → build)
npm publish
```

## 4. Para tutarları ve yuvarlama

**Hesap tam hassasiyetle yapılır; tutarlar yalnız XML serileştirmesinde 2 haneye
yuvarlanır.** Bu bilinçli bir karardır ve 5.1.0'da değişmedi.

- Hesap motoru (`calculateDocument`, `InvoiceSession.calculation`) JS `number`
  ile çalışır ve ara değerleri yuvarlamaz. Satır tutarları, vergi alt toplamları ve
  belge toplamları yuvarlanmamış değerlerden kurulur.
- Yuvarlama yalnız XML yazılırken yapılır (`formatDecimal` → `toFixed(2)`).
  `decimalCheck` şematron kuralı `LegalMonetaryTotal`'ın beş alanına ve belge
  `TaxTotal/TaxAmount`'a en fazla 2 ondalık şartı koyar.
- **GİB şematronu toplam eşitliğini denetlemez.** "Σ satır = toplam" ya da
  "TaxExclusive + TaxAmount = TaxInclusive" ilişkisi için kural yoktur. Belgenin
  reddedilmesi bu yüzden mümkün değildir.

Bunun sonucu: her değer ayrı yuvarlandığı için XML kendi içinde kuruş düzeyinde
tutmayabilir. Ölçüm (5.1.0, 10.000 rastgele fatura): %72'sinde en az bir toplama
ilişkisi en çok birkaç kuruş tutmuyor. Tüketici muhasebe kaydını XML'in **belge
düzeyi** toplamlarından kurmalı (`PayableAmount`, `TaxExclusiveAmount`, her
`TaxSubtotal`) ve oluşan kuruş farkını ayrı bir satırla denkleştirmelidir. Örnekler
README'de ("Yuvarlama").

## 5. Tüketiciye öneri

Tam sürüme sabitleyin (`"json2ubl-ts": "5.1.0"`, `^` olmadan). Güncellemeyi, aynı
girdi setini eski ve yeni sürümden geçirip XML farkına bakarak yapın. MINOR sürüm
de çıktı değiştirebilir, bu da CHANGELOG'daki "Çıktı değişimi" başlığında yazar.

## 6. Geriye dönük etiketler (5.1.0'da atıldı)

npm'de yayımlanmış ama depoda etiketi olmayan sürümler tarandı. Her sürüm için npm
tarball'ı indirildi (`npm pack json2ubl-ts@X`). Aday commit'ler, `package.json` ve
`README.md` baytları tarball'dakiyle aynı olan commit'lerdir. Her adayın `src/`
ağacı ayrı bir çalışma ağacında `tsup` ile derlendi ve `dist/` dosyaları (`index.js`,
`index.mjs`, `index.d.ts`, `index.d.mts`, kaynak haritaları) tarball'daki ile **bayt
bayt** karşılaştırıldı. Etiket yalnız bayt bayt aynı çıkan commit'e atıldı. Aynı
tarball'ı üreten birden fazla commit varsa yayın anından önceki en son commit seçildi.

| Sürüm | Commit | npm yayını | Not |
|---|---|---|---|
| 1.0.0 | `d690ad87` | 2026-02-15 17:00Z | |
| 1.1.1 | `7e4aff23` | 2026-03-17 07:40Z | |
| 1.4.1 | `8e3fd274` | 2026-03-18 16:37Z | commit yayından 14 dk sonra atılmış; içerik bayt bayt aynı |
| 2.2.2 | `15035412` | 2026-04-28 13:10Z | `a521d71e` de aynı paketi üretiyor (yayından sonra) |
| 4.1.1 | `b3583df4` | 2026-09-04 14:27Z | |
| 4.1.2 | `9f12cc36` | 2026-09-04 14:57Z | |
| 4.1.5 | `74630132` | 2026-09-04 17:27Z | |
| 4.1.6 | `3ed287ab` | 2026-09-04 17:42Z | |
| 4.4.2 | `d34505cb` | 2026-09-07 12:41Z | |
| 4.5.0 | `664247c8` | 2026-09-08 06:09Z | |
| 4.5.1 | `fdb10023` | 2026-09-08 08:17Z | |
| 4.5.2 | `7932e644` | 2026-09-08 11:01Z | |
| 4.5.3 | `b713e61b` | 2026-09-08 11:41Z | |
| 4.6.0 | `f3d6b6dc` | 2026-09-15 15:42Z | |
| 5.0.0 | `e98f8234` | 2026-09-22 08:58Z | `f0349854` de aynı paketi üretiyor |

**Etiketlenmeyenler (8):** Bunlar için yayımlanan paketi bayt bayt üreten bir commit
depoda yok. Yanlış commit'i gösteren bir etiket, hiç etiket olmamasından daha
yanıltıcı olacağı için etiket atılmadı.

| Sürüm | Neden |
|---|---|
| 1.1.0 | Tek aday `ce960387` yayından 44 dk sonra atılmış; derlemesi 25 satır farklı. Paket commit'lenmemiş ağaçtan yayımlanmış. |
| 1.2.0, 1.2.1, 1.2.2, 1.2.3, 1.3.0, 1.4.0 | Depoda `version` alanı bu değerleri taşıyan hiçbir commit yok. |
| 1.4.2 | 46 aday commit var ama hepsi yayından (2026-03-24) bir ay sonra (2026-04-22/23) atılmış. Hiçbirinin derlemesi tarball'la aynı değil (74–3.462 satır fark); 3'ü derlenmiyor. |

Etiketi zaten olan sürümlere (`v2.2.0` … `v4.1.0`) dokunulmadı. `v4.1.0` aynı
yöntemle doğrulandı ve bayt bayt aynı çıktı.

GitHub Release yalnız 5.0.0 için geriye dönük açıldı. Eski sürümlerin release notu
CHANGELOG'da duruyor. Tüketicinin karşılaşacağı en yakın taban 5.0.0 olduğu için
5.1.0 notunun kıyas aldığı sürümün de GitHub'da görünür olması gerekiyordu.
