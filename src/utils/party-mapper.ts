/**
 * `SimplePartyInput` → `PartyInput` eşlemesi — BELGE TİPİNDEN BAĞIMSIZ.
 *
 * Her `Simple*` katmanı taraf verisini AYNI sözleşmeyle alır (`taxNumber` +
 * `name` + adres alanları) ve UBL'in beklediği `PartyInput`'a çevirir. Bu çevrim
 * fatura, irsaliye ve gelecek belge tiplerinde AYNI olmak ZORUNDA: içinde
 * taşıdığı iki ders tip başına kopyalanırsa tip başına yeniden kaybedilir.
 *
 * ── DERS 1: POSTA KODU UYDURULMAZ ───────────────────────────────────────────
 * Eskiden bilinmeyen posta kodu `'00000'` ile dolduruluyordu. `00000` geçerli bir
 * Türk posta kodu DEĞİLDİR; belgeye GERÇEK OLMAYAN veri yazılıyordu ve VUK 227/3
 * belgedeki bilginin gerçeği yansıtmasını arar. `cbc:PostalZone` UBL'de seçimlidir
 * (`AddressType`, minOccurs=0) ve serializer `cbcOptionalTag` kullanır —
 * bilinmiyorsa eleman HİÇ YAZILMAZ, sıfırlarla değil.
 *
 * ── DERS 2: VKN → `name`, TCKN → `firstName`/`familyName` ───────────────────
 * `party-serializer` gerçek kişide `cac:Person` düğümü açar ve GİB XSD'si o
 * düğümde `FirstName`/`FamilyName` arar. Tek kelimelik adda soyad `'.'` yazılır:
 * boş bırakmak «"Person" elementinin içeriği eksik» reddine yol açar.
 *
 * ⚠️ Vergi/kimlik ayrımının KENDİSİ burada değil `tax-id.ts`tedir (uzunluk değil
 * içerik kapısı — 4.5.5 dersi). Bu dosya o kararın SONUCUNU şekle döker.
 */
import type { SimplePartyInput } from '../calculator/simple-types';
import type { PartyInput } from '../types/common';
import type { TaxIdType } from '../types/enums';
import { resolveTaxIdType } from './tax-id';

/** Tam addan ayrıştırılmış gerçek kişi ad/soyad ikilisi. */
export interface PersonNameParts {
  firstName: string;
  familyName: string;
}

/**
 * Tam adı `cbc:FirstName` + `cbc:FamilyName` ikilisine böler.
 *
 * Son kelime soyad, kalanı addır. TEK KELİMELİK adda soyad `'.'` olur — GİB
 * XSD'sinde `FamilyName` zorunludur ve boş bırakmak belgeyi reddettirir.
 */
export function splitPersonName(fullName: string): PersonNameParts {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    return {
      firstName: parts.slice(0, parts.length - 1).join(' '),
      familyName: parts[parts.length - 1],
    };
  }
  return { firstName: fullName, familyName: '.' };
}

/**
 * Basit taraf girdisini UBL `PartyInput`'a çevirir.
 *
 * Çağıran belge tipi HİÇBİR ŞEY eklemez: gönderici/alıcı/alıcı-müşteri hepsi
 * aynı çevrimden geçer. Tipe özel taraflar (irsaliyedeki `CarrierParty` gibi
 * DAR arayüzler) bu fonksiyonun sonucundan türetilir, kendi kopyasını yazmaz.
 */
export function mapSimpleParty(party: SimplePartyInput): PartyInput {
  const taxIdType: TaxIdType = resolveTaxIdType(party.taxNumber);
  const result: PartyInput = {
    vknTckn: party.taxNumber,
    taxIdType,
    streetName: party.address,
    citySubdivisionName: party.district,
    cityName: party.city,
    // 🔴 Bkz. dosya başı DERS 1 — posta kodu uydurulmaz.
    postalZone: party.zipCode,
    country: party.country ?? 'Türkiye',
    taxOffice: party.taxOffice,
    telephone: party.phone,
    email: party.email,
    websiteUri: party.website,
  };

  // 🔴 Bkz. dosya başı DERS 2 — VKN → name, TCKN → firstName/familyName.
  if (taxIdType === 'VKN') {
    result.name = party.name;
  } else {
    const { firstName, familyName } = splitPersonName(party.name);
    result.firstName = firstName;
    result.familyName = familyName;
  }

  // Ek tanımlayıcılar
  if (party.identifications?.length) {
    result.additionalIdentifiers = party.identifications.map(id => ({
      schemeId: id.schemeId,
      value: id.value,
    }));
  }

  return result;
}
