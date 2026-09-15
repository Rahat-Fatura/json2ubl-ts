/**
 * Vergi/kimlik numarası çıkarımı — BELGE TİPİNDEN BAĞIMSIZ.
 *
 * Her `Simple*` katmanı geliştiriciden tek bir `taxNumber` alır ve VKN/TCKN ayrımını
 * KENDİ çıkarır (sözleşme: "geliştirici temel veriyi verir, SDK gerisini yapar").
 * Bu çıkarım fatura, irsaliye ve gelecek belge tiplerinde AYNI olmak ZORUNDA —
 * tip başına kopyalanırsa aşağıdaki hata tip başına yeniden doğar.
 */
import { TCKN_REGEX } from '../config/constants';
import type { TaxIdType } from '../types/enums';

/**
 * Vergi/kimlik numarasından `taxIdType` çıkarımı — **UZUNLUK DEĞİL, İÇERİK**.
 *
 * 🔴 CANLI KUSUR (4.5.5'te düzeltildi): kural `taxNumber.length === 11 → TCKN` idi ve
 * YABANCI vergi numaralarını gerçek kişi sanıyordu. Alman KDV numarası `"DE123456789"`
 * TAM 11 KARAKTERDİR → `TCKN` etiketleniyor → `party-serializer` gerçek kişi varsayıp
 * `cac:Person` düğümü açıyor → düğümün içi boş kaldığı için GİB XSD'si
 * «"Person" elementinin içeriği eksik. Zorunlu element(ler): FirstName.» diyerek
 * belgeyi REDDEDİYORDU.
 *
 * TCKN TANIM GEREĞİ 11 HANE RAKAMDIR. Harf içeren 11 karakterlik bir numara TCKN
 * olamaz. Yurt içi gerçek kişi (11 hane rakam) ve 10 haneli VKN ETKİLENMEZ.
 *
 * ⚠️ Bu yalnız İÇERİK kapısıdır. Yabancı bir vergi numarası TAM 11 HANE RAKAM da
 * olabilir (örn. İtalyan "partita IVA" 11 hanedir), dolayısıyla tek başına YETMEZ —
 * BAĞLAM kapısı (alıcının yurt dışı olduğunun belgeden bilinmesi) çağıranın işidir.
 * Fatura tarafında bu `buildBuyerCustomer`'dadır.
 */
export function resolveTaxIdType(taxNumber: string | undefined | null): TaxIdType {
  return TCKN_REGEX.test(String(taxNumber ?? '').trim()) ? 'TCKN' : 'VKN';
}
