/**
 * TYPE_ALIASES sızıntı testi — ALIAS'I TANIMLAYAN kaynak.
 *
 * Üretecin alias tablosu hedefe yerel olmalı. Bu dosya `LeakProbeAlias`'ı
 * TANIMLAR; kardeş `alias-consumer.ts` aynı adı yalnızca import eder.
 * Bu dosya hiçbir zaman import edilmez, yalnızca üreteç tarafından metin
 * olarak okunur.
 */

export type LeakProbeAlias = 'DONOR_ALIAS_A' | 'DONOR_ALIAS_B';

export interface LeakDonorInput {
  /** Alias'ı kendi dosyasında tanımlı olan alan */
  probe: LeakProbeAlias;
  /** Kontrol alanı */
  donorOwnField: string;
}
