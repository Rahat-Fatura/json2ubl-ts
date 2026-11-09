/**
 * İstisna/Muafiyet kodu konfigürasyonu — DB Exemption tablosundan embed edilmiştir.
 *
 * Kod kümesi GİB `UBL-TR_Codelist.xml` (paket 24.08.2026) ile birebir aynıdır;
 * `__tests__/calculator/exemption-gib-codelist.test.ts` bunu paketteki XML'den
 * okuyarak denetler.
 *
 * documentType: Bu istisna kodunun hangi fatura tipinde kullanılacağını belirtir.
 * type: Vergi tipi (KDV, ÖTV, konaklama vergisi, SGK)
 */

export interface ExemptionDefinition {
  code: string;
  name: string;
  type: 'KDV' | 'SGK' | 'OTV' | 'KONAKLAMA';
  documentType: 'ISTISNA' | 'SATIS' | 'IHRACKAYITLI' | 'OZELMATRAH' | 'SGK';
  /**
   * `true`: kod GİB kod listesinde var ve kütüphane onu geçerli kabul eder, ama
   * anlamı GİB'in hiçbir belgesinde yayımlanmadı. Kullanıcıya seçenek olarak
   * SUNULMAMALI; seçim listesi kuran uygulama bu bayrağı taşıyan kodu gizler.
   * Bugün yalnız 501. GİB anlamını yayımlayınca bayrak kalkar ve ad güncellenir.
   */
  meaningUnpublished?: boolean;
}

export const EXEMPTION_DEFINITIONS: ReadonlyArray<ExemptionDefinition> = [
  // KDV İstisna kodları
  { code: '201', name: '17/1 Kültür ve Eğitim Amacı Taşıyan İşlemler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '202', name: '17/2-a Sağlık, Çevre ve Sosyal Yardım Amaçlı İşlemler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '204', name: '17/2-c Yabancı Diplomatik Organ ve Hayır Kurumlarının Bağışlarla İlgili Mal ve Hizmet Alışları', type: 'KDV', documentType: 'ISTISNA' },
  { code: '205', name: '17/2-d Taşınmaz Kültür Varlıklarına İlişkin Teslimler ve Mimarlık Hizmetleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '206', name: '17/2-e Mesleki Kuruluşların İşlemleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '207', name: '17/3 Askeri Fabrika, Tersane ve Atölyelerin İşlemleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '208', name: '17/4-c Birleşme, Devir, Dönüşüm ve Bölünme İşlemleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '209', name: '17/4-e Banka ve Sigorta Muameleleri Vergisi Kapsamına Giren İşlemler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '211', name: '17/4-h Zirai Amaçlı Su Teslimleri ile Köy Tüzel Kişiliklerince Yapılan İçme Suyu Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '212', name: '17/4-ı Serbest Bölgelerde Verilen Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '213', name: '17/4-j Boru Hattı ile Yapılan Petrol ve Gaz Taşımacılığı', type: 'KDV', documentType: 'ISTISNA' },
  { code: '214', name: '17/4-k Organize Sanayi Bölgelerindeki Arsa ve İşyeri Teslimleri ile Konut Yapı Kooperatiflerinin Üyelerine Konut Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '215', name: '17/4-l Varlık Yönetim Şirketlerinin İşlemleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '216', name: '17/4-m Tasarruf Mevduatı Sigorta Fonunun İşlemleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '217', name: '17/4-n Basın-Yayın ve Enformasyon Genel Müdürlüğüne Verilen Haber Hizmetleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '218', name: 'KDV 17/4-o — Gümrük Antrepoları, Geçici Depolama Yerleri ile Gümrüklü Sahalarda Vergisiz Satış Yapılan İşyeri/Depo/Ardiye Kiralanması', type: 'KDV', documentType: 'ISTISNA' },
  { code: '219', name: '17/4-p Hazine ve Arsa Ofisi Genel Müdürlüğünün İşlemleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '220', name: '17/4-r İki Tam Yıl Süreyle Sahip Olunan Taşınmaz ve İştirak Hisseleri Satışları', type: 'KDV', documentType: 'ISTISNA' },
  { code: '221', name: 'Geçici 15 Konut Yapı Kooperatifleri, Belediyeler ve Sosyal Güvenlik Kuruluşlarına Verilen İnşaat Taahhüt Hizmeti', type: 'KDV', documentType: 'ISTISNA' },
  { code: '223', name: 'Geçici 20/1 Teknoloji Geliştirme Bölgelerinde Yapılan İşlemler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '225', name: 'Geçici 23 Milli Eğitim Bakanlığına Yapılan Bilgisayar Bağışları ile İlgili Teslimler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '226', name: '17/2-b Özel Okullar, Üniversite ve Yüksekokullar Tarafından Verilen Bedelsiz Eğitim ve Öğretim Hizmetleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '227', name: '17/2-b Kanunların Gösterdiği Gerek Üzerine Bedelsiz Olarak Yapılan Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '228', name: '17/2-b Kanunun (17/1) Maddesinde Sayılan Kurum ve Kuruluşlara Bedelsiz Olarak Yapılan Teslimler', type: 'KDV', documentType: 'ISTISNA' },
  // Metin UBL-TR Kod Listeleri v1.43 (2026-07-27, Sayfa 10) ile birebir eşitlendi:
  // "17/2-b" öneki kaldırıldı, "Darülacezeye" ibaresi eklendi.
  { code: '229', name: 'Gıda Bankacılığı Faaliyetinde Bulunan Darülacezeye, Dernek ve Vakıflara Bağışlanan, Gıda, Temizlik, Giyecek ve Yakacak Maddeleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '230', name: '17/4-g Külçe Altın, Külçe Gümüş ve Kıymetli Taşların Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '231', name: '17/4-g Metal, Plastik, Lastik, Kauçuk, Kağıt, Cam Hurda ve Atıkların Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '232', name: '17/4-g Döviz, Para, Damga Pulu, Değerli Kağıtlar, Hisse Senedi ve Tahvil Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  // v1.43 (2026-07-27) ile Kısmi İstisna listesine eklendi.
  { code: '233', name: '2942 Sayılı Kamulaştırma Kanunu Kapsamında Taşınmazların Kamulaştırmayı Yapan Devlet ve Kamu Tüzel Kişilerine Devri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '234', name: '17/4-ş Konut Finansmanı Amacıyla Teminat Gösterilen ve İpotek Konulan Konutların Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '235', name: '16/1-c Transit ve Gümrük Antrepo Rejimleri ile Geçici Depolama ve Serbest Bölge Hükümlerinin Uygulandığı Malların Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '236', name: '19/2 Uluslararası Anlaşmalar Kapsamındaki İstisnalar (İade Hakkı Tanınmayan)', type: 'KDV', documentType: 'ISTISNA' },
  { code: '237', name: '17/4-t 5300 Sayılı Kanuna Göre Düzenlenen Ürün Senetlerinin İhtisas/Ticaret Borsaları Aracılığıyla İlk Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '238', name: '17/4-u Varlık ve Hakların TMSF ye Teslimi ile Bunların TMSF Tarafından Teslimi, Müzayede Suretiyle Satışı', type: 'KDV', documentType: 'ISTISNA' },
  { code: '239', name: '17/4-y Taşınmazların Sosyal Güvenlik Kurumuna Devir ve Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '240', name: '17/4-z Gıda, Tarım ve Hayvancılık Bakanlığı Tarafından Tescil Edilen Gübreler ve Gübre Üreticilerine Aktarılan Ham Madde Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '241', name: 'TürkAkım Gaz Boru Hattı Projesine İlişkin Anlaşmanın 9/b Maddesinde Yer Alan Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '242', name: 'KDV 17/4-ö — Gümrük Antrepoları, Geçici Depolama Yerleri, Gümrüklü Sahalarda verilen ardiye, depolama ve terminal hizmetleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '250', name: 'Diğerleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '301', name: '11/1-a Mal İhracatı', type: 'KDV', documentType: 'ISTISNA' },
  { code: '302', name: '11/1-a Hizmet İhracatı', type: 'KDV', documentType: 'ISTISNA' },
  { code: '303', name: '11/1-a Roaming Hizmetleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '304', name: '13/a Deniz, Hava ve Demiryolu Taşıma Araçlarının Teslimi ile İnşa, Tadil, Bakım ve Onarımları', type: 'KDV', documentType: 'ISTISNA' },
  { code: '305', name: '13/b Deniz ve Hava Taşıma Araçları İçin Liman ve Hava Meydanlarında Yapılan Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '306', name: '13/c Altın, Gümüş, Platin ile İlgili Arama, İşletme ve Zenginleştirme Faaliyetlerine İlişkin Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '307', name: '13/d Yatırım Teşvik Belgesi Kapsamındaki Makine ve Teçhizat Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '308', name: '13/e Limanlara Bağlantı Sağlayan Demiryolu Hatları, Limanlar ve Hava Meydanlarının İnşası, Yenilenmesi ve Genişletilmesine İlişkin Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '309', name: '14/1 Taşımacılık İstisnası', type: 'KDV', documentType: 'ISTISNA' },
  { code: '310', name: '15/1-a Diplomatik İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '311', name: '15/1-b Uluslararası Kuruluşlara İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '312', name: 'Geçici 26 BM, NATO, OECD Temsilcilikleri İstisnaları', type: 'KDV', documentType: 'ISTISNA' },
  { code: '313', name: '11/1-b Yolcu Beraberi (Bavul Ticareti)', type: 'KDV', documentType: 'ISTISNA' },
  { code: '314', name: '11/1-c Mal ve Hizmetlerin Serbest Bölgedeki Müşterilere Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '315', name: '13/f Ulusal Güvenlik Amaçlı Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '316', name: '17/4-o Gümrük Antrepoları, Geçici Depolama Yerleri, Gümrüklü Sahalar ve Vergisiz Satış Yapılan Mağazalar', type: 'KDV', documentType: 'ISTISNA' },
  { code: '317', name: 'Geçici 20/3 Teknoloji Geliştirme Bölgelerinde Yapılan Teslimler (KDV Kanunu Geçici 20/3)', type: 'KDV', documentType: 'ISTISNA' },
  { code: '318', name: '19/2 Uluslararası Anlaşmalar Kapsamındaki İstisnalar (İade Hakkı Tanınan)', type: 'KDV', documentType: 'ISTISNA' },
  { code: '319', name: '17/4-r Bankalara, Finansal Kiralama ve Finansman Şirketlerine Borçlu Olanların Taşınmaz ve İştirak Hisselerinin Devir Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '320', name: 'Geçici 29 3996 Sayılı Kanuna Göre Yap-İşlet-Devret veya 3359 ve 6428 Sayılı Kanunlara Göre Kiralama Karşılığı Yaptırılan Projelerde KDV İstisnası', type: 'KDV', documentType: 'ISTISNA' },
  { code: '321', name: 'Geçici 26 BM, NATO, OECD Temsilcilikleri ve Bağlı Kuruluşları İstisnaları', type: 'KDV', documentType: 'ISTISNA' },
  { code: '322', name: '11/1-a Türkiye\'de İkamet Etmeyenlere Özel Fatura ile Yapılan Teslimler (Bavul Ticareti)', type: 'KDV', documentType: 'ISTISNA' },
  { code: '323', name: '13/ğ 5300 Sayılı Kanuna Göre Düzenlenen Ürün Senetlerinin İhtisas/Ticaret Borsaları Aracılığıyla İlk Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '324', name: '13/h Türkiye Kızılay Derneğine Yapılan Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '325', name: '13/ı Yem Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '326', name: '13/ı Gıda, Tarım ve Hayvancılık Bakanlığı Tarafından Tescil Edilmiş Gübrelerin Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '327', name: '13/ı Gıda, Tarım ve Hayvancılık Bakanlığı Tarafından Tescil Edilmiş Gübrelerin İçeriğinde Bulunan Hammaddelerin Gübre Üreticilerine Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '328', name: '13/i Konut veya İşyeri Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '329', name: 'FATİH Projesi Kapsamında MEB\'e Yapılacak Mal Teslimi ve Hizmet İfası', type: 'KDV', documentType: 'ISTISNA' },
  { code: '330', name: 'KDV 13/j — Organize Sanayi Bölgeleri ile Küçük Sanayi Sitelerinin İnşasına İlişkin Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '331', name: 'KDV 13/m — Ar-Ge, Yenilik ve Tasarım Faaliyetlerinde Kullanılmak Üzere Yapılan Yeni Makina ve Teçhizat Teslimlerinde İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '332', name: 'KDV Geçici 39 — İmalat Sanayiinde Kullanılmak Üzere Yapılan Yeni Makina ve Teçhizat Teslimlerinde İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '333', name: 'KDV 13/k — Genel ve Özel Bütçeli Kamu İdareleri, İl Özel İdareleri, Belediyeler ve Köylere Bağışlanan Tesislerin İnşasına İlişkin İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '334', name: 'KDV 13/l — Yabancılara Verilen Sağlık Hizmetlerinde İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '335', name: 'KDV 13/n — Basılı Kitap ve Süreli Yayınların Teslimleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '336', name: 'Geçici 46 — UEFA Müsabakaları Kapsamında Yapılacak Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '337', name: 'Türk Akım Gaz Boru Hattı Projesine İlişkin Anlaşmanın 9/h Maddesi Kapsamındaki Gaz Taşıma Hizmetleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '338', name: 'İmalatçıların Mal İhracatları', type: 'KDV', documentType: 'ISTISNA' },
  { code: '339', name: 'İmalat Sanayii ile Turizme Yönelik Yatırım Teşvik Belgesi Kapsamındaki İnşaat İşlerine İlişkin Teslim ve Hizmetler', type: 'KDV', documentType: 'ISTISNA' },
  { code: '340', name: 'Elektrik Motorlu Taşıt Araçlarının Geliştirilmesine Yönelik Mühendislik Hizmetleri', type: 'KDV', documentType: 'ISTISNA' },
  { code: '341', name: 'Afetzedelere Bağışlanacak Konutların İnşasına İlişkin İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '342', name: 'Genel Bütçeli Kamu İdarelerine Bağışlanacak Taşınmazların İnşasına İlişkin İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '343', name: 'Genel Bütçeli Kamu İdarelerine Bağışlanacak Konutların Yabancı Devlet Kurum ve Kuruluşlarına Teslimine İlişkin İstisna', type: 'KDV', documentType: 'ISTISNA' },
  { code: '344', name: '13/o Milli Savunma ve İç Güvenlik İhtiyaçlarında Kullanılmak Üzere Taşıt Teslimi', type: 'KDV', documentType: 'ISTISNA' },
  { code: '350', name: 'KDV İstisna Diğer', type: 'KDV', documentType: 'ISTISNA' },

  // ÖTV istisna kodları (Kod Listeleri v1.43 §4.8.4). GİB bunları
  // `$istisnaTaxExemptionReasonCodeType` listesine koyar: şematron
  // (`TaxExemptionReasonCodeCheck`) yalnız ISTISNA, IADE, IHRACKAYITLI, SGK,
  // YTBISTISNA ve YTBIADE tiplerinde kabul eder → documentType 'ISTISNA'.
  { code: '101', name: 'İhracat İstisnası', type: 'OTV', documentType: 'ISTISNA' },
  { code: '102', name: 'Diplomatik İstisna', type: 'OTV', documentType: 'ISTISNA' },
  { code: '103', name: 'Askeri Amaçlı İstisna', type: 'OTV', documentType: 'ISTISNA' },
  { code: '104', name: 'Petrol Arama Faaliyetlerinde Bulunanlara Yapılan Teslimler', type: 'OTV', documentType: 'ISTISNA' },
  { code: '105', name: 'Uluslararası Anlaşmadan Doğan İstisna', type: 'OTV', documentType: 'ISTISNA' },
  { code: '106', name: 'Diğer İstisnalar', type: 'OTV', documentType: 'ISTISNA' },
  { code: '107', name: '7/a Maddesi Kapsamında Yapılan Teslimler', type: 'OTV', documentType: 'ISTISNA' },
  { code: '108', name: 'Geçici 5. Madde Kapsamında Yapılan Teslimler', type: 'OTV', documentType: 'ISTISNA' },

  // Konaklama vergisi istisnası (§4.8.5). Kod listesinin skill özetindeki §6
  // tablosu onu KONAKLAMAVERGISI tipiyle eşler (metinden türetilmiş, TODO
  // işaretli), ama şematron 001'i de `$istisnaTaxExemptionReasonCodeType`a
  // koyar ve belge vergi özetinde KONAKLAMAVERGISI tipinde reddeder (Common
  // `TaxExemptionReasonCodeCheck`). Kütüphane şematronu izler → 'ISTISNA'.
  { code: '001', name: 'Diplomatik İstisna', type: 'KONAKLAMA', documentType: 'ISTISNA' },

  // 501: GİB `UBL-TR_Codelist.xml` listelerinde var (genel ve istisna listesi),
  // anlamı (vergi türü dahil) Kod Listeleri v1.43'te ve başka hiçbir GİB
  // belgesinde tanımlı değil. Geçerli kod; kullanıcıya seçenek olarak
  // sunulmamalı (`meaningUnpublished`). Kütüphane onu öbür kodlar gibi KDV alt
  // toplamına yazar.
  { code: '501', name: 'Anlamı GİB Tarafından Yayımlanmamış İstisna Kodu', type: 'KDV', documentType: 'ISTISNA', meaningUnpublished: true },

  // KDV Satış — istisna olmayan diğer
  { code: '351', name: 'KDV İstisna Olmayan Diğer', type: 'KDV', documentType: 'SATIS' },
  { code: '555', name: 'KDV Oran Kontrolüne Tabi Olmayan Satışlar', type: 'KDV', documentType: 'SATIS' },

  // ÖTV Satış — istisna olmayan diğer (§4.8.4)
  { code: '151', name: 'ÖTV — İstisna Olmayan Diğer', type: 'OTV', documentType: 'SATIS' },

  // İhraç kayıtlı kodlar
  { code: '701', name: '3065 s. KDV Kanununun 11/1-c md. Kapsamındaki İhraç Kayıtlı Satış', type: 'KDV', documentType: 'IHRACKAYITLI' },
  { code: '702', name: 'DİİB ve Geçici Kabul Rejimi Kapsamındaki Satışlar', type: 'KDV', documentType: 'IHRACKAYITLI' },
  { code: '703', name: '4760 s. ÖTV Kanununun 8/2 Md. Kapsamındaki İhraç Kayıtlı Satış', type: 'KDV', documentType: 'IHRACKAYITLI' },
  { code: '704', name: '3065 sayılı KDV Kanununun 11/1-c maddesi ve 4760 sayılı ÖTV Kanununun 8/2 md. Kapsamındaki İhraç Kayıtlı Satış', type: 'KDV', documentType: 'IHRACKAYITLI' },

  // Özel matrah kodları
  { code: '801', name: 'Milli Piyango, Spor Toto vb. Devletçe Organize Edilen Organizasyonlar', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '802', name: 'At Yarışları ve Diğer Müşterek Bahis ve Talih Oyunları', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '803', name: 'Profesyonel Sanatçıların Yer Aldığı Gösteriler, Konserler, Sportif Faaliyetler', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '804', name: 'Gümrük Depolarında ve Müzayede Salonlarında Yapılan Satışlar', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '805', name: 'Altından Mamül veya Altın İçeren Ziynet Eşyaları ile Sikke Altınların Teslim ve İthali', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '806', name: 'Tütün Mamülleri ve Bazı Alkollü İçkiler', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '807', name: 'Gazete, Dergi vb. Periyodik Yayınlar', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '808', name: 'Külçe Gümüş ve Gümüşten Mamül Eşya Teslimleri', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '809', name: 'Belediyeler Tarafından Yapılan Şehiriçi Yolcu Taşımacılığında Kullanılan Biletlerin ve Kartların Bayiler Tarafından Satışı', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '810', name: 'Telefon Kartı ve Jeton Satışları', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '811', name: 'ŞOF Tarafından Araç Plakaları ile Sürücü Kurslarında Kullanılan Bir Kısım Evrakın Basımı', type: 'KDV', documentType: 'OZELMATRAH' },
  { code: '812', name: 'KDV Uygulanmadan Alınan 2. El Motorlu Kara Taşıtı veya Taşınmaz Teslimi', type: 'KDV', documentType: 'OZELMATRAH' },

  // SGK kodları
  { code: 'SAGLIK_ECZ', name: 'Eczane', type: 'SGK', documentType: 'SGK' },
  { code: 'SAGLIK_HAS', name: 'Hastane', type: 'SGK', documentType: 'SGK' },
  { code: 'SAGLIK_OPT', name: 'Optik', type: 'SGK', documentType: 'SGK' },
  { code: 'SAGLIK_MED', name: 'Medikal', type: 'SGK', documentType: 'SGK' },
  { code: 'ABONELIK', name: 'Abonelik', type: 'SGK', documentType: 'SGK' },
  { code: 'MAL_HIZMET', name: 'Mal/Hizmet', type: 'SGK', documentType: 'SGK' },
  { code: 'DIGER', name: 'Diğer', type: 'SGK', documentType: 'SGK' },
] as const;

/** İstisna kodu → ExemptionDefinition hızlı lookup map */
export const EXEMPTION_MAP: ReadonlyMap<string, ExemptionDefinition> = new Map(
  EXEMPTION_DEFINITIONS.map(e => [e.code, e]),
);

/** Belge tipine göre istisna kodlarını filtreler */
export function getExemptionsByDocumentType(documentType: string): ExemptionDefinition[] {
  return EXEMPTION_DEFINITIONS.filter(e => e.documentType === documentType);
}

/** İstisna kodunun geçerli olup olmadığını kontrol eder */
export function isValidExemptionCode(code: string): boolean {
  return EXEMPTION_MAP.has(code);
}

/** İstisna tanımını getirir */
export function getExemptionDefinition(code: string): ExemptionDefinition | undefined {
  return EXEMPTION_MAP.get(code);
}

/**
 * İstisna kodu türü → kodun yazılabileceği vergi alt toplamları (TaxTypeCode).
 *
 * GİB pratiği: ÖTV istisnasında "fatura tipi İSTİSNA seçilip ÖTV 0 geçilir ve
 * ilgili ÖTV istisna kodu seçilir" (forum, bug 28107/26888). Kod Listeleri
 * §4.8.4 ÖTV kodlarını, §4.8.5 konaklama vergisi kodunu ayrı listeler; şematron
 * vergi türünü denetlemez, kütüphane denetler.
 * SGK türü (`SAGLIK_ECZ` …) bir vergi istisna kodu değildir, burada yoktur.
 */
const EXEMPTION_TYPE_TAX_CODES: Readonly<Record<'KDV' | 'OTV' | 'KONAKLAMA', ReadonlySet<string>>> = {
  KDV: new Set(['0015']),
  OTV: new Set(['0071', '0073', '0074', '0075', '0076', '0077']),
  KONAKLAMA: new Set(['0059']),
};

/**
 * Bir verginin alt toplamına hangi türden istisna kodu yazılır: '0015' → 'KDV',
 * ÖTV kodları (0071, 0073–0077) → 'OTV', '0059' → 'KONAKLAMA'. İstisna kodu
 * yazılamayan vergide `undefined`. Seçim listesi için:
 * `getAvailableExemptions(tip, getExemptionTypeForTax(vergiKodu))`.
 */
export function getExemptionTypeForTax(taxCode: string): 'KDV' | 'OTV' | 'KONAKLAMA' | undefined {
  for (const type of ['KDV', 'OTV', 'KONAKLAMA'] as const) {
    if (EXEMPTION_TYPE_TAX_CODES[type].has(taxCode)) return type;
  }
  return undefined;
}

/**
 * 5.2.0'da KDV alt toplamında (`kdvExemptionCode`) kabul edilen ÖTV kodu.
 * Geriye uyum için KDV'de kabul edilmeye devam eder; seçicide KDV listesinde
 * sunulmaz (`type: 'OTV'`). Doğru yeri ÖTV %0 alt toplamıdır.
 */
export const LEGACY_KDV_SUBTOTAL_EXEMPTION_CODES: ReadonlySet<string> = new Set(['151']);

/**
 * İstisna kodu bu vergi alt toplamına yazılabilir mi? Kodun türü verginin
 * türüyle aynı olmalı (`getExemptionTypeForTax`). SGK türü yalnız KDV alt
 * toplamında (SGK faturası, 5.2.0 davranışı); 151 KDV alt toplamında da (geriye
 * uyum).
 */
export function isExemptionAllowedOnTax(def: ExemptionDefinition, taxCode: string): boolean {
  const taxType = getExemptionTypeForTax(taxCode);
  if (taxType === undefined) return false;
  if (def.type === taxType) return true;
  if (taxType === 'KDV') return def.type === 'SGK' || LEGACY_KDV_SUBTOTAL_EXEMPTION_CODES.has(def.code);
  return false;
}
